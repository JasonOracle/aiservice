"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[WS 通道贯通图片——1) /ws/c/{user_id} 的 chat 分支接收 images（图片相对路径列表），
          落库并随 chat_stream 广播给坐席台，生成回复时传给 AI 使模型真正看到图片；
          2) /ws/agent 的 agent_message 支持人工坐席发图，落库为 agent 角色并转发 C 端]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[WS 通道接入 AI 托管仲裁——/ws/c/{user_id} 的 chat 分支在生成回复前判定托管状态：
          托管关闭时不再调用模型，仅落库并广播客户消息给坐席台，回包 ai_managed=false；
          命中人工接入时额外广播 ai_custody 事件，使坐席台与 C 端同步「人工接待中」；
          人工坐席回复（agent_message）时显式保持该会话托管为关闭状态，避免重新被 AI 抢答]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[WS 通道会话贯通与落库——1) /ws/c/{user_id} 的 chat 分支接收会话上下文
          （session_id / product_id / product_name / store_name），落库客户提问与 AI 回复，
          广播时携带 conversation_id；2) /ws/agent 的人工坐席回复落库为 agent 角色、
          清除该会话的待接入标记，并在转发 C 端时带上 conversation_id，
          使 C 端能精确投递到对应会话（原先只能投给「当前正在查看的会话」）]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[WS 通道同步接入「请求人工接入」广播——与 /api/chat 行为对齐，新增 handoff_request 推送]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[修复 C 端 WebSocket 通道的消息广播缺口——原先仅广播用户提问，AI 回复不会推送至 B 端坐席，且广播体缺少 role/user_name/user_phone 字段；现已与 HTTP /api/chat 的广播行为对齐]

