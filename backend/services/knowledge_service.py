"""
知识库服务层
读取 docs/ 目录下的 Markdown 文件，提供书架、章节解析、搜索、术语提取功能
"""

from __future__ import annotations

import logging
import os
import re
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# 项目根目录
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_DOCS_DIR = _PROJECT_ROOT / "docs"

# 书架配置
BOOKS: dict[str, dict[str, str]] = {
    "business-bible": {
        "title": "业务百科全书",
        "file": "business-bible.md",
    },
    "ranking-spec": {
        "title": "排名算法规范",
        "file": "cc-ranking-spec.md",
    },
    "methodology": {
        "title": "分析方法论",
        "file": "methodology.md",
    },
    "bi-dictionary": {
        "title": "BI 指标字典",
        "file": "bi-indicator-dictionary.md",
    },
}


def _get_file_path(book_id: str, lang: str = "zh") -> Path | None:
    """i18n fallback：先找 {name}.{lang}.md，fallback 到 {name}.md"""
    if book_id not in BOOKS:
        return None
    base_file = BOOKS[book_id]["file"]
    stem = Path(base_file).stem
    suffix = Path(base_file).suffix

    lang_path = _DOCS_DIR / f"{stem}.{lang}{suffix}"
    if lang_path.exists():
        return lang_path

    default_path = _DOCS_DIR / base_file
    if default_path.exists():
        return default_path

    return None


def _mtime_to_iso(filepath: Path) -> str | None:
    try:
        mtime = os.path.getmtime(filepath)
        return datetime.fromtimestamp(mtime, tz=UTC).isoformat()
    except Exception:
        return None


def _parse_chapters(content: str) -> list[dict]:
    """
    按 ## (h2) 拆分一级章节，### (h3) 拆分二级
    返回树形结构 [{"chapter_id": ..., "title": ..., "level": ..., "children": [...]}]
    """
    lines = content.split("\n")
    chapters: list[dict] = []
    parent_index = -1

    for line in lines:
        if line.startswith("## ") and not line.startswith("### "):
            title = line[3:].strip()
            parent_index += 1
            chapters.append(
                {
                    "chapter_id": f"chapter-{parent_index}",
                    "title": title,
                    "level": 2,
                    "children": [],
                }
            )
        elif line.startswith("### "):
            title = line[4:].strip()
            if parent_index >= 0:
                child_index = len(chapters[parent_index]["children"])
                chapters[parent_index]["children"].append(
                    {
                        "chapter_id": f"chapter-{parent_index}-{child_index}",
                        "title": title,
                        "level": 3,
                        "children": [],
                    }
                )
    return chapters


def get_books(lang: str = "zh") -> list[dict]:
    """返回书架目录（BookMeta 列表）"""
    result = []
    for book_id, meta in BOOKS.items():
        filepath = _get_file_path(book_id, lang)
        last_updated = _mtime_to_iso(filepath) if filepath else None
        chapter_count = 0
        if filepath and filepath.exists():
            try:
                content = filepath.read_text(encoding="utf-8")
                chapters = _parse_chapters(content)
                chapter_count = len(chapters)
            except Exception as e:
                logger.warning(f"读取书籍章节失败 {book_id}: {e}")

        result.append(
            {
                "book_id": book_id,
                "title": meta["title"],
                "file": meta["file"],
                "last_updated": last_updated,
                "chapter_count": chapter_count,
            }
        )
    return result


def get_book_content(book_id: str, lang: str = "zh") -> dict | None:
    """返回完整内容 + 章节树（BookContent）"""
    filepath = _get_file_path(book_id, lang)
    if filepath is None or not filepath.exists():
        return None

    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        logger.error(f"读取书籍内容失败 {book_id}: {e}")
        return None

    chapters = _parse_chapters(content)
    last_updated = _mtime_to_iso(filepath)

    return {
        "book_id": book_id,
        "title": BOOKS[book_id]["title"],
        "content": content,
        "chapters": chapters,
        "last_updated": last_updated,
    }


