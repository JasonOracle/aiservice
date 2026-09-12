"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[add_message 支持 images 参数——把一条消息附带的图片地址列表序列化为 JSON 落库；
          纯图片消息（无正文）在会话摘要里记为「[图片]」，避免坐席列表出现空白条目；
          顺带把正文兜底为 ""，使「空文字 + 有图」的消息也能正常入库]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增 AI 托管状态读写——全局开关存 settings 表（get/set_global_ai_managed），
          会话级覆盖存 conversations.ai_managed（set_session_ai_managed，None 表示跟随全局）；
          新增 is_ai_managed() 作为唯一的仲裁入口（会话级优先，其次全局）；
          并让 mark_handoff() 在标记待接入的同时自动关闭该会话的 AI 托管]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增文件——会话与消息持久化读写层，集中承载「会话 upsert / 消息追加 / 会话摘要维护」三类操作，
          供 HTTP /api/chat、WS /ws/c/{user_id}、WS /ws/agent（人工坐席回复）三处复用]

会话与消息持久化读写层

设计约定：
- 会话 ID 采用可读复合键 `{user_id}::{session_key}`，前端本地会话 id 即 session_key
  （`store` 表示店铺总客服，`product:{productId}` 表示某商品的咨询会话），
  后端据此推算，前后端无需协商额外 ID。
- 所有函数均为「永不抛出」的容错设计：持久化失败只打印警告，
  绝不打断聊天主链路（AI 回复与 WebSocket 广播优先级更高）。
