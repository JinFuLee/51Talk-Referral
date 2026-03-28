# 后端 access-control API 产出摘要

## 完成状态
✓ Task #1 已完成

## 文件产出（3 个）

| 文件 | 说明 |
|------|------|
| `backend/api/access_control.py` | 5 个端点的 APIRouter |
| `config/access-control.json` | 默认配置（13 用户 / 4 角色 / 35 页面） |
| `backend/main.py` | 新增 access_control 注册（L79） |

## 5 个端点

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/access-control` | 仅 admin | 返回完整配置 |
| PUT | `/api/access-control` | 仅 admin | 更新配置（自动递增 version） |
| GET | `/api/access-control/me` | 所有人 | 返回当前用户权限+可见页面 |
| GET | `/api/access-control/audit-log` | 仅 admin | 返回审计日志（倒序，默认 200 条） |
| POST | `/api/access-control/audit-log` | 所有人 | 写入一条访问日志 |

## 关键设计

- **JWT 解码**：`_decode_jwt_email()` base64url 解码 payload，提取 email/sub 字段，不验签
- **admin 判定**：host=localhost + allowLocalDev=true → 自动放行（本地开发免认证）
- **页面通配**：支持 `*`（全部）/ `/*`（子路径）/ 精确匹配
- **审计日志**：写入 `output/access-audit.jsonl`，JSONL 格式，字段 `ts/email/path/ip/granted`
- **配置自愈**：文件不存在时自动写入默认配置

## ruff 检查
✓ All checks passed
