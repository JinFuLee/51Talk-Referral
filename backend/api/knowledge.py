"""
知识库 API Router
提供书架目录、书籍内容、全文搜索、术语字典四个端点
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.models.knowledge import BookContent, BookMeta, GlossaryTerm, SearchResult
from backend.services.knowledge_service import (
    get_book_content,
    get_books,
    get_glossary,
    search_books,
)

router = APIRouter(tags=["knowledge"])


@router.get("/knowledge/books", response_model=list[BookMeta], summary="书架目录")
def list_books(lang: str = Query(default="zh", description="语言（zh/th）")) -> list[BookMeta]:
    """返回所有可用书籍的元数据列表"""
    books = get_books(lang=lang)
    return [BookMeta(**b) for b in books]


@router.get(
    "/knowledge/book/{book_id}",
    response_model=BookContent,
    summary="书籍完整内容",
)
def get_book(
    book_id: str,
    lang: str = Query(default="zh", description="语言（zh/th）"),
) -> BookContent:
    """返回指定书籍的完整 Markdown 内容和章节树"""
    data = get_book_content(book_id=book_id, lang=lang)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f"书籍不存在或文件未找到: {book_id}",
        )
    return BookContent(**data)


@router.get(
    "/knowledge/search",
    response_model=list[SearchResult],
    summary="全文搜索",
)
def search(
    q: str = Query(..., description="搜索关键词"),
    lang: str = Query(default="zh", description="语言（zh/th）"),
) -> list[SearchResult]:
    """在所有书籍中按段落搜索关键词，关键词用 **keyword** 包裹高亮"""
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="搜索关键词不能为空")
    results = search_books(query=q.strip(), lang=lang)
    return [SearchResult(**r) for r in results]


@router.get(
    "/knowledge/glossary",
    response_model=list[GlossaryTerm],
    summary="术语字典",
)
def get_glossary_terms() -> list[GlossaryTerm]:
    """解析 docs/glossary.md 返回结构化术语列表"""
    terms = get_glossary()
    return [GlossaryTerm(**t) for t in terms]
