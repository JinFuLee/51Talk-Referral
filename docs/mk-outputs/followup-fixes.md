# FollowupTab 修复组结果

## 项目 A：API 调用参数验证

**结论：已正确，无需修改。**

FollowupTab 的 query string 构建逻辑（`qs` useMemo，第 509-516 行，重构后变为 `basePath`）已经正确使用 page 级 props：
- `roleFilter` → `role=CC`
- `teamFilter` → `team=...`
- `salesSearch` → `sales=...`
- `enclosureFilter` → `enclosure=...`

API 验证：
```
curl -sf "http://localhost:8100/api/checkin/followup?role=CC&team=TH-CC01Team"
→ OK: 75 students
```

---

## 项目 B：迁移到 useFilteredSWR

**变更文件：** `frontend/components/checkin/FollowupTab.tsx`

**变更点：**
1. 移除 `import useSWR from 'swr'` 和 `import { swrFetcher } from '@/lib/api'`
2. 新增 `import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr'`
3. 将 `qs` useMemo 改为 `basePath`（不含 team，因为交给 useFilteredSWR）
4. 新增 `extraParams` useMemo（当 teamFilter 非空时传入 `{ team: teamFilter }`）
5. 将 `useSWR<FollowupResponseRaw>(url, swrFetcher)` 替换为 `useFilteredSWR<FollowupResponseRaw>(basePath, undefined, extraParams)`

**效果：**
- `useFilteredSWR` 从 config-store 自动注入全局 `focusCC`（作为 `cc` 参数），之前 useSWR 版本缺失此功能
- `teamFilter` prop 通过 `extraParams` 传入，优先级高于 config-store 的 team（buildKey 中 extra 最后处理）
- 全局筛选栏（UnifiedFilterBar）的团队切换和 CC 搜索均可同步到 FollowupTab

**类型检查：** `npx tsc --noEmit` → 0 错误

---

## 项目 C：概览 Tab roleFilter 高亮

**结论：已实现，无需修改。**

SummaryTab 已有完整实现：
- `ChannelColumn` 组件接受 `isSelected` prop（第 56 行）
- 选中时添加 `ring-2 ring-[var(--color-action,#1B365D)] rounded-lg`（第 64 行）
- 标题栏显示"▶ 当前角色"提示（第 71 行）
- page 传入 `isSelected={roleFilter ? ch.channel === roleFilter : false}`（第 226 行）

所有三个项目均已完成。
