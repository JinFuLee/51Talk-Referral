# Task #7 — login 页面 + access-denied 更新 + Topbar 用户指示

## 交付摘要

commit: f3ee6270 | 3 files changed, 166 insertions(+), 2 deletions(-)

## 变更清单

### 1. frontend/app/[locale]/login/page.tsx（新建）
- 'use client' 页面，BIZ_PAGE 居中卡片布局
- BrandMark (size=48) + 标题 + subtitle
- Email 输入框（input-base class）+ Enter 键触发登录
- btn-primary 登录按钮，loading 态显示 Loader2 spinner
- 错误提示（`--color-danger` 文字）
- fetch POST /api/access-control/login → 成功后 router.push(from || `/${locale}`)
- I18N 内联对象（zh/en），useLocale() 推断语言

### 2. frontend/app/[locale]/access-denied/page.tsx（修改）
- I18N 新增 `login` 字段（去登录 / Sign in）
- 添加"去登录"按钮（Link to `/${locale}/login`，btn-secondary）
- 联系管理员 href 从 /settings 改为 /access-control

### 3. frontend/components/layout/Topbar.tsx（修改）
- 新增 useSWR('/api/access-control/me') 获取当前用户信息
- 已登录（source !== 'local_dev'）：显示 User 图标 + 邮箱/名字（最多 120px truncate）+ LogOut 按钮
- 退出：POST /api/access-control/logout → window.location.href = `/${locale}/login`
- local_dev：显示 DEV badge（accent 配色）
- 新增 MeResponse interface，SWR onError 静默处理 401

## 验证结果

- `npx tsc --noEmit` 零错误
- prettier + eslint 通过（lint-staged 自动修复）
- git push: fe8b17b8..f3ee6270 main → main
