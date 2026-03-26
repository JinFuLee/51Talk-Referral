# Backend Knowledge API — 交付摘要

## 创建文件

| 文件 | 说明 |
|------|------|
| `backend/api/knowledge.py` | FastAPI Router，4 个端点 |
| `backend/services/knowledge_service.py` | 核心逻辑：书架/解析/搜索/术语 |
| `backend/models/knowledge.py` | 5 个 Pydantic 模型 |
| `backend/main.py`（修改） | 注册 knowledge 到 ROUTER_REGISTRY |

## 端点清单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/knowledge/books` | 书架目录，返回 list[BookMeta] |
| GET | `/api/knowledge/book/{book_id}` | 完整内容 + 章节树，返回 BookContent |
| GET | `/api/knowledge/search?q=xxx` | 全文搜索，关键词 **高亮** |
| GET | `/api/knowledge/glossary` | 术语字典，解析 glossary.md |

## 书架配置

4 本书均已找到文件并解析章节：

| book_id | 标题 | 章节数 |
|---------|------|--------|
| business-bible | 业务百科全书 | 12 |
| ranking-spec | 排名算法规范 | 10 |
| methodology | 分析方法论 | 5 |
| bi-dictionary | BI 指标字典 | 16 |

## 术语库

59 条术语（含类别），来自 `docs/glossary.md`

## Commits

- `feat(backend): add knowledge API`（4 个文件）
- `fix(lint): fix ruff E501/UP017 in knowledge API`
