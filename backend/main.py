"""
FastAPI 主应用入口
- 全局 CORS（允许一切来源）
- 路由挂载：/api/auth, /api/chat, /api/kb, /ws
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from models import User
from memory import MemoryManager

# 建表
Base.metadata.create_all(bind=engine, tables=[User.__table__])

app = FastAPI(title="AI 客服 MVP - Backend", version="1.0.0")

# 配置全局 CORS，允许一切来源跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载 API 路由
from routers import auth as auth_router
from routers import system as system_router
from routers import chat as chat_router
from routers import kb as kb_router
from routers import ws as ws_router

app.include_router(auth_router.router, prefix="/api/auth", tags=["认证"])
app.include_router(system_router.router, prefix="/api", tags=["系统"])
app.include_router(chat_router.router, prefix="/api", tags=["聊天"])
app.include_router(kb_router.router, prefix="/api", tags=["知识库"])
app.include_router(ws_router.router, tags=["WebSocket"])


@app.get("/")
def root():
    return {"message": "AI 客服 MVP Backend is running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