WebSocket 路由
- /ws/agent: B端坐席监听，接收 C端对话流广播
- /ws/c/{user_id}: C端聊天 WebSocket（流式）
"""
import json
import time
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from handoff import detect_handoff
from conversation_store import (
    STORE_SESSION_KEY,
    add_message,
    clear_handoff,
    ensure_conversation,
    is_ai_managed,
    make_conv_id,
    mark_handoff,
    set_session_ai_managed,
)
from routers.custody import custody_event

router = APIRouter()


def _with_db(fn):
    """
    在独立 Session 中执行一次持久化操作。

    WS 场景没有 FastAPI 的依赖注入，需要自行开关会话；
    统一在此兜底异常——持久化失败不得影响聊天与广播主链路。
    """
    from database import SessionLocal

    db = SessionLocal()
    try:
        return fn(db)
    except Exception as e:
        print(f"[Warning] WS 持久化失败: {type(e).__name__}: {e}")
        return None
    finally:
        db.close()


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.agent_connections: list[WebSocket] = []
        self.user_connections: dict[int, list[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect_agent(self, ws: WebSocket):
        await ws.accept()
        async with self.lock:
            self.agent_connections.append(ws)

    async def disconnect_agent(self, ws: WebSocket):
        async with self.lock:
            if ws in self.agent_connections:
                self.agent_connections.remove(ws)

    async def connect_user(self, ws: WebSocket, user_id: int):
        await ws.accept()
        async with self.lock:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(ws)

    async def disconnect_user(self, ws: WebSocket, user_id: int):
        async with self.lock:
            if user_id in self.user_connections:
                if ws in self.user_connections[user_id]:
                    self.user_connections[user_id].remove(ws)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]

    async def broadcast_to_agents(self, message: dict):
        data = json.dumps(message, ensure_ascii=False)
        async with self.lock:
            dead = []
            for ws in self.agent_connections:
                try:
                    await ws.send_text(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.agent_connections.remove(ws)

    async def send_to_user(self, user_id: int, message: dict):
        data = json.dumps(message, ensure_ascii=False)
        async with self.lock:
            if user_id in self.user_connections:
                dead = []
                for ws in self.user_connections[user_id]:
                    try:
                        await ws.send_text(data)
                    except Exception:
                        dead.append(ws)
                for ws in dead:
                    self.user_connections[user_id].remove(ws)

    @property
    def agent_count(self) -> int:
        return len(self.agent_connections)

    @property
    def user_count(self) -> int:
        return sum(len(v) for v in self.user_connections.values())


manager = ConnectionManager()


@router.websocket("/ws/agent")
async def ws_agent(websocket: WebSocket):
    """
    B端坐席 WebSocket - 监听 C端对话流

    接收人工坐席回复（agent_message），负责：
    1. 落库为 agent 角色的消息；
    2. 清除该会话的「待接入」标记（视为已接手）；
    3. 转发给对应 C 端用户，并携带 conversation_id 供其精确投递。
    """
    await manager.connect_agent(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "agent_message":
                user_id = msg.get("user_id")
                if not user_id:
                    continue
                content = msg.get("content", "")
                # 人工坐席同样可以发图（图片相对路径列表，由 /api/upload 返回）
                images = [u for u in (msg.get("images") or []) if u]
                conversation_id = msg.get("conversation_id") or ""
                sent_at = int(time.time() * 1000)

                # 纯图片消息允许 content 为空；两者皆空则视为无效消息，直接忽略
                if not (content or "").strip() and not images:
                    continue

                # 落库 + 清除待接入（有会话 ID 时才做，兼容未携带的旧客户端）
                if conversation_id:
                    def _persist(db, cid=conversation_id, text=content, at=sent_at, imgs=images):
                        add_message(db, cid, "agent", text, at, images=imgs)
                        clear_handoff(db, cid)
                        # 人工既已接手，保持该会话 AI 托管关闭，避免 AI 重新抢答
                        set_session_ai_managed(db, cid, False)

                    _with_db(_persist)

                await manager.send_to_user(int(user_id), {
                    "type": "agent_reply",
                    "content": content,
                    "images": images,
                    "conversation_id": conversation_id,
                    "at": sent_at,
                })
    except WebSocketDisconnect:
        await manager.disconnect_agent(websocket)


@router.websocket("/ws/c/{user_id}")
async def ws_c_user(websocket: WebSocket, user_id: int):
    """C端用户 WebSocket - 发送消息并接收 AI 回复"""
    await manager.connect_user(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "chat":
                query = msg.get("message", "")
                # 图片相对路径列表（C 端经 /api/upload 上传后拿到）；支持「纯图片」消息
                images = [u for u in (msg.get("images") or []) if u]
                # 会话上下文（客户 × 店铺 × 商品）
                session_key = msg.get("session_id") or STORE_SESSION_KEY
                product_id = msg.get("product_id") or ""
                product_name = msg.get("product_name") or ""
                store_name = msg.get("store_name") or ""
                conv_id = make_conv_id(user_id, session_key)

                # 取用户信息，供 B 端坐席列表展示
                user_name, user_phone = f"用户{user_id}", ""
                try:
                    from database import SessionLocal
                    from models import User
                    _db = SessionLocal()
                    _u = _db.query(User).filter(User.id == user_id).first()
                    if _u:
                        user_name = _u.name or f"用户{_u.phone[-4:]}"
                        user_phone = _u.phone
                    _db.close()
                except Exception as e:
                    print(f"[Warning] 查询用户信息失败: {e}")

                # 确保会话记录存在并落库客户提问（图片地址以 JSON 数组一并持久化）
                asked_at = int(time.time() * 1000)

                def _persist_user(db):
                    ensure_conversation(
                        db,
                        user_id,
                        session_key,
                        product_id=product_id or None,
                        product_name=product_name or None,
                        store_name=store_name or None,
                    )
                    add_message(db, conv_id, "user", query, asked_at, images=images)

                _with_db(_persist_user)

                # ★ AI 托管仲裁：会话级开关优先，未设置时跟随全局
                #   WS 场景无依赖注入，自行开一个 Session 读取
                ai_on = True

                def _read_custody(db):
                    return is_ai_managed(db, conv_id)

                _res = _with_db(_read_custody)
                if _res is not None:
                    ai_on = bool(_res)

                # 广播体统一附带会话上下文，B 端据此归集到「店铺 · 客户」条目
                base = {
                    "user_id": str(user_id),
                    "user_name": user_name,
                    "user_phone": user_phone,
                    "conversation_id": conv_id,
                    "session_key": session_key,
                    "product_name": product_name,
                    "store_name": store_name,
                    "ai_managed": ai_on,
                }

                # 广播用户提问给 B端坐席（无论托管与否，客户消息都要让坐席看见）
                # 图片随消息一并下发，坐席台据此渲染缩略图
                await manager.broadcast_to_agents({
                    **base, "type": "chat_stream", "role": "user",
                    "content": query, "images": images, "at": asked_at,
                })

                reply = ""
                if ai_on:
                    # 触发 AI 回复（同步逻辑放线程池，避免阻塞事件循环）
                    from routers.chat import _generate_reply_sync
                    import concurrent.futures

                    # 三个位置参数：query（文字，纯图片时为空串）、traits、images
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        reply = pool.submit(
                            _generate_reply_sync, user_id, query, "", images
                        ).result()

                    replied_at = int(time.time() * 1000)
                    _with_db(lambda db: add_message(db, conv_id, "assistant", reply, replied_at))

                    # 广播 AI 回复给 B端坐席（与 /api/chat 行为保持一致）
                    await manager.broadcast_to_agents({
                        **base, "type": "chat_stream", "role": "assistant",
                        "content": reply, "at": replied_at,
                    })

                    # 请求人工接入（用户主动要求 / AI 兜底转人工，两者都算一次）
                    need_handoff, reason = detect_handoff(query, reply)
                    if need_handoff:
                        handoff_at = int(time.time() * 1000)
                        # 标记待接入 + 自动关闭该会话 AI 托管（mark_handoff 内持久化）
                        _with_db(lambda db: mark_handoff(db, conv_id, reason, handoff_at))
                        await manager.broadcast_to_agents({
                            **base,
                            "type": "handoff_request",
                            # 纯图片消息没有文字，用「[图片]」占位，避免告警里「原话」空白
                            "content": query or "[图片]",
                            "images": images,
                            "reason": reason,
                            "at": handoff_at,
                        })
                        # 同步托管状态变更：坐席台与 C 端都要知道「已转人工」
                        await manager.broadcast_to_agents(
                            custody_event(conv_id, False, "session", reason="handoff")
                        )
                        print(f"[Handoff] 用户 {user_name}({user_id}) 请求人工接入，原因：{reason}｜会话 {conv_id}")
                else:
                    print(f"[Custody] 会话 {conv_id} 已转人工，本次不生成 AI 回复（客户消息已推送坐席台）")

                await websocket.send_text(json.dumps({
                    "type": "ai_reply",
                    "content": reply,
                    "conversation_id": conv_id,
                    "ai_managed": ai_on,
                }, ensure_ascii=False))
    except WebSocketDisconnect:
        await manager.disconnect_user(websocket, user_id)
