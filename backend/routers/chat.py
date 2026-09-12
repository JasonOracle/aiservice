"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[聊天链路贯通图片——1) ChatRequest 新增 images（图片相对路径列表），message 允许为空
          （支持「纯图片」消息）；2) 图片落库并随 chat_stream 广播给坐席台；
          3) 纯图片消息以商品名作为 RAG 检索线索，避免空 query 导致必然兜底转人工；
          4) AI 回复由 stream_ai_response 携带 image_urls 生成，使模型真正看到图片]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[接入 AI 托管仲裁——发送前先判定「本会话是否应由 AI 自动应答」（会话级开关优先，其次全局开关）：
          托管关闭时不再生成 AI 回复，仅落库并广播客户消息给坐席台，响应 ai_managed=false 由 C 端提示已转人工；
          命中人工接入时（mark_handoff 内已关闭该会话托管）额外广播 ai_custody 状态变更，
          使坐席台与 C 端实时同步「人工接待中」]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[会话上下文贯通与聊天记录落库——ChatRequest 新增 session_id / product_id / product_name / store_name，
          据此推算后端会话 ID（客户 × 店铺 × 商品）；用户提问与 AI 回复写入 messages 表；
          广播 chat_stream / handoff_request 时补充 conversation_id 与商品店铺信息，使 B 端坐席台能按会话归集并区分店铺；
          命中人工接入时同步持久化待接入状态，刷新后红标不丢]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增「请求人工接入」广播——在原有用户提问/AI 回复广播之后，若命中 handoff 判定（用户主动要人工，或 AI 兜底提示转人工），追加广播一条 handoff_request 供 B 端坐席台告警；顺带移除无用的 loop 变量]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[AI 回复统一去除首尾空白，避免前端消息气泡出现多余空行]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[补充异常日志——原先 except 静默吞掉所有异常，导致 AI 生成失败时无法从服务端日志定位]