"""
import json
import time
from typing import Optional

from sqlalchemy.orm import Session

from models import Conversation, Message

# 会话 ID 的分隔符，前后端共同约定
CONV_ID_SEP = "::"
# 店铺总客服会话的 session_key
STORE_SESSION_KEY = "store"


def make_conv_id(user_id: int | str, session_key: str) -> str:
    """由用户 ID 与客户端会话标识推算后端会话 ID，如 `1::product:keyboard-k8pro`"""
    return f"{user_id}{CONV_ID_SEP}{session_key or STORE_SESSION_KEY}"


def parse_conv_id(conv_id: str) -> tuple[str, str]:
    """
    拆解后端会话 ID → (user_id, session_key)
    - 格式非法时返回 ("", "")，调用方据此判断是否需要忽略该消息
    """
    if not conv_id or CONV_ID_SEP not in conv_id:
        return "", ""
    uid, _, key = conv_id.partition(CONV_ID_SEP)
    return uid, key


def ensure_conversation(
    db: Session,
    user_id: int | str,
    session_key: str,
    product_id: Optional[str] = None,
    product_name: Optional[str] = None,
    store_name: Optional[str] = None,
) -> Optional[Conversation]:
    """
    UPSERT 会话：不存在则创建，存在则补全缺失的商品/店铺元信息。

    参数:
    - db: SQLAlchemy 会话
    - user_id: 客户 ID
    - session_key: 客户端会话标识（`store` / `product:{productId}`）
    - product_id / product_name / store_name: 商品与店铺上下文（店铺总客服会话可省略）
    返回:
    - Conversation 对象；失败时返回 None（不抛出）
    """
    try:
        key = session_key or STORE_SESSION_KEY
        cid = make_conv_id(user_id, key)
        conv = db.query(Conversation).filter(Conversation.id == cid).first()
        if conv is None:
            conv = Conversation(
                id=cid,
                user_id=int(user_id),
                session_key=key,
                product_id=product_id,
                product_name=product_name,
                store_name=store_name,
                last_active_at=0,
            )
            db.add(conv)
        else:
            # 首次进来可能没带上下文，后续带上时补齐（不覆盖已有值）
            if product_id and not conv.product_id:
                conv.product_id = product_id
            if product_name and not conv.product_name:
                conv.product_name = product_name
            if store_name and not conv.store_name:
                conv.store_name = store_name
        db.commit()
        return conv
    except Exception as e:
        db.rollback()
        print(f"[Warning] 会话 upsert 失败: {type(e).__name__}: {e}")
        return None


def add_message(
    db: Session,
    conversation_id: str,
    role: str,
    content: str,
    at: Optional[int] = None,
    images: Optional[list] = None,
) -> bool:
    """
    追加一条消息，并同步维护所属会话的「最后消息 / 最后活跃时间」摘要。

    参数:
    - conversation_id: 后端会话 ID（`{user_id}::{session_key}`）
    - role: user / assistant / agent / system
    - content: 消息正文（纯图片消息可为空串）
    - at: 毫秒时间戳，缺省取当前时间
    - images: 图片地址列表（相对路径，如 `/uploads/chat/2026-09/xxx.jpg`）；
              为空表示纯文字消息，落库为 NULL
    返回:
    - 是否写入成功（异常时返回 False，不抛出）
    """
    try:
        ts = int(at) if at else int(time.time() * 1000)
        img_list = [str(u) for u in (images or []) if u]
        db.add(
            Message(
                conversation_id=conversation_id,
                role=role,
                content=content or "",
                images=json.dumps(img_list, ensure_ascii=False) if img_list else None,
                created_at=ts,
            )
        )
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv is not None:
            # 会话摘要：纯图片消息没有正文，用「[图片]」占位，
            # 否则坐席台左侧列表的这一条会显示为空白，看起来像没收到消息
            if content:
                conv.last_message = content
            elif img_list:
                conv.last_message = "[图片]"
            conv.last_role = role
            if ts >= (conv.last_active_at or 0):
                conv.last_active_at = ts
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"[Warning] 消息落库失败: {type(e).__name__}: {e}")
        return False


def mark_handoff(db: Session, conversation_id: str, reason: str, at: Optional[int] = None) -> bool:
    """
    标记会话为「待接入」——客户主动要求人工，或 AI 兜底提示转人工时调用。
    持久化后 B 端刷新页面仍可看到待接入红标。

    同时**自动关闭该会话的 AI 托管**：既然已转人工，AI 就不应再抢答。
    这一动作落库持久化，因此 B 端刷新、后端重启后依然保持「人工接待中」。

    返回: 是否写入成功（异常时返回 False，不抛出）
    """
    try:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv is None:
            return False
        conv.handoff_reason = reason
        conv.handoff_at = int(at) if at else int(time.time() * 1000)
        conv.ai_managed = False
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"[Warning] 标记待接入失败: {type(e).__name__}: {e}")
        return False


def clear_handoff(db: Session, conversation_id: str) -> bool:
    """
    清除会话的「待接入」标记——人工坐席回复后调用，表示已接手。

    返回: 是否写入成功（异常时返回 False，不抛出）
    """
    try:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv is None or conv.handoff_reason is None:
            return False
        conv.handoff_reason = None
        conv.handoff_at = None
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"[Warning] 清除待接入标记失败: {type(e).__name__}: {e}")
        return False


# ---------------------------------------------------------------------------
# AI 托管状态（全局 + 会话级两层）
#
# 仲裁规则：**会话级设置优先，未设置时跟随全局开关**。
# 关闭托管后，客户消息仍会落库并推送到坐席台，但 AI 不再生成回复。
# ---------------------------------------------------------------------------

# 全局 AI 托管开关在 settings 表中的键名
GLOBAL_AI_KEY = "ai_managed_global"


def _to_bool(raw: Optional[str], default: bool = True) -> bool:
    """把数据库里存的字符串转成布尔值"""
    if raw is None:
        return default
    return str(raw).strip().lower() in ("1", "true", "yes", "on")


def get_global_ai_managed(db: Session) -> bool:
    """
    读取全局 AI 托管总开关（缺省为开启）
    - 读取失败时返回 True —— 宁可让 AI 正常工作，也不要因存储异常而全站静默
    """
    try:
        from models import Setting

        row = db.query(Setting).filter(Setting.key == GLOBAL_AI_KEY).first()
        return _to_bool(row.value if row else None, default=True)
    except Exception as e:
        print(f"[Warning] 读取全局托管状态失败: {type(e).__name__}: {e}")
        return True


def set_global_ai_managed(db: Session, enabled: bool) -> bool:
    """
    写入全局 AI 托管总开关

    返回: 是否写入成功（异常时返回 False，不抛出）
    """
    try:
        from models import Setting

        row = db.query(Setting).filter(Setting.key == GLOBAL_AI_KEY).first()
        value = "true" if enabled else "false"
        if row is None:
            db.add(Setting(key=GLOBAL_AI_KEY, value=value))
        else:
            row.value = value
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"[Warning] 写入全局托管状态失败: {type(e).__name__}: {e}")
        return False


def set_session_ai_managed(db: Session, conversation_id: str, enabled: Optional[bool]) -> bool:
    """
    写入某个会话的 AI 托管覆盖

    参数:
    - enabled: True / False 为显式设置；**None 表示清除覆盖、重新跟随全局开关**
    返回:
    - 是否写入成功；会话不存在时返回 False（不抛出）
    """
    try:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv is None:
            return False
        conv.ai_managed = enabled
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"[Warning] 写入会话托管状态失败: {type(e).__name__}: {e}")
        return False


def list_session_ai_overrides(db: Session) -> dict[str, bool]:
    """
    列出所有「显式设置过」的会话级托管状态 → { conversation_id: bool }

    未出现在此字典中的会话，表示跟随全局开关。
    """
    try:
        rows = db.query(Conversation).filter(Conversation.ai_managed.isnot(None)).all()
        return {c.id: bool(c.ai_managed) for c in rows}
    except Exception as e:
        print(f"[Warning] 读取会话托管列表失败: {type(e).__name__}: {e}")
        return {}


def is_ai_managed(db: Session, conversation_id: str) -> bool:
    """
    **AI 托管仲裁的唯一入口**：判断某会话此刻是否应由 AI 自动应答。

    规则：会话级设置优先；会话未单独设置（或不存在）时跟随全局开关。
    """
    try:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv is not None and conv.ai_managed is not None:
            return bool(conv.ai_managed)
    except Exception as e:
        print(f"[Warning] 判定会话托管状态失败: {type(e).__name__}: {e}")
    return get_global_ai_managed(db)
