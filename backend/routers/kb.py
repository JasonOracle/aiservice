"""
知识库路由：/api/kb
- 文档上传（MVP 支持 TXT，PDF/Word 需要额外依赖）
- 文档列表
- 溯源测试
"""
from fastapi import APIRouter, UploadFile, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import os

from rag import RAGEngine

router = APIRouter()


class KBStats(BaseModel):
    total_docs: int
    total_chunks: int


class DocMeta(BaseModel):
    id: int
    filename: str
    size: int


class SearchRequest(BaseModel):
    query: str
    top_k: int = 3


class SearchResult(BaseModel):
    filename: str
    content: str
    relevance: float


@router.get("/kb/stats", response_model=KBStats)
def kb_stats():
    """获取知识库统计信息"""
    docs = RAGEngine.list_documents()
    total_chunks = sum(RAGEngine._chunk_text(d.get("content", "")).count("\n") + 1 if False else 0 for d in docs)
    # MVP：简单返回文档数，chunk 数后续精确计算
    return KBStats(total_docs=len(docs), total_chunks=sum(d.get("size", 0) // 500 for d in docs))


@router.get("/kb/docs", response_model=list[DocMeta])
def kb_docs():
    """获取文档列表"""
    return RAGEngine.list_documents()


@router.post("/kb/upload")
async def kb_upload(file: UploadFile):
    """
    上传知识库文档
    - MVP 支持 .txt 文件
    - PDF/Word 需要额外依赖，后续扩展
    """
    if not file.filename or not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="MVP 仅支持 .txt 文件")
    content = (await file.read()).decode("utf-8", errors="replace")
    doc_id = RAGEngine.add_document(file.filename, content)
    return {"id": doc_id, "filename": file.filename}


@router.post("/kb/search", response_model=list[SearchResult])
def kb_search(req: SearchRequest):
    """溯源测试：在知识库中检索"""
    results = RAGEngine.search(req.query, top_k=req.top_k)
    return [
        SearchResult(filename=r["filename"], content=r["content"][:200], relevance=r["relevance"])
        for r in results
    ]
