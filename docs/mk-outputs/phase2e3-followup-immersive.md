# Phase 2e + Phase 3 交付报告

## 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/components/checkin/FollowupTab.tsx` | 修改 | Phase 2e 全部增强 |
| `frontend/lib/hooks/useMyView.ts` | 新建 | URL↔Zustand 双向同步 hook |
| `frontend/components/checkin/MyViewBanner.tsx` | 新建 | 视角提示条组件 |
| `frontend/app/checkin/page.tsx` | 修改 | 智能路由 + MyViewBanner |

## Phase 2e — FollowupTab 增强

### 新增列（共从 9 列扩展为 14 列）

| 列名 | 数据来源 | 说明 |
|------|---------|------|
| 激活 | `computeActivationScore(daysLast, lesson)` | 0-100 分，绿/黄/红圆点 |
| 本月打卡 | `extra["本月打卡天数"]` | N/6 格式，0 显示灰色 |
| 上月打卡 | `extra["上月打卡天数"]` | N/6 格式 |
| 标签 | `computeClientTags(...)` → `<StudentTagBadge>` | 满勤/活跃/进步明显/在退步/沉睡高潜/超级转化 |

### CC 末次联系增强

- `>14天`: 红色 + "需联系" pill
- `7-14天`: 黄色
- `<7天`: 绿色
- `null`: 破折号

### 分群子 Tab

- **全部**（默认）
- **从未打卡**: 本月 === 0 AND 上月 === 0
- **曾打卡本月未打**: 上月 > 0 AND 本月 === 0
- **打过但今天没打**: 本月 > 0

纯前端过滤，不调用后端 API。

### "只看我的"按钮

当全局 `focusCC` 有值时，FollowupTab 顶部显示提示条 + 按钮，点击后将 `focusCC` 填入 `salesSearch`，直接过滤出该 CC 负责的未打卡学员。

## Phase 3 — 岗位沉浸式

### useMyView.ts

URL → Zustand mount-only 同步。支持深度链接：
- `?cc=张伟` → `focusCC = "张伟"` → 默认 Tab 为 `followup`
- `?team=THCC-A` → `teamFilter = "THCC-A"` → 默认 Tab 为 `team_detail`

### MyViewBanner.tsx

- 当 `focusCC` 或 `teamFilter` 有值时在 PageTabs 上方显示
- "清除视角"按钮：同时清除 Zustand + URL params

### page.tsx 智能路由逻辑

```
?tab=xxx   → 使用显式 tab
?cc=xxx    → followup
?team=xxx  → team_detail
(default)  → followup
```

## 验收

- `npx tsc --noEmit`: 零错误
- Commit: `8210cc2a`
- Push: `main -> main`
