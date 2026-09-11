"""
Mem0 记忆管理器
- 轻量实现：使用 SQLite 存储用户长期记忆（MVP 模式）
- 支持冷启动：从 User.traits 字段初始化
- 支持热更新：每次聊天后提取关键事实更新记忆
"""
import json
import sqlite3
import os
import threading
from typing import Optional

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BACKEND_DIR, "data", "memory.db")

_lock = threading.Lock()


def _get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            fact TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, fact)
        )
    """)
    conn.commit()
    return conn


class MemoryManager:
    """
    用户长期记忆管理器
    - init_memory(user_id, traits): 冷启动，从用户特征初始化记忆
    - add_memory(user_id, fact): 添加新记忆
    - get_memories(user_id): 获取所有记忆
    - search_memory(user_id, query): 简单关键词匹配搜索
    """

    @staticmethod
    def init_memory(user_id: int, traits: str):
        """冷启动：将用户特征拆分为多条记忆"""
        with _lock:
            conn = _get_conn()
            try:
                # 按中文逗号/顿号/句号拆分特征
                parts = [p.strip() for p in traits.replace("，", ",").replace("、", ",").replace("。", ",") if p.strip()]
                for fact in parts:
                    conn.execute(
                        "INSERT OR IGNORE INTO memories (user_id, fact) VALUES (?, ?)",
                        (user_id, fact),
                    )
                conn.commit()
            finally:
                conn.close()

    @staticmethod
    def add_memory(user_id: int, fact: str):
        """添加单条记忆"""
        with _lock:
            conn = _get_conn()
            try:
                conn.execute(
                    "INSERT OR REPLACE INTO memories (user_id, fact, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    (user_id, fact),
                )
                conn.commit()
            finally:
                conn.close()

    @staticmethod
    def get_memories(user_id: int) -> list[dict]:
        """获取用户所有记忆"""
        with _lock:
            conn = _get_conn()
            try:
                cursor = conn.execute(
                    "SELECT fact, created_at FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20",
                    (user_id,),
                )
                rows = cursor.fetchall()
                return [
                    {"fact": row[0], "created_at": row[1]}
                    for row in rows
                ]
            finally:
                conn.close()

    @staticmethod
    def search_memory(user_id: int, query: str) -> list[str]:
        """简单关键词匹配搜索记忆"""
        with _lock:
            conn = _get_conn()
            try:
                # 拆分 query 为关键词（中文字符和英文单词）
                import re
                keywords = re.findall(r'[\u4e00-\u9fff]{2,}|\w+', query.lower())
                if not keywords:
                    return []
                results = set()
                for kw in keywords:
                    cursor = conn.execute(
                        "SELECT fact FROM memories WHERE user_id = ? AND fact LIKE ?",
                        (user_id, f"%{kw}%"),
                    )
                    for row in cursor.fetchall():
                        results.add(row[0])
                return list(results)
            finally:
                conn.close()

    @staticmethod
    def get_user_context(user_id: int, max_facts: int = 10) -> str:
        """
        获取用户上下文摘要，用于注入 LLM prompt
        返回格式化的记忆文本
        """
        memories = MemoryManager.get_memories(user_id)
        if not memories:
            return ""
        facts = [m["fact"] for m in memories[:max_facts]]
        return "\n".join(f"- {f}" for f in facts)
