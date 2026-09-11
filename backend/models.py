"""
SQLAlchemy 数据模型
- User: 核心用户表，包含手机号、密码哈希、用户特征（Mem0 冷启动用）
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(11), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    # 用户特征描述，用于 Mem0 冷启动
    traits = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