def search_books(query: str, lang: str = "zh") -> list[dict]:
    """
    全文搜索：遍历所有书，按段落（双换行分隔）匹配关键词
    关键词高亮用 **keyword** 包裹
    """
    if not query or not query.strip():
        return []

    query_lower = query.strip().lower()
    results: list[dict] = []

    for book_id, meta in BOOKS.items():
        filepath = _get_file_path(book_id, lang)
        if filepath is None or not filepath.exists():
            continue

        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception as e:
            logger.warning(f"搜索跳过 {book_id}: {e}")
            continue

        # 按段落分割（双换行）
        paragraphs = re.split(r"\n{2,}", content)
        chapters = _parse_chapters(content)

        for para in paragraphs:
            para_stripped = para.strip()
            if not para_stripped:
                continue
            if query_lower not in para_stripped.lower():
                continue

            # 关键词高亮（大小写不敏感）
            snippet = re.sub(
                re.escape(query),
                f"**{query}**",
                para_stripped,
                flags=re.IGNORECASE,
            )
            # 截断 snippet 到合理长度
            if len(snippet) > 400:
                # 找到第一个关键词位置居中截取
                idx = snippet.lower().find(query_lower)
                start = max(0, idx - 100)
                prefix = "..." if start > 0 else ""
                snippet = prefix + snippet[start : start + 400] + "..."

            # 尝试定位章节（简单匹配：段落所在行之前的最近 ## 标题）
            chapter_id = None
            chapter_title = None
            if chapters:
                # 查找段落在原文中的位置来匹配章节
                para_pos = content.find(para_stripped[:50])
                best_chapter = None
                for ch in chapters:
                    ch_title_pos = content.find(f"## {ch['title']}")
                    if ch_title_pos != -1 and ch_title_pos <= para_pos:
                        best_chapter = ch
                if best_chapter:
                    chapter_id = best_chapter["chapter_id"]
                    chapter_title = best_chapter["title"]

            results.append(
                {
                    "book_id": book_id,
                    "book_title": meta["title"],
                    "chapter_id": chapter_id,
                    "chapter_title": chapter_title,
                    "snippet": snippet,
                    "score": 1.0,
                }
            )

    return results


def get_glossary() -> list[dict]:
    """
    解析 docs/glossary.md 中的术语表格
    支持 | **term** | definition | 和 | term | definition | 两种格式
    """
    glossary_path = _DOCS_DIR / "glossary.md"
    if not glossary_path.exists():
        logger.warning(f"glossary.md 不存在: {glossary_path}")
        return []

    try:
        content = glossary_path.read_text(encoding="utf-8")
    except Exception as e:
        logger.error(f"读取 glossary.md 失败: {e}")
        return []

    terms: list[dict] = []
    current_category: str | None = None

    for line in content.split("\n"):
        # 检测分类标题（## 或 ###）
        if line.startswith("## ") and not line.startswith("### "):
            current_category = line[3:].strip()
            continue
        if line.startswith("### "):
            current_category = line[4:].strip()
            continue

        # 匹配表格行 | **xxx** | yyy | 或 | xxx | yyy |
        # 跳过表头分隔符行
        if not line.startswith("|"):
            continue
        if re.match(r"^\|[\s\-|]+\|$", line):
            continue

        parts = [p.strip() for p in line.strip("|").split("|")]
        if len(parts) < 2:
            continue

        term_raw = parts[0].strip()
        definition = parts[1].strip() if len(parts) > 1 else ""

        # 去掉 ** 包裹
        term = re.sub(r"^\*\*(.+)\*\*$", r"\1", term_raw)
        term = term.strip()

        # 跳过表头行（term 含"层级"/"代码"/"术语"/"类型"等）
        _skip_terms = {"层级", "代码", "术语", "类型", "Term", "---", "字段", "指标"}
        if not term or term in _skip_terms:
            continue
        if term.startswith("-"):
            continue

        if definition:
            terms.append(
                {
                    "term": term,
                    "definition": definition,
                    "category": current_category,
                }
            )

    return terms
