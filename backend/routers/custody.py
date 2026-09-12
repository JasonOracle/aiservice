"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增文件——AI 托管状态路由 /api/ai-custody：
          GET 读取全局与各会话的托管开关，PUT 设置全局或某个会话的开关；
          PUT 后会向坐席台与对应客户广播 ai_custody 事件，
          使多个坐席浏览器、以及 C 端「人工接待中」提示能实时同步]

AI 托管状态路由：/api/ai-custody
- GET /api/ai-custody  读取托管状态 { global: bool, sessions: {conv_id: bool} }
- PUT /api/ai-custody  设置托管开关（conversation_id 留空即设置全局）

设计说明：
- 托管状态**持久化在后端**（全局存 settings 表、会话级存 conversations.ai_managed），
  因此 B 端刷新、后端重启后开关状态不丢；
- 真正决定「AI 是否应答」的判定发生在 /api/chat 与 /ws/c 的 chat 分支（见 conversation_store.is_ai_managed）；
  本路由只负责读写与广播，保持职责单一。
"""
import asyncio
import time
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class CustodyUpdate(BaseModel):
    """托管开关设置请求"""

    enabled: bool
    """要设置的会话 ID；留空表示设置「全局总开关」"""
    conversation_id: str = ""


def custody_event(
    conversation_id: str,
    enabled: bool,
    scope: str,
    reason: str = "manual",
) -> dict:
    """
    构造托管状态变更广播体（transport 由调用方自行决定：REST 用 asyncio.run，WS 直接 await）

    参数:
    - conversation_id: 会话级变更时的会话 ID；全局变更时为空串
    - enabled: 变更后的托管状态
    - scope: `global`（全局总开关）/ `session`（会话级覆盖）
    - reason: 变更来源，`manual`（坐席手动切换）/ `handoff`（命中人工接入自动关闭）
    """
    return {
        "type": "ai_custody",
        "scope": scope,
        "conversation_id": conversation_id,
        "enabled": enabled,
        "reason": reason,
        "at": int(time.time() * 1000),
    }


@router.get("/ai-custody")
def read_custody():
    """
    读取 AI 托管状态

    返回:
    - global: 全局 AI 托管总开关
    - sessions: 显式设置过托管状态的会话 → { conversation_id: bool }
      （未出现在此字典中的会话表示「跟随全局」）
    """
    from database import SessionLocal
    from conversation_store import get_global_ai_managed, list_session_ai_overrides

    db = SessionLocal()
    try:
        return {
            "global": get_global_ai_managed(db),
            "sessions": list_session_ai_overrides(db),
        }
    finally:
        db.close()


@router.put("/ai-custody")
def update_custody(req: CustodyUpdate):
    """
    设置 AI 托管开关

    - 携带 conversation_id → 设置该会话的专属开关（优先级高于全局）
    - 不携带 → 设置全局总开关

    副作用：向坐席台广播 `ai_custody` 事件（多坐席同步）；
    若为会话级变更，同时推送给该会话所属客户，使 C 端能展示「人工接待中」。
    """
    from database import SessionLocal
    from conversation_store import (
        get_global_ai_managed,
        list_session_ai_overrides,
        parse_conv_id,
        set_global_ai_managed,
        set_session_ai_managed,
    )

    db = SessionLocal()
    try:
        if req.conversation_id:
            ok = set_session_ai_managed(db, req.conversation_id, req.enabled)
            scope = "session"
        else:
            ok = set_global_ai_managed(db, req.enabled)
            scope = "global"

        if not ok:
            raise HTTPException(status_code=404, detail="会话不存在，无法设置该会话的托管状态")

        state = {
            "global": get_global_ai_managed(db),
            "sessions": list_session_ai_overrides(db),
        }
    finally:
        db.close()

    # 广播状态变更（失败不影响接口返回，开关本身已落库）
    try:
        from routers.ws import manager

        event = custody_event(req.conversation_id, req.enabled, scope, reason="manual")
        asyncio.run(manager.broadcast_to_agents(event))

        # 会话级变更时同步告知该客户，便于 C 端提示「人工接待中」
        uid, _ = parse_conv_id(req.conversation_id)
        if uid.isdigit():
            asyncio.run(manager.send_to_user(int(uid), event))
    except Exception as e:
        print(f"[Warning] 广播托管状态失败: {type(e).__name__}: {e}")

    scope_text = f"会话 {req.conversation_id}" if req.conversation_id else "全局"
    print(f"[Custody] {scope_text} AI 托管已{'开启' if req.enabled else '关闭'}")

    return state
