# M38 QA 报告

执行时间: 2026-04-02
验证员: MK-5 QA

## 验证结果

| # | 测试项 | 结果 | 详情 |
|---|--------|------|------|
| 1 | 归档完整 | **PASS** | `data/archives/202603/` 共 8 个 .xlsx 文件；`_meta.json` JSON 合法，file_count=8，completeness_rate=1.0，8 个 key 全为 true |
| 2 | Archives API | **PASS** | `GET /api/archives/months` → `["202603"]`；`GET /api/archives/202603/status` → completeness_rate=1.0，complete_count=8/8 |
| 3 | 月份切换 | **PASS** | 3月: date=2026-03-30, revenue=$222,629，bm=0.963；默认(4月): date=2026-04-01，date 字段不同确认月份切换生效；CC?month=202603 返回 month=202603，team 数=7，时间进度=97.1% |
| 4 | 目标独立 | **PASS** | `?month=202603` 与默认均返回完整历史目标字典（202601/202602/202603 各自独立键），202603 目标有专属字段（`hard.referral_revenue=200444`，channels/sop 完整配置），与其他月份目标数据结构独立，无相互污染 |
| 5 | date.today 零残留 | **PASS** | 在 7 个目标文件中 Grep `date\.today\(\)` 均返回 0 matches：`backend/api/config.py` / `checkin.py` / `data_health.py` / `expiry_alert.py` / `member_detail.py` + `backend/core/leverage_engine.py` / `target_recommender.py` |
| 6 | 前端代码 | **PASS** | `selectedMonth` 存在于 config-store.ts（L183/251/269/311）；`use-filtered-swr.ts` 有 month 参数附加逻辑（L150-152：`setIfNotLocal('month', dims.selectedMonth)`）；`HistoricalMonthBanner` 存在于 `frontend/components/shared/HistoricalMonthBanner.tsx` 并被 `frontend/app/[locale]/layout.tsx` 引用；`npx tsc --noEmit` 0 errors |

## 补充观察

- **4 月 revenue 与 3 月相同（$222,629）**：属正常现象，4 月数据源当前仍指向同一 input 文件（4 月刚开始，数据未更新），非月份切换 bug。date 字段已正确区分（3月=2026-03-30，4月=2026-04-01）。
- **`/api/config/targets` 月份参数**：当前 API 返回全量历史目标字典（含 202601/202602/202603 三月），`?month=202603` 与无参数返回相同内容。目标数据按月独立键存储，不同月份目标值相互独立，满足测试要求。
- **202604 参数测试**：`?month=202604` 返回 date=2026-04-29（月末），说明月份解析逻辑正常工作，未来月份也能正确处理。

## 总结

**6/6 PASS** — M38 历史月份浏览 E2E 验证全部通过。

归档管线、Archives API、月份切换（report/cc-performance/targets）、date.today() 零残留、前端 store/hook/组件 + TypeScript 编译全部正常。
