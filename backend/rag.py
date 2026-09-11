"""
RAG 检索引擎
- 轻量实现：基于 SQLite FTS5 全文搜索（MVP 模式，无需向量库）
- 支持文档上传、切片、关键词检索
"""
import os
import re
import sqlite3
import threading
from typing import Optional

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
RAG_DB = os.path.join(BACKEND_DIR, "data", "rag.db")

_lock = threading.Lock()


def _get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(RAG_DB), exist_ok=True)
    conn = sqlite3.connect(RAG_DB, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # FTS5 全文索引
    conn.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
            filename, content, content='documents', content_rowid='id'
        )
    """)
    conn.execute("""
        CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
            INSERT INTO documents_fts(rowid, filename, content)
            VALUES (new.id, new.filename, new.content);
        END
    """)
    conn.execute("""
        CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, filename, content)
            VALUES ('delete', old.id, old.filename, old.content);
        END
    """)
    conn.commit()
    return conn


class RAGEngine:
    """
    轻量 RAG 引擎
    - add_document: 添加文档并切片
    - search: 关键词检索 + 相关度排序
    """

    CHUNK_SIZE = 500  # 每片字符数
    CHUNK_OVERLAP = 50

    @staticmethod
    def add_document(filename: str, content: str) -> int:
        """
        添加文档到知识库
        返回文档 ID
        """
        chunks = RAGEngine._chunk_text(content)
        with _lock:
            conn = _get_conn()
            try:
                cursor = conn.execute(
                    "INSERT INTO documents (filename, content) VALUES (?, ?)",
                    (filename, "\n".join(chunks)),
                )
                doc_id = cursor.lastrowid
                conn.commit()
                return doc_id
            finally:
                conn.close()

    @staticmethod
    def list_documents() -> list[dict]:
        """获取所有文档元信息"""
        with _lock:
            conn = _get_conn()
            try:
                cursor = conn.execute(
                    "SELECT id, filename, LENGTH(content) as size FROM documents ORDER BY id DESC"
                )
                rows = cursor.fetchall()
                return [
                    {"id": r[0], "filename": r[1], "size": r[2]}
                    for r in rows
                ]
            finally:
                conn.close()

    @staticmethod
    def search(query: str, top_k: int = 5) -> list[dict]:
        """
        关键词检索知识库
        返回最相关的 top_k 个切片
        """
        if not query.strip():
            return []
        # 提取关键词
        keywords = re.findall(r'[\u4e00-\u9fff]{2,}|\w+', query.lower())
        if not keywords:
            return []

        with _lock:
            conn = _get_conn()
            conn.row_factory = sqlite3.Row
            try:
                results = []
                for kw in keywords[:5]:  # 最多用 5 个关键词
                    cursor = conn.execute(
                        """
                        SELECT d.id, d.filename, d.content,
                               (LENGTH(d.content)) as size
                        FROM documents d
                        WHERE d.content LIKE ?
                        LIMIT ?
                        """,
                        (f"%{kw}%", top_k * 2),
                    )
                    for row in cursor.fetchall():
                        # 计算相关度分数（关键词命中数 / 总关键词数）
                        content_lower = row["content"].lower()
                        hits = sum(1 for k in keywords if k in content_lower)
                        score = hits / len(keywords)
                        results.append({
                            "doc_id": row["id"],
                            "filename": row["filename"],
                            "content": row["content"],
                            "relevance": score,
                        })
                # 按相关度排序
                results.sort(key=lambda x: x["relevance"], reverse=True)
                # 去重并取 top_k
                seen = set()
                top = []
                for r in results:
                    if r["doc_id"] not in seen:
                        seen.add(r["doc_id"])
                        top.append(r)
                        if len(top) >= top_k:
                            break
                return top
            finally:
                conn.close()

    @staticmethod
    def _chunk_text(text: str) -> list[str]:
        """将长文本切片"""
        text = text.strip()
        if len(text) <= RAGEngine.CHUNK_SIZE:
            return [text] if text else []
        chunks = []
        i = 0
        while i < len(text):
            end = i + RAGEngine.CHUNK_SIZE
            chunk = text[i:end]
            # 尝试在句子边界切割
            for sep in ["。", ".", "\n", " "]:
                last = chunk.rfind(sep)
                if last > len(chunk) // 2:
                    end = i + last + 1
                    break
            chunks.append(text[i:end].strip())
            i += RAGEngine.CHUNK_SIZE - RAGEngine.CHUNK_OVERLAP
        return [c for c in chunks if c]
