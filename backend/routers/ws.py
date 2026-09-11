"""
WebSocket 路由
- /ws/agent: B端坐席监听，接收 C端对话流广播
- /ws/c/{user_id}: C端聊天 WebSocket（流式）
"""
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


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
    """B端坐席 WebSocket - 监听 C端对话流"""
    await manager.connect_agent(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "agent_message":
                user_id = msg.get("user_id")
                if user_id:
                    await manager.send_to_user(int(user_id), {
                        "type": "agent_reply",
                        "content": msg.get("content", ""),
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
                # 广播给 B端坐席
                await manager.broadcast_to_agents({
                    "type": "chat_stream",
                    "user_id": str(user_id),
                    "content": query,
                })
                # 触发 AI 回复
                from routers.chat import _generate_reply_sync
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor() as pool:
                    reply = pool.submit(_generate_reply_sync, user_id, query).result()

                await websocket.send_text(json.dumps({
                    "type": "ai_reply",
                    "content": reply,
                }, ensure_ascii=False))
    except WebSocketDisconnect:
        await manager.disconnect_user(websocket, user_id)
