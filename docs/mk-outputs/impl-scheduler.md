# 定时排程功能实现报告

## 变更摘要

| 文件 | 类型 | 说明 |
|------|------|------|
| `backend/api/notifications.py` | 修改 | 追加 5 个排程 API + ScheduleIn/ScheduleUpdate Pydantic 模型 |
| `backend/main.py` | 修改 | lifespan 注册 AsyncIOScheduler，startup 加载持久化排程 |
| `frontend/app/notifications/ScheduleManager.tsx` | 新建 | 排程卡片列表 + 新增/编辑弹窗，中英双语 |
| `frontend/app/notifications/page.tsx` | 修改 | 引入 ScheduleManager，放在 PushControl 下方 |

## 后端实现

### 依赖
- `apscheduler==3.11.2`（APScheduler 3.x）
- `tzlocal==5.3.1`（时区依赖）

### 存储
- `config/notification-schedule.json`（JSON array，持久化）

### API 端点
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/notifications/schedule | 排程列表 |
| POST | /api/notifications/schedule | 新建排程 |
| PUT | /api/notifications/schedule/{id} | 编辑排程 |
| DELETE | /api/notifications/schedule/{id} | 删除排程 |
| POST | /api/notifications/schedule/{id}/toggle | 启停排程 |

### 调度器
- `AsyncIOScheduler(timezone="Asia/Bangkok")`，在 lifespan startup 启动
- `_sync_scheduler()` 每次 CRUD 后同步重建 job
- job ID 格式：`notification_schedule_{schedule_id}`
- cron 触发：`hour + minute` 字段

## 前端实现

### ScheduleManager.tsx
- 排程卡片：状态指示点（绿/灰）+ 名称 + 平台徽章 + 时间 + 模板 + 通道列表
- 操作按钮：启停（PowerOff/Power）+ 编辑 + 删除
- 表单弹窗：名称/平台/模板/时间/通道/备注/Force/DryRun/启用
- 通道输入：逗号分隔字符串，自动 split/join
- SWR 30 秒自动刷新

### page.tsx
- 新增 `schedule` i18n key（中英双语）
- ScheduleManager 放在 PushControl 下方、OutputGallery 上方

## 验收状态
- ruff lint: PASS
- tsc --noEmit: PASS
