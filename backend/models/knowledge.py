"""知识库数据模型"""

from __future__ import annotations

from pydantic import BaseModel


class BookMeta(BaseModel):
    book_id: str
    title: str
    file: str
    last_updated: str | None = None
    chapter_count: int = 0


class ChapterNode(BaseModel):
    chapter_id: str
    title: str
    level: int
    children: list[ChapterNode] = []


class BookContent(BaseModel):
    book_id: str
    title: str
    content: str
    chapters: list[ChapterNode] = []
    last_updated: str | None = None


class SearchResult(BaseModel):
    book_id: str
    book_title: str
    chapter_id: str | None = None
    chapter_title: str | None = None
    snippet: str
    score: float = 1.0


class GlossaryTerm(BaseModel):
    term: str
    definition: str
    category: str | None = None
