# Task #2 产出：RBAC 三层访问控制 + i18n 组合

## 完成时间
2026-03-28

## 产出文件

| 文件 | 说明 |
|------|------|
| `frontend/middleware.ts` | 重写，组合 RBAC + next-intl（原 4 行 → 115 行） |
| `frontend/lib/access-control.ts` | 类型定义 + JWT 解码 + 路径匹配工具函数 |
| `frontend/app/[locale]/access-denied/page.tsx` | 403 页面（中泰双语） |

## 三层逻辑实现

```
请求进入 middleware
  ↓
localhost → 直接放行（注入 admin header），跳过 RBAC
  ↓
无 JWT → 检查兜底 DEFAULT_PUBLIC_PAGES → 放行 or redirect /access-denied
  ↓
有 JWT → 本地解码 email（无网络）→ fetch /api/access-control/me（透传 CF header）
  ↓
access.publicPages 匹配 → 放行（注入 email/role header）
  ↓
role.pages 匹配   → 放行（注入 email/role/is-admin header）
  ↓
不匹配           → redirect /[defaultLocale]/access-denied
```

## 关键设计决策

1. **导入名修正**：next-intl v4 middleware 默认导出为 `createMiddleware`（非 `createIntlMiddleware`），已修正
2. **Edge Runtime 兼容**：JWT 解码用 `atob` + `TextDecoder`，不依赖 Node.js Buffer
3. **兜底公开页面**：后端不可达时用 `DEFAULT_PUBLIC_PAGES` 常量避免全站锁死
4. **60s 缓存策略**：当前用 `cache: 'no-store'`（权限敏感），可按需改为 60s revalidate
5. **路径匹配**：支持 `*`（全部）、`/*`（全部含子路径）、`/path/*`（前缀）、精确匹配

## 验证

- `npx tsc --noEmit` 零错误
- 本地开发：localhost 请求直接注入 `x-user-email: local@dev` + `x-user-role: admin`
- 生产：CF JWT → fetchMyAccess → 权限检查 → 放行或 redirect
