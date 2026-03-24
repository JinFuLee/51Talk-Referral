# 通知推送管理 API — 实现产出

## 完成时间
2026-03-24

## 新建文件
- `backend/api/notifications.py` — 通知推送管理 Router（14 个端点）

## 修改文件
- `backend/main.py` — ROUTER_REGISTRY 新增 `notifications` 注册项

## 端点清单（14 个）

### 通道管理（5 个）
| 端点 | 说明 |
|------|------|
| `GET /api/notifications/channels/{platform}` | 获取通道列表，凭证脱敏（前4位+****） |
| `POST /api/notifications/channels/{platform}` | 新建通道，写入 key/*.json |
| `PUT /api/notifications/channels/{platform}/{channel_id}` | 编辑通道 |
| `DELETE /api/notifications/channels/{platform}/{channel_id}` | 删除通道 |
| `POST /api/notifications/channels/{platform}/{channel_id}/test` | 连通测试 |

### 模板（1 个）
| 端点 | 说明 |
|------|------|
| `GET /api/notifications/templates` | 返回模板列表，围场从 `enclosure_role_override.json` 动态读取 |

### 推送（4 个）
| 端点 | 说明 |
|------|------|
| `POST /api/notifications/push` | 后台执行推送，立即返回 job_id |
| `POST /api/notifications/push/preview` | Dry-run 预览，返回图片统计 |
| `GET /api/notifications/push/status/{job_id}` | 查询任务进度 |
| `GET /api/notifications/today` | 读取今日推送日志 |

### 产出档案（4 个）
| 端点 | 说明 |
|------|------|
| `GET /api/notifications/outputs` | 扫描 output/ 目录，支持 date/role 过滤 |
| `GET /api/notifications/outputs/image/{filename}` | 返回图片 FileResponse |
| `GET /api/notifications/outputs/{date}/{role}/text` | 读取推送文本 |
| `PUT /api/notifications/outputs/{date}/{role}/text` | 编辑推送文本 |

## 关键设计

### 围场-角色映射读取顺序
1. `config/enclosure_role_override.json` 的 `wide` 字段（Settings 写入）
2. `projects/referral/config.json` 的 `enclosure_role_assignment`
3. 硬编码兜底：CC→M0/M1/M2，LP→M3/M4/M5，SS→M3，运营→M6+

### 凭证安全
- GET 通道列表时 webhook/secret 自动脱敏（前4位+****）
- 实际凭证存储在 `key/lark-channels.json` / `key/dingtalk-channels.json`（.gitignore）

### 推送异步模型
- POST /push 立即返回 job_id（非阻塞）
- 通过 asyncio.run_in_executor 在线程池中执行子进程推送
- GET /push/status/{job_id} 轮询进度

### 验证
- 14 个路由全部导入成功（`import ok, routes: 14`）
- ruff lint: All checks passed
