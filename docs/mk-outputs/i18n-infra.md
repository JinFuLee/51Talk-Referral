# MK-1 产出：next-intl 基础设施

## 完成状态
构建验证：✓ 143 pages × 4 locales = 572 static routes, 0 errors
Commit：85a61135

## 变更清单

### 新建文件
- `frontend/i18n/routing.ts` — locales 配置，defaultLocale=zh
- `frontend/i18n/request.ts` — getRequestConfig，locale fallback 逻辑
- `frontend/i18n/navigation.ts` — createNavigation 封装
- `frontend/middleware.ts` — createMiddleware + 静态资源排除 matcher
- `frontend/messages/{zh,en,zh-TW,th}.json` — 4 语言种子翻译
- `frontend/app/[locale]/layout.tsx` — Locale layout（NextIntlClientProvider + 全部 UI 组件）

### 修改文件
- `frontend/next.config.mjs` — createNextIntlPlugin 包装
- `frontend/app/layout.tsx` — Root layout 精简（html/body/fonts/globals.css，移除 HtmlLangUpdater）
- `frontend/.eslintrc.json` — 添加 @typescript-eslint plugin（解决 pre-existing 规则缺失）
- `frontend/app/[locale]/knowledge/page.tsx` — useSearchParams() 包在 Suspense 内（SSG 兼容）

### 目录重构
`app/{31 dirs}` → `app/[locale]/{31 dirs}` 通过 git mv，保留完整 git 历史

## 盲区发现
knowledge/page.tsx 的 `useSearchParams()` 在 SSG 路由下必须有 Suspense 边界。
移到 `[locale]/` 后 SSG 开始生成所有 locale，这个 pre-existing bug 被暴露。已修复。

## 下游影响（MK-2/3/4 需注意）
1. 所有 `useRouter/usePathname/redirect` 若需要 locale-aware，应从 `@/i18n/navigation` 导入而非 `next/navigation`
2. 服务端组件若需读取 locale，用 `getLocale()` from `next-intl/server`
3. 每个新增页面的服务端 props 需调用 `setRequestLocale(locale)` 以支持 SSG
