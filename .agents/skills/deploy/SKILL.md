---
name: deploy
description: 部署流程执行 — 适配 ref-ops-engine 的 Docker + docker-compose 双容器部署（FastAPI 后端 + Next.js 前端）
when_to_use: 用户触发 /deploy 时；里程碑完成需要验证生产部署时
version: 1.0.0
---

# /deploy — 部署流程（ref-ops-engine 适配版）

## 项目上下文

- **部署方式**：Docker + docker-compose（非 Vercel / Railway / 标准 PaaS）
- **后端**：Python FastAPI，`backend/Dockerfile`（多阶段构建）
- **前端**：Next.js 14，`frontend/Dockerfile`
- **容器编排**：项目根目录 `docker-compose.yml`
- **数据持久**：SQLite 文件位于 `backend/data/`（需 volume 挂载，参见技术债 #29）
- **数据源**：`input/` 目录（XLSX 文件，.gitignore，需手动同步）
- **配置文件**：`config/exchange_rate.json`（汇率配置，可在前端 Settings 页修改）

## 部署前检查清单

### 代码质量
1. Grep `frontend/` 搜索 `as any` / `@ts-ignore` — 必须为 0
2. 运行 TypeScript 编译：`cd frontend && npx tsc --noEmit`（必须 0 errors）
3. 检查 Python 语法：`python -m py_compile backend/main.py backend/core/analysis_engine_v2.py`

### 数据源检查
4. 确认 `input/` 目录有最新 XLSX 文件（T-1 数据）
5. 确认 `config/exchange_rate.json` 汇率配置正确（USD:THB = 1:34 默认）
6. 确认 `key/` 目录不在 git 追踪中（`.gitignore` 已覆盖）

### Docker 配置
7. Read `docker-compose.yml` — 确认端口映射（后端 8000，前端 3000）
8. 确认 SQLite volume 挂载配置正确（防止容器重启数据丢失）

## 部署执行序列

### 本地验证部署
```bash
# 步骤 1：构建镜像
docker-compose build --no-cache

# 步骤 2：启动容器
docker-compose up -d

# 步骤 3：等待服务就绪（后端健康检查）
curl -f http://localhost:8000/health || exit 1

# 步骤 4：前端可访问性检查
curl -f http://localhost:3000 || exit 1

# 步骤 5：核心 API 验证（关键端点）
curl http://localhost:8000/api/analysis/summary
curl http://localhost:8000/api/leads/overview
curl http://localhost:8000/api/presentation/action-plan
```

### 快速启动（开发/演示）
```bash
# 非 Docker 启动（开发模式）
python3 start.py
# 或
streamlit run app.py          # 旧版 Streamlit 面板（M8 及以前）
```

## 部署后验证

### 功能验证（10 项核心）
1. 前端首页加载 `http://localhost:3000/zh`
2. API `/api/analysis/summary` 返回非空数据
3. 前端 Dashboard 页显示 KPI 卡片（非 mock 降级）
4. 币种显示格式 `$X (฿Y)` 正确
5. 中泰语言切换正常（`/zh` → `/th`）
6. 汇报沉浸模式 `/present` 键盘导航正常
7. SQLite 快照写入正常（查看 `backend/data/` 文件时间戳）
8. WebMCP 8 个 Tool 注册成功（浏览器控制台无错误）
9. Mock 降级 Banner 仅在缺少真实数据时显示
10. NavSidebar 所有页面入口可访问

### 容错验证
- 停止后端容器，前端应显示友好的错误提示（非白屏）
- 删除 `input/` 中某个 XLSX，API 应返回降级数据而非 500

## 已知部署注意事项（技术债）
- **#29**：SQLite volume 持久化需在 docker-compose.yml 配置，否则容器重启丢失快照数据
- **#8**：本地开发首次需手动 `npm install`（Docker 内自动，但 local dev 无此步骤文档）
- **LINE Notify**（#4）：API 已停用（2025-03），通知模块需迁移到 LINE Messaging API

## 与全局 Skill 的关系
- 全局版路径：~/.Codex/skills/deploy/SKILL.md（**当前不存在**）
- 全局参考：`~/.Codex/contexts/deploy-sop.md`（**文件存在，可 Read 获取通用部署 SOP**）
- 本适配版替换了标准 Vercel/PaaS 部署步骤，改为 Docker + docker-compose 流程
