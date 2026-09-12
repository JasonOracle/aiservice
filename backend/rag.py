"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增中文虚词噪声过滤——关键词切分会产生「怎么/么选/能不能」等高频功能词，导致「猫砂怎么选」这类知识库外问题误命中"轴体怎么选""尺码怎么选"等无关文档，让模型拿着错资料作答；现按黑名单 + 纯功能字双重规则剔除]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增 delete_document()，支持按文件名删除文档，使种子脚本可重复执行而不产生重复文档]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[1. 修复中文长句检索失效问题——原正则把整句中文当成单一关键词，LIKE 必然匹配失败，现改为中文 2/3-gram 切分；2. 新增 total_chunks() 统计知识库切片总数]

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

    # 文件名命中的加权倍数（标题级关键词比正文顺带提及更能代表文档主题）
    TITLE_WEIGHT = 3.0

    # 相关度下限：低于该值的召回按噪声丢弃。
    # 取舍原则 —— 本项目的高压线是「检索不到必须转人工、严禁编造」，
    # 因此宁可不召回（老实转人工），也不能把弱相关的无关资料交给模型作答。
    MIN_RELEVANCE = 0.30

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
    def delete_document(filename: str) -> int:
        """
        按文件名删除文档
        用途：种子脚本重复执行时先删后插，避免同一文档被灌入多份
        返回被删除的行数
        """
        with _lock:
            conn = _get_conn()
            try:
                cursor = conn.execute("DELETE FROM documents WHERE filename = ?", (filename,))
                conn.commit()
                return cursor.rowcount
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

    # 中文虚词/疑问词 n-gram 黑名单
    # 原因：n-gram 切分会产出「怎么」「么选」「能不能」这类高频功能词，
    # 它们几乎出现在所有口语化问句里，会造成严重跨品类误召回
    # （例如「猫砂怎么选」会命中含「轴体怎么选」「尺码怎么选」的无关文档，
    #   进而让模型拿着无关资料作答，破坏「检索不到就转人工」的高压线）。
    NOISE_NGRAMS = {
        "怎么", "么选", "怎么选", "选哪", "什么", "么样", "怎么样", "怎样",
        "一下", "帮我", "请问", "麻烦", "你们", "我们", "他们", "咱们",
        "可以", "能不能", "是不是", "有没有", "会不会", "不能", "不会",
        "不行", "不是", "有无", "哪些", "哪个",
    }

    # 纯功能字集合：若某个 n-gram 的每个字符都在此集合中，则视为噪声
    FUNC_CHARS = set(
        "的了呢吗吧啊呀哦嗯是在有没不我你他她它们这那些个与和或会能以怎样什么"
        "要想请帮给让并就都也还又再只但而且因为所被把从到向对跟同于之其此该各"
        "每任何某来去说做上下里外前后中间左右一下麻烦"
    )

    @staticmethod
    def _is_noise(kw: str) -> bool:
        """判断一个候选关键词是否属于无检索价值的虚词噪声"""
        if kw in RAGEngine.NOISE_NGRAMS:
            return True
        # 全部由功能字组成（如「能不」「样什」）同样丢弃
        return all(ch in RAGEngine.FUNC_CHARS for ch in kw)

    @staticmethod
    def _extract_keywords(query: str) -> list[str]:
        """
        从查询语句中提取检索关键词（无需第三方分词库）

        - 中文：连续中文片段按 2-gram / 3-gram 切分
          原因：整句中文作为单一关键词时 LIKE '%整句%' 无法命中，
          例如「你们的蛋白粉成分怎么样」将永远检索不到含「蛋白粉」的文档。
        - 过滤虚词噪声（见 NOISE_NGRAMS / FUNC_CHARS），避免「怎么选」这类
          通用疑问词把无关品类的文档也召回进来。
        - 英文/数字：按 \\w+ 切分，过滤长度小于 2 的噪声词。
        - 结果去重并限制数量，避免超长查询导致检索退化。
        """
        q = query.lower()
        keywords: list[str] = []

        for run in re.findall(r'[\u4e00-\u9fff]+', q):
            if len(run) == 1:
                continue
            if len(run) <= 3:
                # 短词直接整体作为关键词，避免拆碎后语义丢失
                keywords.append(run)
                continue
            keywords.extend(run[i:i + 2] for i in range(len(run) - 1))
            keywords.extend(run[i:i + 3] for i in range(len(run) - 2))

        keywords.extend(t for t in re.findall(r'[a-z0-9_]+', q) if len(t) >= 2)

        # 去重、剔噪并保序
        seen: set[str] = set()
        unique: list[str] = []
        for kw in keywords:
            if kw in seen or RAGEngine._is_noise(kw):
                continue
            seen.add(kw)
            unique.append(kw)
        return unique[:20]

    @staticmethod
    def search(query: str, top_k: int = 5) -> list[dict]:
        """
        关键词检索知识库
        返回最相关的 top_k 个切片
        """
        if not query.strip():
            return []
        # 提取关键词（中文按 n-gram 切分，兼容英文）
        keywords = RAGEngine._extract_keywords(query)
        if not keywords:
            return []

        with _lock:
            conn = _get_conn()
            conn.row_factory = sqlite3.Row
            try:
                results = []
                for kw in keywords[:8]:  # 最多用 8 个关键词召回候选
                    # 注意：此处**不能加 LIMIT**。早期版本用 LIMIT top_k*2 截断候选，
                    # 导致后插入的主题文档（如「价格与优惠」「售后政策」）在物理行序上
                    # 排在商品文档之后，永远进不了打分环节，属于隐蔽的召回丢失。
                    cursor = conn.execute(
                        """
                        SELECT d.id, d.filename, d.content,
                               (LENGTH(d.content)) as size
                        FROM documents d
                        WHERE d.content LIKE ?
                        """,
                        (f"%{kw}%",),
                    )
                    for row in cursor.fetchall():
                        # 相关度 = (正文命中数 + 文件名命中数 × 3) / 关键词总数
                        # 文件名命中权重更高：标题级关键词（例如「价格与优惠」这类主题
                        # 文档名）比长篇商品说明顺带提及更能代表文档主题。
                        content_lower = row["content"].lower()
                        filename_lower = (row["filename"] or "").lower()
                        hits = sum(1 for k in keywords if k in content_lower)
                        title_hits = sum(1 for k in keywords if k in filename_lower)
                        score = (hits + title_hits * RAGEngine.TITLE_WEIGHT) / len(keywords)
                        results.append({
                            "doc_id": row["id"],
                            "filename": row["filename"],
                            "content": row["content"],
                            "relevance": score,
                        })
                # 按相关度排序
                results.sort(key=lambda x: x["relevance"], reverse=True)
                # 去重、按阈值过滤噪声并取 top_k
                seen = set()
                top = []
                for r in results:
                    if r["relevance"] < RAGEngine.MIN_RELEVANCE:
                        continue
                    if r["doc_id"] not in seen:
                        seen.add(r["doc_id"])
                        top.append(r)
                        if len(top) >= top_k:
                            break
                return top
            finally:
                conn.close()

    @staticmethod
    def total_chunks() -> int:
        """
        统计知识库中全部文档的切片总数
        供 B 端知识库大盘展示
        """
        with _lock:
            conn = _get_conn()
            try:
                cursor = conn.execute("SELECT content FROM documents")
                return sum(len(RAGEngine._chunk_text(row[0])) for row in cursor.fetchall())
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
