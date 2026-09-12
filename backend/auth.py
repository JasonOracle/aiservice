"""
JWT 认证核心模块
- create_access_token: 生成 JWT
- get_current_user: FastAPI 依赖注入，从 Bearer Token 解析当前用户（强制鉴权）
- get_current_user_optional: 可选鉴权版本（无 Token / Token 无效时返回 None，不抛异常）
- hash_password / verify_password: 使用 bcrypt 直接处理密码

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增可选鉴权依赖 get_current_user_optional ——
          图片上传接口 /api/upload 需要在「C 端（有 JWT）」与「B 端坐席台（无登录态，
          仅有 ADMIN_PASS 口令、且不持有 JWT）」两种调用方下都能工作：
          C 端带 Token 时照常识别用户；B 端不带 Token 时放行，
          与既有的 /api/conversations、/api/ai-custody 等坐席台接口保持一致的无鉴权现状。
          ⚠️ 这是演示期的权宜设计，上线前须为坐席台补登录体系后收紧（见 docs/progress.md 遗留项）]
"""
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import os
from dotenv import load_dotenv
from database import get_db
from models import User

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "aiservice-mvp-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

bearer_scheme = HTTPBearer()
# auto_error=False：未携带 Authorization 头时不抛 403，交由依赖函数自行决定是否放行
bearer_scheme_optional = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """对明文密码进行 bcrypt 哈希，返回字符串形式的哈希值"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """验证明文密码是否与 bcrypt 哈希匹配"""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    可选鉴权：带合法 Token 时返回对应用户，未带或无效时返回 None（**不抛异常**）

    用途：同一接口需同时服务「有登录态的 C 端」与「无登录态的 B 端坐席台」时使用。
    典型场景是图片上传 /api/upload —— 坐席台用口令登录、不持有 JWT，
    若强制鉴权会导致坐席发图恒定 401（已实测复现）。
    """
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        # Token 过期 / 伪造 / 用户已删等都按「匿名」处理，由调用方决定是否放行
        return None