聊天路由：/api/chat
- C端用户提问，返回 AI 回复（含 RAG + Mem0）
- 同步把「客户提问 + AI 回复」落库，并广播至 B 端坐席台
- 先做 AI 托管仲裁：托管关闭时只把客户消息推给坐席台，不生成 AI 回复
"""
import asyncio
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import get_current_user
from rag import RAGEngine
from ai_engine import stream_ai_response
from memory import MemoryManager
from handoff import detect_handoff
from chat_images import MAX_IMAGES_PER_MESSAGE
from conversation_store import (
    STORE_SESSION_KEY,
    add_message,
    ensure_conversation,
    is_ai_managed,
    make_conv_id,
    mark_handoff,
)
from routers.custody import custody_event

router = APIRouter()


class ChatRequest(BaseModel):
    """
    会话上下文（C 端发送时携带，用于把消息归入正确的「客户 × 店铺 × 商品」会话）

    - message: 文字提问；**允许为空串**（纯图片消息），但不能与 images 同时为空
    - images:  图片相对路径列表（由 /api/upload 返回），
               形如 ["/uploads/chat/2026-09/xxx.jpg"]，单条最多 MAX_IMAGES_PER_MESSAGE 张
    - session_id: 客户端会话标识，`store`（店铺总客服）或 `product:{productId}`
    - product_id / product_name / store_name: 商品与店铺信息，供 B 端坐席列表展示
    """

    message: str = ""
    images: List[str] = []
    session_id: str = ""
    product_id: str = ""
    product_name: str = ""
    store_name: str = ""


class ChatSource(BaseModel):
    filename: str
    relevance: float


class ChatResponse(BaseModel):
    reply: str
    sources: list[ChatSource]
    # 本次消息归属的后端会话 ID，C 端可据此校验投递目标
    conversation_id: str = ""
    # 本次是否由 AI 自动应答；false 表示该会话已转人工，C 端应提示「客服稍后回复」
    ai_managed: bool = True


def _generate_reply_sync(
    user_id: int,
    query: str,
    traits: str = "",
    images: Optional[List[str]] = None,
) -> str:
    """
    同步收集流式 AI 回复

    参数:
    - images: 图片相对路径列表；非空时 AI 会以图文数组形式真正「看到」图片
    """

    async def collect():
        chunks = []
        async for chunk in stream_ai_response(
            user_id=user_id,
            user_query=query,
            user_traits=traits,
            image_urls=images,
        ):
            chunks.append(chunk)
        # 去除模型输出首尾多余空白，避免前端气泡出现空行
        return "".join(chunks).strip()

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(collect())
        loop.close()
        return result
    except Exception as e:
        print(f"[Error] 生成回复失败 {type(e).__name__}: {e}")
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
    - 参数: message (文字提问，可为空) + images (图片相对路径列表，可为空) + 会话上下文
    - 返回: reply (AI 回复), sources (RAG 来源), conversation_id (会话 ID), ai_managed (是否由 AI 应答)

    副作用：
    - 写入 messages 表（客户提问含图片；AI 托管开启时还包括 AI 回复），并刷新会话摘要
    - 广播至 B 端坐席台（chat_stream / 必要时 handoff_request），图片随消息一并下发

    ★ 同时支持「文字+图片」与「纯图片」两种消息：
      二者皆空视为无效请求；纯图片时以商品名作为 RAG 检索线索。
    """
    # 文字归一化：纯图片消息允许 message 为空串
    text = (req.message or "").strip()
    images = [u for u in (req.images or []) if u]

    if not text and not images:
        raise HTTPException(status_code=400, detail="消息不能为空")
    if len(images) > MAX_IMAGES_PER_MESSAGE:
        raise HTTPException(
            status_code=400,
            detail=f"单条消息最多 {MAX_IMAGES_PER_MESSAGE} 张图片",
        )

    # 冷启动：首次聊天时初始化 Mem0
    memories = MemoryManager.get_memories(current_user.id)
    if not memories and current_user.traits:
        MemoryManager.init_memory(current_user.id, current_user.traits)

    # 会话标识：客户 × 店铺 × 商品，先确保会话记录存在（补全商品/店铺元信息）
    session_key = req.session_id or STORE_SESSION_KEY
    conv_id = make_conv_id(current_user.id, session_key)
    ensure_conversation(
        db,
        current_user.id,
        session_key,
        product_id=req.product_id or None,
        product_name=req.product_name or None,
        store_name=req.store_name or None,
    )

    # 客户提问落库（时间戳取请求到达时刻），图片地址以 JSON 数组一并持久化
    asked_at = int(time.time() * 1000)
    add_message(db, conv_id, "user", text, asked_at, images=images)

    # ★ AI 托管仲裁：会话级开关优先，未设置时跟随全局。
    #   关闭时不再生成 AI 回复——客户消息只推送给坐席台，由人工接待。
    ai_on = is_ai_managed(db, conv_id)

    # 模型与 RAG 使用的检索文本：纯图片消息没有文字，用商品名兜底。
    # 否则空 query 检索必然为空 → 命中「未检索到知识库」高压线 → 被误判成无答案而强行转人工，
    # 但用户其实只是想问问「这张图」而已。
    rag_query = text or (req.product_name or "")

    reply = ""
    replied_at = asked_at
    if ai_on:
        reply = _generate_reply_sync(
            current_user.id,
            rag_query,
            current_user.traits or "",
            images,
        )
        replied_at = int(time.time() * 1000)
        add_message(db, conv_id, "assistant", reply, replied_at)

    # 实时广播至 B 端坐席控制台
    try:
        from routers.ws import manager

        user_name = current_user.name or f"用户{current_user.phone[-4:]}"
        # 会话上下文与托管状态一并广播，B 端据此归集到「店铺 · 客户」条目
        base = {
            "user_id": str(current_user.id),
            "user_name": user_name,
            "user_phone": current_user.phone,
            "conversation_id": conv_id,
            "session_key": session_key,
            "product_name": req.product_name,
            "store_name": req.store_name,
            "ai_managed": ai_on,
        }

        # ① 用户提问（图片随消息一并下发，坐席台据此渲染缩略图）
        asyncio.run(manager.broadcast_to_agents({
            **base, "type": "chat_stream", "role": "user", "content": text,
            "images": images, "at": asked_at,
        }))

        if ai_on:
            # ② AI 回复
            asyncio.run(manager.broadcast_to_agents({
                **base, "type": "chat_stream", "role": "assistant", "content": reply, "at": replied_at,
            }))

            # ③ 请求人工接入（用户主动要求 / AI 兜底转人工，两者都算一次）
            need_handoff, reason = detect_handoff(req.message, reply)
            if need_handoff:
                handoff_at = int(time.time() * 1000)
                # 标记待接入 + 自动关闭该会话 AI 托管（mark_handoff 内持久化）
                mark_handoff(db, conv_id, reason, handoff_at)
                asyncio.run(manager.broadcast_to_agents({
                    **base,
                    "type": "handoff_request",
                    # 纯图片消息没有文字，用「[图片]」占位，避免坐席告警里「原话」一片空白
                    "content": text or "[图片]",
                    "images": images,
                    "reason": reason,
                    "at": handoff_at,
                }))
                # 同步托管状态变更：坐席台与 C 端都要知道「已转人工」
                custody_ev = custody_event(conv_id, False, "session", reason="handoff")
                asyncio.run(manager.broadcast_to_agents(custody_ev))
                asyncio.run(manager.send_to_user(current_user.id, custody_ev))
                print(f"[Handoff] 用户 {user_name}({current_user.id}) 请求人工接入，原因：{reason}｜会话 {conv_id}")
        else:
            print(f"[Custody] 会话 {conv_id} 已转人工，本次不生成 AI 回复（客户消息已推送坐席台）")
    except Exception as e:
        print(f"[Warning] Broadcast to agent failed: {e}")

    # RAG 溯源仅在 AI 应答时有意义
    if ai_on:
        rag_results = RAGEngine.search(req.message, top_k=3)
        sources = [
            ChatSource(filename=r["filename"], relevance=round(r["relevance"], 2))
            for r in rag_results
        ]
    else:
        sources = []

    return ChatResponse(reply=reply, sources=sources, conversation_id=conv_id, ai_managed=ai_on)
