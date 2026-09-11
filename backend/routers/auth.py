"""
认证路由：/api/auth/login
- 接收手机号 + 密码，验证后返回 JWT Token
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import create_access_token, verify_password

router = APIRouter()


class LoginRequest(BaseModel):
    phone: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    登录接口
    - 参数: phone (手机号), password (明文密码)
    - 返回: JWT access_token, 用户基本信息
    - 密码验证使用 bcrypt 哈希比对
    """
    user = db.query(User).filter(User.phone == req.phone).first()
    if not user:
        raise HTTPException(status_code=401, detail="手机号或密码错误")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="手机号或密码错误")
    token = create_access_token({"sub": str(user.id), "phone": user.phone})
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        name=user.name or "用户",
    )
