# 通知管理页面 Bug 修复报告

## 修复摘要

commit: `d7bdb8ad`
7 个文件，247 新增 / 249 删除

## 根因诊断

后端 API 与前端组件存在 **5 类字段/路径漂移**：

| Bug | 根因 | 影响组件 |
|-----|------|---------|
| BotCard TypeError | 读 `webhook_url` 但 API 返回 `webhook_preview` | BotCard.tsx |
| CRUD 405 Method Not Allowed | 路径缺 `{platform}`（`/channels/{id}` vs `/channels/{platform}/{id}`）| BotManager.tsx |
| 新建通道 422 | 表单字段 `webhook_url` 但后端要 `webhook` | BotFormModal.tsx |
| 推送 422 | body 用 `channel_ids` 但后端要 `channels`；响应是 job_id 非 results[] | PushControl.tsx |
| PreviewModal 显示空白 | 后端返回 `{ok,images_count,overview_image}` 非 `{text,image_url,card_json}` | PreviewModal.tsx |
| TodayStatus TypeError | 期望 `{lark:[],dingtalk:[]}` 但 API 返回 `{channels:{id:{pushed,time,result,platform}}}` | TodayStatus.tsx |
| OutputGallery TypeError | 期望 `{id,role,type,url}` 但 API 返回 `{filename,size_kb,modified}` | OutputGallery.tsx |

## 修复详情

### BotCard.tsx
- `webhook_url` → `webhook_preview`（API 脱敏字段）
- `role` 改为可选字段，显示时 fallback `'ALL'`

### BotManager.tsx
- `PUT /channels/{id}` → `PUT /channels/{platform}/{id}`
- `DELETE /channels/{id}` → `DELETE /channels/{platform}/{id}`
- `PATCH /channels/{id}/toggle`（后端无此端点）→ `PUT /channels/{platform}/{id}` 传 `{enabled}`

### BotFormModal.tsx
- `webhook_url` → `webhook`（表单字段 + body 字段）
- `POST /channels` → `POST /channels/{platform}`（由 BotManager 传入 platform）

### PushControl.tsx
- `channel_ids` → `channels`（body 字段名对齐后端 Pydantic 模型）
- 推送模板字段：`PushTemplate.name` → `role + description`
- 推送响应改为异步轮询 job_id（2s 间隔，最多 60 次），实时更新每通道状态
- 进度条匹配 `{channel: ch, ok: bool}` 而非 `{channel, success}`

### PreviewModal.tsx
- 响应类型改为 `{ok, role, images_count, overview_image, sample_images, stdout_tail}`
- 展示总览图片 + 样本图片（通过 `/api/notifications/outputs/image/{filename}` 路径加载）

### TodayStatus.tsx
- 适配 `{channels: {id: {pushed,time,result,platform}}, date, total}` 格式
- 按 platform 字段分组展示 Lark / 钉钉
- 移除未使用的 RoleChip/PlatformRow 组件和 ROLE_COLORS 常量

### OutputGallery.tsx
- 适配 `{files: [{filename, size_kb, modified}]}` 格式
- 从 filename 提取 role（格式：`lark-xxx-ROLE-YYYYMMDD*.png`）
- 图片加载失败时 fallback 显示占位图标
- 移除 TextPreviewDrawer 组件（后端无对应文本数据）

## 验收状态

- TypeScript: 0 错误
- ESLint: 0 警告 0 错误
- API 联通：channels(4) / templates(4) / today(0) 均正常
