"""
AI 引擎核心模块
- 整合 Mem0 记忆 + RAG 检索 + LLM 调用
- 流式输出支持
"""
import os
from typing import AsyncGenerator, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

import os
from memory import MemoryManager
from rag import RAGEngine

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

_client: Optional[AsyncOpenAI] = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=OPENAI_API_KEY or "sk-mvp-placeholder", base_url=OPENAI_BASE_URL)
    return _client


async def stream_ai_response(
    user_id: int,
    user_query: str,
    user_traits: str = "",
) -> AsyncGenerator[str, None]:
    """
    生成 AI 回复（流式）
    
    流程：
    1. 获取用户长期记忆（Mem0）
    2. RAG 检索知识库
    3. 构建 prompt 并调用 LLM
    4. 如果检索不到相关内容，触发 Fallback
    """
    client = get_client()

    # 1. Mem0 记忆
    memories = MemoryManager.get_memories(user_id)
    user_context = MemoryManager.get_user_context(user_id)

    # 2. RAG 检索
    rag_results = RAGEngine.search(user_query, top_k=3)
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

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query},
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
    except Exception as e:
        # Fallback：LLM 不可用
        if not rag_results:
            yield "很抱歉，我暂时无法回答这个问题。您可以转接人工客服，他们会有更专业的解答。"
        else:
            yield f"（知识库参考）{rag_results[0]['content'][:300]}"

    # 5. 更新记忆
    try:
        MemoryManager.add_memory(user_id, f"咨询过: {user_query[:50]}")
    except Exception:
        pass
