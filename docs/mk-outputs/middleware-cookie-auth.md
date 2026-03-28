# middleware cookie 认证改造

## 任务状态
✓ 完成 — commit `ea848276` | 2026-03-28

## 变更摘要

| 项目 | 改前 | 改后 |
|------|------|------|
| 认证来源 | `Cf-Access-Jwt-Assertion` header | `refops_session` cookie |
| 无认证行为 | redirect /access-denied | redirect /login?from=当前路径 |
| 后端透传方式 | `Cf-Access-Jwt-Assertion` header | `X-Session-Token` header |
| 死循环防护 | 无 | `BYPASS_PAGES = ['/login', '/access-denied']` |

## 核心逻辑流程

```
请求进入
  ↓
pagePath ∈ BYPASS_PAGES？ → 是 → intlMiddleware 放行
  ↓
isLocalhost？ → 是 → local@dev/admin headers 放行
  ↓
refops_session cookie 存在？
  否 → isPublicPage？ → 是 → 放行
                      → 否 → redirect /[locale]/login?from=pathname
  是 → fetchMyAccess(sessionToken)
         ↓
       access == null（后端不可达）？ → isPublicPage？ → 放行/拒绝
         ↓
       isPublicPage(access.publicPages)？ → 放行（带 email/role header）
         ↓
       role/roleDef 存在？ 否 → redirectToDenied
         ↓
       isAllowedByRole(pagePath)？ → 是 → 放行（带完整 headers）
         ↓
       redirectToDenied
```

## 文件变更

- `frontend/middleware.ts` — 完整改写主逻辑 + fetchMyAccess 函数签名

## tsc 验证
```
npx tsc --noEmit → 0 errors
```
