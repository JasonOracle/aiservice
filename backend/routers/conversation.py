"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[历史消息返回新增 images 字段（图片相对路径列表）——
          使 C 端换设备同步、B 端刷新回看历史时，图片消息同样能完整还原]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[会话列表补充 ai_managed 字段（会话级 AI 托管覆盖），
          使坐席台左侧列表能一眼看出哪些会话已转人工接待，无需逐个点开查看]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增文件——会话查询路由：/api/conversations 返回会话列表（B 端坐席台左侧列表数据源），
          /api/conversations/{id}/messages 返回某会话完整历史消息，
          两者共同替代 B 端原先把聊天记录放在浏览器内存里的做法，使刷新与重启后历史可回看]

会话查询路由：/api/conversations
- GET /api/conversations                     会话列表（B 端坐席台左侧列表）
- GET /api/conversations/{conversation_id}/messages   某会话完整历史消息
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


@router.get("/conversations")
def list_conversations(
    user_id: Optional[int] = Query(default=None, description="按客户 ID 过滤，缺省返回全部"),
    limit: int = Query(default=200, ge=1, le=1000, description="最多返回条数"),
):
    """
    会话列表（按最后活跃时间倒序）

    每条会话 = 某客户 × 某店铺 × 某商品的一路咨询，因此同一客户可能出现在多条记录中。
    返回字段已包含 B 端列表展示所需的全部信息（客户名、手机号、店铺名、商品名、最后一条消息、
    待接入原因），B 端无需再逐条查询。
    """
    from database import SessionLocal
    from models import Conversation, User

    db = SessionLocal()
    try:
        query = db.query(Conversation)
        if user_id is not None:
            query = query.filter(Conversation.user_id == user_id)
        convs = (
            query.order_by(Conversation.last_active_at.desc(), Conversation.created_at.desc())
            .limit(limit)
            .all()
        )

        # 批量取客户信息，避免 N+1 查询
        uids = {c.user_id for c in convs}
        users = {}
        if uids:
            users = {u.id: u for u in db.query(User).filter(User.id.in_(uids)).all()}

        result = []
        for c in convs:
            u = users.get(c.user_id)
            result.append(
                {
                    "id": c.id,
                    "user_id": c.user_id,
                    "user_name": (u.name or f"用户{u.phone[-4:]}") if u else f"用户{c.user_id}",
                    "user_phone": u.phone if u else "",
                    "session_key": c.session_key,
                    "product_id": c.product_id,
                    "product_name": c.product_name,
                    "store_name": c.store_name,
                    "last_message": c.last_message or "",
                    "last_role": c.last_role or "",
                    "last_active_at": c.last_active_at or 0,
                    "handoff_reason": c.handoff_reason,
                    "handoff_at": c.handoff_at,
                    # 会话级 AI 托管覆盖：true/false 为显式设置，null 表示跟随全局开关
                    "ai_managed": c.ai_managed,
                }
            )
        return result
    finally:
        db.close()


@router.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: str,
    limit: int = Query(default=500, ge=1, le=2000, description="最多返回条数"),
):
    """
    某会话的完整历史消息（按时间正序）

    - 会话不存在时返回 404，B 端据此清理本地残留条目
    - 消息 role: user（客户）/ assistant（AI）/ agent（人工坐席）/ system（系统提示）
    """
    from database import SessionLocal
    from models import Conversation, Message

    db = SessionLocal()
    try:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv is None:
            raise HTTPException(status_code=404, detail="conversation not found")

        from chat_images import parse_images

        msgs = (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc(), Message.id.asc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                # 图片相对路径列表（无图片时为空数组）；前端按各自的 API 域名拼接后访问
                "images": parse_images(m.images),
                "created_at": m.created_at,
            }
            for m in msgs
        ]
    finally:
        db.close()
