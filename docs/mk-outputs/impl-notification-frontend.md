# 通知推送管理前端页面 — 交付报告

## 交付内容

| 文件 | 说明 |
|------|------|
| `frontend/app/notifications/page.tsx` | 主页面：中英双语切换、Lark/钉钉 Tab |
| `frontend/app/notifications/TodayStatus.tsx` | 今日推送状态仪表盘（30s 轮询）|
| `frontend/app/notifications/BotCard.tsx` | 单机器人卡片（启停/编辑/删除/webhook 显隐）|
| `frontend/app/notifications/BotFormModal.tsx` | 新建/编辑机器人弹窗表单 |
| `frontend/app/notifications/BotManager.tsx` | 机器人列表 + 空态 + 新增入口 |
| `frontend/app/notifications/PushControl.tsx` | 一键推送 + 模板选择 + 通道多选 + 安全二次确认 |
| `frontend/app/notifications/PushProgress.tsx` | 推送进度条（per-channel 状态可视化）|
| `frontend/app/notifications/PreviewModal.tsx` | 推送内容预览弹窗（图片/文本/卡片 JSON）|
| `frontend/app/notifications/OutputGallery.tsx` | 产出档案（日期+角色筛选 + 图片/文本网格）|

## API 契约

页面消费以下后端端点（后端同步开发中）：

```
GET  /api/notifications/today
GET  /api/notifications/channels/lark
GET  /api/notifications/channels/dingtalk
GET  /api/notifications/templates
POST /api/notifications/push
POST /api/notifications/push/preview
GET  /api/notifications/outputs?date=xxx&role=CC&platform=lark
POST /api/notifications/channels
PUT  /api/notifications/channels/{id}
DELETE /api/notifications/channels/{id}
PATCH /api/notifications/channels/{id}/toggle
```

## 质量验证

- TypeScript：零错误（`npx tsc --noEmit`）
- ESLint：零错误（`npx eslint app/notifications/ --max-warnings=0`）
- Prettier：已格式化（pre-commit hook 自动运行）

## 设计规范合规

- 全部使用 globals.css CSS 变量（`var(--text-primary)` / `var(--border-default)` 等）
- 全部使用 `swrFetcher` from `@/lib/api`（项目 ESLint 规则强制）
- 中英双语：内联 `I18N` 字典，localStorage 持久化，默认中文
- 三态覆盖：loading / error / empty 全部实现
- 安全交互：确认推送需 `window.confirm` 二次确认，webhook/secret 默认 `type="password"`

## commit

`feat: 通知推送管理前端页面` — 432323cf
