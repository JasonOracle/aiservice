"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[接入图片识图（vision）能力——1) stream_ai_response 新增 image_urls 参数，
          把图片转成 base64 data URL 后拼成 OpenAI 标准图文数组（content: [{type:text},{type:image_url}]）；
          2) 新增「分问题类型区别对待」的识图规则：事实类问题可直接依据图片作答，
          争议类问题（质量判定 / 责任归属 / 退换资格 / 赔偿）只允许客观描述所见并引导人工，严禁直接下结论；
          3) 纯图片消息（无文字）时先描述所见再追问用户需求]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[1. 正式接入 Dots 模型网关（小红书 Dots Studio，OpenAI 兼容协议），新增 XIAO_HONG_SHU_API_KEY 配置项支持；2. 修正本模块 load_dotenv 路径错误——原先多退一级指向文件系统根目录 /.env（该文件并不存在），导致 backend/.env 实际从未被本模块加载；3. 明确配置优先级为「进程环境变量 > backend/.env > 项目根 .env」]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[1. 修复「LLM 未配置/鉴权失败」被伪装成「知识库查不到答案」的问题——原先用 sk-mvp-placeholder 占位 Key 静默吞掉 401，导致所有提问都回落到"请转人工"，严重误导排查；2. 新增 is_llm_configured() 供健康检查暴露模型配置状态；3. 细分异常处理并打印服务端日志]

AI 引擎核心模块
- 整合 Mem0 记忆 + RAG 检索 + LLM 调用（含图片识图）
- 流式输出支持

★ 图片必须转 base64 data URL 再送模型：
  模型网关位于公网，**无法回连** http://localhost:8080/uploads/... 这类本机地址，
  直接传相对路径模型会取不到图（已实测 data URL 形式可用）。
