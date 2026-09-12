"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[聊天图片能力接入——1) 挂载上传路由 /api/upload；2) 把 UPLOAD_DIR 以静态目录形式
          挂到 /uploads，使前端能按相对路径直接访问已上传的图片（目录不存在时自动创建）]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[接入 AI 托管状态——1) 建表纳入 Setting（全局托管总开关）；
          2) 启动时调用 ensure_schema() 幂等补齐 conversations.ai_managed 列；
          3) 挂载托管开关路由 /api/ai-custody]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[1. 建表纳入 Conversation / Message，为聊天记录持久化提供存储；2. 挂载新增的会话查询路由 /api/conversations]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[/api/health 增加 llm_configured / model 字段，便于快速判断 AI 是否处于可生成状态]

FastAPI 主应用入口
- 全局 CORS（允许一切来源）
- 路由挂载：/api/auth, /api/chat, /api/conversations, /api/ai-custody, /api/kb, /api/upload, /ws
- 静态目录：/uploads（聊天图片，由 /api/upload 写入）
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base, ensure_schema
from models import User, Conversation, Message, Setting
from memory import MemoryManager
from chat_images import ensure_upload_root

# 建表（User / Conversation / Message / Setting）
Base.metadata.create_all(
    bind=engine,
    tables=[User.__table__, Conversation.__table__, Message.__table__, Setting.__table__],
)

# 结构升级：为老库补齐后加字段（如 conversations.ai_managed），幂等
ensure_schema()

# 启动时自动初始化 10 个测试种子用户（如未初始化）
try:
    from scripts.seed import seed
    seed()
except Exception as e:
    print(f"[Warning] Auto seed users skipped or failed: {e}")

app = FastAPI(title="AI 客服 MVP - Backend", version="1.0.0")

# 配置全局 CORS，允许一切来源跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载聊天图片静态目录：图片由 /api/upload 写入 UPLOAD_DIR，
# 前端拿到的相对路径（/uploads/chat/YYYY-MM/xxx.jpg）经此对外提供访问。
# ensure_upload_root() 会在目录不存在时先创建，避免首次启动挂载失败。
app.mount("/uploads", StaticFiles(directory=ensure_upload_root()), name="uploads")

# 挂载 API 路由
from routers import auth as auth_router
from routers import system as system_router
from routers import chat as chat_router
from routers import conversation as conversation_router
from routers import custody as custody_router
from routers import kb as kb_router
from routers import upload as upload_router
from routers import ws as ws_router

app.include_router(auth_router.router, prefix="/api/auth", tags=["认证"])
app.include_router(system_router.router, prefix="/api", tags=["系统"])
app.include_router(chat_router.router, prefix="/api", tags=["聊天"])
app.include_router(conversation_router.router, prefix="/api", tags=["会话"])
app.include_router(custody_router.router, prefix="/api", tags=["AI 托管"])
app.include_router(kb_router.router, prefix="/api", tags=["知识库"])
app.include_router(upload_router.router, prefix="/api", tags=["上传"])
app.include_router(ws_router.router, tags=["WebSocket"])


@app.get("/")
def root():
    return {"message": "AI 客服 MVP Backend is running", "docs": "/docs"}


@app.get("/api/health")
def health():
    """
    健康检查
    - llm_configured: 是否已配置大模型 API Key（false 时 AI 无法生成回答）
    - model: 当前使用的主力模型名
    """
    from ai_engine import is_llm_configured, OPENAI_MODEL
    return {
        "status": "ok",
        "llm_configured": is_llm_configured(),
        "model": OPENAI_MODEL,
    }
