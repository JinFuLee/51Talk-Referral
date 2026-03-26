# Frontend Knowledge Page — 交付报告

## 概述

知识库前端功能全量实现，GitBook/Notion 风格文档阅读体验。

## 新建文件（8 个）

| 文件 | 职责 |
|------|------|
| `frontend/app/knowledge/page.tsx` | 主页面：两栏布局（280px 左导航 + 弹性阅读区），URL 同步，三态处理 |
| `frontend/components/knowledge/BookShelf.tsx` | 横排书架 Tab，选中态 accent 底色 + 白字，章节数和更新日期 |
| `frontend/components/knowledge/ChapterTree.tsx` | h2/h3 章节树，展开/收起，当前章节 accent 左边框高亮，点击平滑滚动 |
| `frontend/components/knowledge/MarkdownReader.tsx` | react-markdown + remark-gfm，自定义 h2（带锚点 + 收藏按钮）/h3/table/code/blockquote |
| `frontend/components/knowledge/SearchBar.tsx` | debounce 300ms，按书分组，关键词 `<mark>` 高亮，Ctrl+K 聚焦 |
| `frontend/components/knowledge/GlossaryCard.tsx` | 从 `/api/knowledge/glossary` 加载术语，DOM 扫描替换，hover 悬浮定义卡片 |
| `frontend/components/knowledge/BookmarkPanel.tsx` | ☆/★ 切换（localStorage），右侧滑出面板，按书分组，支持添加笔记 |
| `frontend/components/knowledge/ReadingGuide.tsx` | 首次访问弹出，5 条推荐阅读（必读/选读/参考），"不再显示"持久化 |

## 修改文件（1 个）

| 文件 | 变更 |
|------|------|
| `frontend/components/layout/NavSidebar.tsx` | system 组 Settings 之前添加 `{ href: '/knowledge', label: '知识库', Icon: BookOpen }` |

## 设计合规

- 颜色：全部使用语义 token（`--color-accent`, `--bg-surface`, `--text-primary` 等）
- 表格：`slide-thead-row / slide-th / slide-td` 类
- 卡片：`card-base` 类
- 三态：所有数据区域覆盖 loading/error/empty
- 收藏角标 `position: absolute -top-1.5 -right-1.5`

## TypeScript

`npx tsc --noEmit` 零错误

## API 接口依赖

| 端点 | 用途 |
|------|------|
| `GET /api/knowledge/books` | 书架列表 |
| `GET /api/knowledge/book/{id}` | 书籍内容（含章节树） |
| `GET /api/knowledge/search?q=xxx` | 全文搜索 |
| `GET /api/knowledge/glossary` | 术语列表 |