"""
import os
from typing import AsyncGenerator, List, Optional
from openai import AsyncOpenAI, AuthenticationError, APIConnectionError, APIStatusError
from dotenv import load_dotenv

from chat_images import to_data_url
from memory import MemoryManager
from rag import RAGEngine

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

# 配置优先级（高 → 低）：进程环境变量（docker-compose 注入）> backend/.env > 项目根 .env
# load_dotenv 默认 override=False，故「先加载者优先」，此处按优先级从高到低依次加载。
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

# Dots 模型网关（小红书 Dots Studio）默认地址与模型
DEFAULT_BASE_URL = "https://note3-prev-api.askdiandian.com/v1"
DEFAULT_MODEL = "dots3-note-prev"

# 兼容两套命名：Dots 平台专用的 XIAO_HONG_SHU_API_KEY 优先，其次通用 OPENAI_API_KEY
OPENAI_API_KEY = os.getenv("XIAO_HONG_SHU_API_KEY") or os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", DEFAULT_BASE_URL)
OPENAI_MODEL = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)

# 未配置模型网关时的对外提示（与"知识库无答案"区分开，便于定位问题）
MSG_NOT_CONFIGURED = (
    "【AI 服务未配置】当前后端未配置大模型 API Key，暂时无法生成回答。"
    "请在项目根目录 .env 中设置 XIAO_HONG_SHU_API_KEY（或 backend/.env 中的 OPENAI_API_KEY）后重启服务。"
)
MSG_AUTH_FAILED = "【AI 服务异常】大模型 API Key 无效或已过期，请联系管理员检查模型配置。"
MSG_UNAVAILABLE = "很抱歉，AI 服务暂时不可用，请稍后再试或转接人工客服。"

_client: Optional[AsyncOpenAI] = None


def is_llm_configured() -> bool:
    """模型网关是否已配置（用于健康检查与故障排查）"""
    return bool(OPENAI_API_KEY.strip())


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=OPENAI_API_KEY or "sk-mvp-placeholder", base_url=OPENAI_BASE_URL)
    return _client


async def stream_ai_response(
    user_id: int,
    user_query: str,
    user_traits: str = "",
    image_urls: Optional[List[str]] = None,
) -> AsyncGenerator[str, None]:
    """
    生成 AI 回复（流式）

    参数：
    - user_id:     客户 ID（用于取 Mem0 长期记忆）
    - user_query:  用户文字提问（**纯图片消息时为空串**，调用方会以商品名兜底）
    - user_traits: 用户画像（冷启动用）
    - image_urls:  图片相对路径列表（如 `/uploads/chat/2026-09/xxx.jpg`）。
                   非空时以「图文数组」形式送模型，使 AI 真正「看到」图片

    流程：
    1. 获取用户长期记忆（Mem0）
    2. RAG 检索知识库
    3. 构建 prompt（含图片识图规则）并调用 LLM
    4. 如果检索不到相关内容，触发 Fallback
    """
    # 0. 配置校验：未配置模型网关时直接明确报错，
    #    绝不能伪装成"知识库查不到答案"，否则会掩盖配置故障、误导排查
    if not is_llm_configured():
        print("[Error] OPENAI_API_KEY 未配置，跳过 LLM 调用，返回配置提示")
        yield MSG_NOT_CONFIGURED
        return

    client = get_client()

    # 1. Mem0 记忆
    memories = MemoryManager.get_memories(user_id)
    user_context = MemoryManager.get_user_context(user_id)

    # 1.1 图片：相对路径 → base64 data URL
    #     模型网关在公网，取不到本机 /uploads 地址，必须内联为 data URL；
    #     单张转换失败只跳过该图，不影响其余图片与文字。
    data_urls: List[str] = []
    for u in image_urls or []:
        du = to_data_url(u)
        if du:
            data_urls.append(du)
    has_images = len(data_urls) > 0
    text_query = (user_query or "").strip()

    # 2. RAG 检索（纯图片消息没有文字，检索空串无意义，直接跳过）
    rag_results = RAGEngine.search(text_query, top_k=3) if text_query else []
    rag_context = ""
    if rag_results:
        rag_context = "\n\n相关知识库内容:\n" + "\n".join(
            f"[来源: {r['filename']}]\n{r['content'][:500]}" for r in rag_results
        )

    # 3. 构建 prompt
    system_prompt = (
        "你是 AI 客服助手，服务于电商商城。\n"
        "规则：\n"
        "1. 基于知识库内容回答问题\n"
        "2. 参考用户历史偏好，语气因人而异\n"
        "3. 如果知识库中没有相关信息，明确告知无法回答并提示转人工，严禁编造\n"
        "4. 回答简洁，不超过 3 段\n"
    )
    if user_context:
        system_prompt += f"\n\n用户画像（Mem0 记忆）:\n{user_context}\n"
    if rag_context:
        system_prompt += rag_context
    elif has_images:
        # 带图但未命中知识库：允许**客观描述图片所见**（这是模型真实看到的，不属于编造），
        # 但严禁用模型自身的通用知识回答商品的实质性信息（AGENTS.md 功能高压线）
        system_prompt += (
            "\n\n【重要约束】本次对话未检索到相关商品知识库内容，因此：\n"
            "1. 你可以客观描述图片中看到的内容，这属于事实描述，不算编造；\n"
            "2. 严禁凭你自身的通用知识回答商品的价格、规格、政策、售后条件等实质性问题；\n"
            "3. 涉及上述实质性问题时，必须回复："
            "「很抱歉，这个问题我需要为您转接人工客服，他们会有更专业的解答。」"
        )
    else:
        # 未命中知识库：收紧回答边界（AGENTS.md 功能高压线）
        # 允许寒暄，但禁止用模型自身知识对实质性咨询编造答案，必须引导转人工
        system_prompt += (
            "\n\n【重要约束】本次对话未检索到任何知识库内容，因此：\n"
            "1. 若用户只是打招呼或寒暄，可以友好、简洁地回应；\n"
            "2. 若用户提出实质性咨询（商品、价格、规格、政策、功能、使用方法等），"
            "必须回复：「很抱歉，我暂时无法回答这个问题。您可以转接人工客服，他们会有更专业的解答。」\n"
            "3. 严禁凭你自身的知识作答，严禁编造任何信息。"
        )

    # 3.1 图片识图规则（仅在本次消息带图时注入）
    #     ★ 核心边界（用户确认）：**「描述事实」与「下结论」是两件事**——
    #       事实类问题可直接依据图片作答；争议类问题只允许描述所见 + 引政策条款，
    #       判定权交还人工，避免 AI 以官方口径误判责任。
    if has_images:
        system_prompt += (
            "\n\n【图片识图规则】用户本条消息包含图片，你能看到图片内容，请严格遵守：\n"
            "1. 「事实类」问题（这是什么、外观状态、数量、颜色、怎么看/怎么用、参数查询）："
            "可以基于图片内容直接回答，并优先结合知识库条款给出操作指引。\n"
            "2. 「争议类」问题（是否属于质量问题、责任归属、能不能退/换/赔、损失认定）："
            "**你只能客观描述从图片看到的内容，并引用知识库中的政策条款，严禁直接下结论**"
            "（例如不得说「这属于质量问题」「可以给您退换」）。"
            "必须明确引导：「图片我看到了，……（客观描述）。是否属于质量问题、能否退换，"
            "需要人工为您核实，已为您转接人工客服。」\n"
            "3. 若用户只发了图片、没有文字：先客观描述你看到的内容，再询问用户具体想了解什么。\n"
            "4. 严禁描述图片中并不存在的东西，严禁编造图片细节。"
        )

    # 3.2 组装 user 消息：带图时用 OpenAI 标准「图文数组」，无图时保持纯字符串
    if has_images:
        user_content: list = [
            {"type": "text", "text": text_query or "（用户只发送了图片，未附文字说明）"}
        ]
        for du in data_urls:
            user_content.append({"type": "image_url", "image_url": {"url": du}})
        user_message: dict = {"role": "user", "content": user_content}
    else:
        user_message = {"role": "user", "content": text_query}

    messages = [
        {"role": "system", "content": system_prompt},
        user_message,
    ]

    # 4. 调用 LLM
    try:
        stream = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta
    except AuthenticationError as e:
        # 鉴权失败属于配置故障，必须显式暴露给调用方与用户，不做知识库降级
        print(f"[Error] LLM 鉴权失败（API Key 无效或过期）: {e}")
        yield MSG_AUTH_FAILED
    except Exception as e:
        # 网络/服务端异常：降级到知识库原文，仍严格禁止编造内容
        print(f"[Error] LLM 调用失败 {type(e).__name__}: {e}")
        if rag_results:
            yield f"（知识库参考）{rag_results[0]['content'][:300]}"
        else:
            yield MSG_UNAVAILABLE

    # 5. 更新记忆
    try:
        MemoryManager.add_memory(user_id, f"咨询过: {user_query[:50]}")
    except Exception:
        pass
