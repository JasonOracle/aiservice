"""
聊天路由：/api/chat
- C端用户提问，返回 AI 回复（含 RAG + Mem0）
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import get_current_user
from rag import RAGEngine
from ai_engine import stream_ai_response
from memory import MemoryManager

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: str = ""


class ChatSource(BaseModel):
    filename: str
    relevance: float


class ChatResponse(BaseModel):
    reply: str
    sources: list[ChatSource]


def _generate_reply_sync(user_id: int, query: str, traits: str = "") -> str:
    """同步收集流式 AI 回复"""

    async def collect():
        chunks = []
        async for chunk in stream_ai_response(user_id=user_id, user_query=query, user_traits=traits):
            chunks.append(chunk)
        return "".join(chunks)

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(collect())
        loop.close()
        return result
    except Exception:
        return "抱歉，AI 服务暂时不可用，请稍后再试或转接人工客服。"


@router.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    聊天接口
    - 需要 Bearer Token 鉴权
    - 参数: message (用户输入)
    - 返回: reply (AI 回复), sources (RAG 来源)
    """
    # 冷启动：首次聊天时初始化 Mem0
    memories = MemoryManager.get_memories(current_user.id)
    if not memories and current_user.traits:
        MemoryManager.init_memory(current_user.id, current_user.traits)

    reply = _generate_reply_sync(current_user.id, req.message, current_user.traits or "")

    # 实时广播至 B 端坐席控制台
    try:
        from routers.ws import manager
        loop = asyncio.get_event_loop() if asyncio.get_event_loop().is_running() else None
        # 用户提问与 AI 回答广播
        broadcast_user = {
            "type": "chat_stream",
            "user_id": str(current_user.id),
            "user_name": current_user.name or f"用户{current_user.phone[-4:]}",
            "user_phone": current_user.phone,
            "role": "user",
            "content": req.message,
        }
        broadcast_ai = {
            "type": "chat_stream",
            "user_id": str(current_user.id),
            "user_name": current_user.name or f"用户{current_user.phone[-4:]}",
            "user_phone": current_user.phone,
            "role": "assistant",
            "content": reply,
        }
        asyncio.run(manager.broadcast_to_agents(broadcast_user))
        asyncio.run(manager.broadcast_to_agents(broadcast_ai))
    except Exception as e:
        print(f"[Warning] Broadcast to agent failed: {e}")

    rag_results = RAGEngine.search(req.message, top_k=3)
    sources = [
        ChatSource(filename=r["filename"], relevance=round(r["relevance"], 2))
        for r in rag_results
    ]

    return ChatResponse(reply=reply, sources=sources)
