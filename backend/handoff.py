"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增文件：统一「请求人工接入」的判定逻辑，供 HTTP /api/chat 与 WebSocket /ws/c 两条通道共用]

「请求人工接入」判定
------------------------------------------------------------------
按产品要求，以下两种情况都视为用户发出了一次「请求人工接入」，
B 端坐席台需要立即收到 handoff_request 提示：

1. reason = "user"         用户主动要求人工（如「我要人工客服」「转人工」）
2. reason = "ai_fallback"  AI 自身兜底——回复里提示用户转人工
                           （即知识库检索不到、模型按高压线拒答时）

注意：这里刻意不使用裸词「人工」，否则「人工智能」「人工湖」等词会误触发。
"""

# 用户主动要求人工的关键词（任一命中即触发）
USER_HANDOFF_KEYWORDS = (
    "人工客服",
    "人工服务",
    "转人工",
    "转接人工",
    "找人工",
    "要人工",
    "真人客服",
    "真人",
    "客服介入",
    "找客服",
    "转客服",
)

# AI 兜底话术中出现的标志性片段（命中即视为 AI 已把用户推向人工）
AI_FALLBACK_SIGNS = (
    "转接人工",
    "转人工",
    "人工客服",
)


def detect_handoff(user_message: str, ai_reply: str) -> tuple[bool, str]:
    """
    判定本次对话是否构成「请求人工接入」

    参数：
        user_message: 用户本轮提问原文
        ai_reply:     AI 本轮回复全文

    返回：
        (是否需要人工接入, 触发原因)
        - (True,  "user")        用户主动要求人工
        - (True,  "ai_fallback") AI 兜底、把用户引向人工
        - (False, "")            无需人工接入
    """
    msg = user_message or ""
    for kw in USER_HANDOFF_KEYWORDS:
        if kw in msg:
            return True, "user"

    reply = ai_reply or ""
    for sign in AI_FALLBACK_SIGNS:
        if sign in reply:
            return True, "ai_fallback"

    return False, ""
