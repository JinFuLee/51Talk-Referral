# Task #5 产出：后端 Session 认证系统

## 变更文件
- `backend/api/access_control.py`（+156 行 -17 行）

## 实现内容

### 新增函数
| 函数 | 说明 |
|------|------|
| `_get_session_secret()` | 读取或自动生成 32 字节 hex 密钥，持久化到 `config/session-secret.key` |
| `_create_session_token(email)` | HMAC-SHA256 签名，格式 `payload_b64.sig`，7 天过期 |
| `_verify_session_token(token)` | 验签 + 过期检查，返回 email 或 None |
| `_get_email_from_request(request)` | 统一认证提取，优先级：X-Session-Token header > refops_session cookie > CF JWT |

### 新增端点
- `POST /access-control/login` — 检查 email 白名单 → 创建 token → Set-Cookie（httpOnly, samesite=lax, 7天, secure=非localhost）
- `POST /access-control/logout` — 清除 cookie（max_age=0）

### 新增 Model
- `LoginRequest(BaseModel): email: str`

### 重构
- `_is_admin()` → 使用 `_get_email_from_request` 替换直接读 CF JWT
- `get_my_access()` → 使用 `_get_email_from_request`，source 字段新增 `"session_cookie"` 值

## Cookie 配置
```python
httponly=True
samesite="lax"
max_age=604800  # 7 天
secure=not is_local  # localhost 时不强制 HTTPS
path="/"
```

## 验证
- ruff check: 零错误
- commit: fe8b17b8
- push: main 分支
