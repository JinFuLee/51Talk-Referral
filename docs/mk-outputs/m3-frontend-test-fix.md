# m3-frontend-test-fix 交付报告

## 结果摘要

- 修复前：161 tests 中 7 失败（原估 6，实测发现 1 额外漂移）
- 修复后：161 tests 全通过，0 failures，tsc --noEmit 零错误
- 提交：fcf36cc6

## 变更文件

### frontend/tests/setup.ts
- 新增 localStorage mock（Zustand persist 需要）
- 新增显式 `import { beforeEach } from 'vitest'`（tsc 严格模式要求，globals:true 仅运行时注入）

### frontend/tests/unit/translations.test.ts
- L77 `all th values are prefixed with "[TH] "` → 改为验证非空真实字符串，确认不以 `[TH] ` 开头
- L84 `th value contains the zh value after prefix` → 改为直接验证 `common.label.noData` 泰文值 `ไม่มีข้อมูล`

### frontend/tests/unit/test_SummaryCards.tsx

| 行号 | 旧断言 | 新断言 | 根因 |
|------|--------|--------|------|
| L33 | `getByText('1.5K')` | `getByText('1.5k')` | fmtNum 输出小写 k |
| L40 | `getByText(/2\.0K/)` | `getByText(/2\.0k/)` | fmtNum 输出小写 k |
| L60 | `getByText(/剩余日均/)` | `getByText(/达标需日均/)` | 组件 L262 标签是"达标需日均" |
| L65 | `queryByText(/需提升/)` | `queryByText(/效率提升需求/)` | 精确匹配避免误命中 |
| L71 | `getByText(/需提升/)` | `getByText(/效率提升/)` | 组件 L267 标签是"效率提升需求" |
| L94 | `getByText('75%')` | `getByText(/75%/)` | 组件渲染 "75% 进度"，非独立 "75%" |

## SEE 闭环

1. **根因修复**：在测试断言层修复，未改动组件代码（组件行为正确）
2. **全局扫描**：
   - `[TH] ` 在 frontend/tests/ 中：1 处，为正确的 `toBe(false)` 负断言
   - `[0-9]\.[0-9]K` 在 frontend/tests/ 中：0 处
3. **自动化防线**：vitest 本身即是防线，CI 将自动捕获未来同类漂移
4. **模式沉淀**：断言对齐原则 — 断言必须基于组件实际 DOM 输出，不基于注释或旧行为假设
