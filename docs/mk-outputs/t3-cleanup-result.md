# Phase1 清理结果报告

**提交**: `93a6a2bf`
**状态**: 完成

## 删除文件数统计

| 类别 | 删除数量 |
|------|----------|
| 后端 Loaders | 6 |
| 后端 Analyzers | 7 + `__init__.py` |
| 后端 Core 旧模块 | 11 |
| 后端 API 旧端点 | 20 |
| 后端 API adapters | 3 |
| 后端 services | 1 (`analysis_service.py`) |
| 后端 models 旧文件 | 4 |
| 后端 misc | 2 (`mcp_bridge.py`, `check.py`) |
| 后端 tests/ | 10+ |
| 根目录测试文件 | 5 |
| 根目录脚本 | 2 (`bi_downloader.py`, `terminal_start.py`) |
| 根目录 command 文件 | 2 |
| 目录（input/data/logs/output/terminal） | 5 |
| config 旧配置文件 | 2 |
| **总计** | **~85 个文件/目录** |

> 前端 source 文件（app/components/lib 等）在执行前已不存在，仅保留 node_modules。

## 保留文件列表（后端骨架）

| 文件 | 说明 |
|------|------|
| `backend/main.py` | FastAPI 主入口，6-router 精简注册表 |
| `backend/api/health.py` | 健康检查端点 |
| `backend/api/system.py` | 系统信息端点 |
| `backend/api/config.py` | 配置管理端点 |
| `backend/api/reports.py` | 报告文件端点 |
| `backend/api/datasources.py` | 数据源端点 |
| `backend/api/presentation.py` | 演示汇报端点（fallback 模式） |
| `backend/api/dependencies.py` | DI 桩（Phase2 重建后填充） |
| `backend/api/utils.py` | API 工具函数 |
| `backend/core/loaders/base.py` | BaseLoader 抽象基类 |
| `backend/core/config.py` | 业务配置 |
| `backend/core/project_config.py` | 项目配置加载 |
| `backend/core/i18n.py` | 国际化 |
| `backend/core/time_period.py` | 时间周期工具 |
| `backend/models/__init__.py` | 空（Phase2 重建） |

## 修改摘要

- `backend/main.py`: 移除 20+ 旧路由，精简为 6 个路由；移除 AnalysisService 单例和 asyncio 自动运行逻辑
- `backend/api/dependencies.py`: 重写为简洁桩，移除 AnalysisService/SnapshotStore 依赖
- `backend/core/loaders/__init__.py`: 仅导出 BaseLoader
- `backend/models/__init__.py`: 清空，Phase2 重建
- `backend/api/config.py / reports.py / presentation.py`: 移除 AnalysisService 类型注解，保留运行时 try/except fallback 逻辑
