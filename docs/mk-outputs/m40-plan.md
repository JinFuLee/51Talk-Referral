# M40 Plan: Token 化 + 模块化改造

## 段 1. 问题定义

**Before**:
- 2875 处 Tailwind arbitrary value（`bg-[#...]` / `text-[#...]`）分布在 201 个文件
- 50 处硬编码 hex 色值，100 处内联 `style={{}}`
- 语义 CSS class 采纳率仅 3.3%（98/2973）
- `useFilteredSWR` 仅 7 处/3 文件（M37 框架前端未闭环）
- globals.css 1283 行单文件
- i18n 覆盖 ~103/204 文件（50.5%）

## 段 2. 终态定义

**After**:
- arbitrary value ≤50 处（不可避免的动态值）
- 硬编码 hex = 0，内联 style ≤15（动态计算值）
- 语义 class 采纳率 ≥80%
- `useFilteredSWR` 覆盖全部数据获取页面（~35 个）
- globals.css 拆为 ≤200 行入口 + 8 个 `@import` 模块
- ESLint 自定义规则拦截 arbitrary value + 直接 useSWR
- i18n 覆盖 204/204 文件（100%）

**验收命令**:
```bash
# arbitrary value 计数
grep -rn 'bg-\[#\|text-\[#\|border-\[#' frontend/ --include="*.tsx" | wc -l  # ≤50
# 直接 useSWR（非 useFilteredSWR）
grep -rn 'useSWR[^F]' frontend/ --include="*.tsx" | grep -v node_modules | grep -v use-filtered-swr | wc -l  # ≤10
# globals.css 行数
wc -l < frontend/app/globals.css  # ≤200
# ESLint 规则存在
cat frontend/.eslintrc.json | jq '.rules["no-arbitrary-color"]'  # not null
```

## 段 3. Tag 拆解

| Tag | 任务 | 模块数 | Agent 数 | 预估文件数 | 依赖 |
|-----|------|--------|---------|-----------|------|
| A: 基建层 | globals.css 模块化 + token 扩展 + ESLint 规则 + 组件模板 | 4 | 1 MK | ~15 | 无（第一个执行） |
| B: 数据层 | useFilteredSWR 全站推广 | 1 | 2 MK（按页面域分组） | ~40 | A（token 就绪后） |
| C: 样式层 | arbitrary value → semantic token 批量替换 | 5 域 | 3 MK（并行按域） | ~130 | A（token + ESLint 就绪后） |
| D: i18n 层 | 剩余 ~101 文件 4 语言覆盖 | 3 | 2 MK（并行按域） | ~101 | A（模块化后结构稳定） |

**依赖图**:
```
A（基建）→ B（数据层）
         → C（样式层）  ← 并行
         → D（i18n）    ← 并行
```

**C 域拆分**:
- C1: components/analytics + components/slides（~25 文件）
- C2: components/checkin + components/dashboard（~25 文件）
- C3: components/layout + components/ui + components/shared（~30 文件）
- C4: app/[locale]/**（~50 页面文件）
- C5: 其余组件域（~20 文件）

## 段 4. 模型路由

| MK | 模型 | Effort | 理由 |
|-----|------|--------|------|
| A-infra | Sonnet | high | 代码执行类，基建修改 |
| B-fetcher-1/2 | Sonnet | high | 代码执行类，页面迁移 |
| C-style-1/2/3 | Sonnet | high | 代码执行类，批量替换 |
| D-i18n-1/2 | Sonnet | high | 代码执行类，翻译覆盖 |
| TL | Opus | medium | 调度协调 |
| QA | Opus | high | 判断类验收 |

## 段 5. 风险预判

| 风险 | 概率 | 缓解 | 回退方案 |
|------|------|------|---------|
| 批量替换破坏 UI 外观 | 高 | 每个 C-MK 完成 1 域后 commit checkpoint → QA 对比 Before 截图（首页/dashboard/checkin/analytics/settings 5 页，Before 基准在 Tag A 完成时截取） | `git revert` 到最近 checkpoint commit |
| useFilteredSWR 迁移导致参数 bug | 中 | B-MK 逐页面 `curl` 对比迁移前后 API 返回 JSON diff | `git revert` 单页面 commit |
| ESLint 规则误报 | 低 | A-MK 先在 10 个文件 dry-run（`--fix-dry-run`），确认 0 误报后全局启用 | 降级为 warning 而非 error |
| C/D Tag 并行修改 app/[locale]/ 文件冲突 | 中 | C Tag 修改 className（样式），D Tag 修改 `t()` 调用（i18n），两者编辑不同代码行。TL 在分配时确保 C/D 的 mutable_files 无重叠页面：C 管组件文件，D 管页面文件中的 i18n 部分。CSFL 段级锁兜底。 | 冲突时 D-MK 等 C-MK 该文件 commit 后 rebase |

**Git 策略**: Tag A 完成后打 `git tag m40-infra-baseline`。每个 C-MK 域完成后 commit（checkpoint）。全部完成后 squash 为 1 个里程碑 commit。

## 段 6. 验收计划

**QA 策略**: 每 Tag 完成后独立 QA（Opus high 判断类）

**完整验收命令**:
```bash
# V1: arbitrary value 计数（目标 ≤50）
grep -rn 'bg-\[#\|text-\[#\|border-\[#' frontend/ --include="*.tsx" | wc -l

# V2: 直接 useSWR（目标 ≤10，豁免：hook 定义文件/config-store）
grep -rn 'useSWR[^F]' frontend/ --include="*.tsx" | grep -v node_modules | grep -v use-filtered-swr | grep -v use-compare-data | grep -v config-store | wc -l

# V3: globals.css 入口行数（目标 ≤200）
wc -l < frontend/app/globals.css

# V4: ESLint 规则存在
cat frontend/.eslintrc.json | jq '.rules["no-arbitrary-color"]'

# V5: useFilteredSWR 覆盖率（目标 ≥90% 数据获取页面 = ≥32/35）
grep -rn 'useFilteredSWR' frontend/app/ --include="*.tsx" -l | wc -l

# V6: i18n 覆盖率（目标 204/204）
grep -rn "useTranslations\|getTranslations" frontend/ --include="*.tsx" -l | wc -l

# V7: 语义 class 采纳率（目标 ≥80%，= card-base/btn-primary 等出现频次 vs 总组件数）
grep -rn "card-base\|btn-primary\|btn-secondary\|input-base\|state-" frontend/ --include="*.tsx" -l | wc -l

# V8: 构建零错误
cd frontend && pnpm build

# V9: Lint 零错误
cd frontend && pnpm lint
```

**SEE 闭环验收**:
- 步骤 2（全局扫描）: V1 命令 = 全局扫描 arbitrary value 同模式
- 步骤 3（自动化防线）: V4 命令 = ESLint 规则存在性验证
- 步骤 4（模式沉淀）: 验证 CLAUDE.md/error-prevention.md 已更新 + 设计体系 SSoT 文档已同步

## 段 7. Token 预算

| Tag | 预算 |
|-----|------|
| A 基建 | 80K |
| B 数据层（2 MK） | 120K |
| C 样式层（3 MK） | 200K |
| D i18n（2 MK） | 120K |
| TL + QA | 80K |
| **总计** | **~600K** |

## 段 8. 文件范围

| Tag | mutable_files |
|-----|-------------|
| A | `frontend/app/globals.css`, `frontend/app/globals/*.css`(新建), `frontend/.eslintrc.json`, `frontend/.claude/templates/`(新建) |
| B | `frontend/app/[locale]/**/page.tsx`, `frontend/lib/hooks/use-filtered-swr.ts` |
| C | `frontend/components/**/*.tsx`, `frontend/app/[locale]/**/*.tsx` |
| D | `frontend/messages/*.json`, `frontend/app/[locale]/**/*.tsx`, `frontend/components/**/*.tsx` |

## 段 9. 基建就绪度

| 检查项 | 状态 | 行动 |
|--------|------|------|
| Design token 体系 | ✓ 已有（globals.css 1283 行含 token） | Tag A 模块化拆分 |
| 语义 CSS class | ✓ 已有（card-base/btn-primary 等 8 个） | Tag A 扩展到覆盖全部 UI 模式 |
| ESLint 拦截规则 | ✗ 不存在 | **Tag A 必须先建** |
| useFilteredSWR 框架 | ✓ 已有（3 文件使用） | Tag B 推广 |
| 组件模板 | ✗ 不存在 | Tag A 建 |
| i18n 框架 | ✓ 已有（next-intl 配置完整） | Tag D 补翻译 |

**结论**：ESLint 规则和组件模板是 Tag A 必建的基建，其余已就绪。Tag A 是整个里程碑的地基。

## 段 10. SEE 闭环 + 模式沉淀计划

**4 步闭环**:
1. **根因修复**: 2875 处 arbitrary value → semantic token（Tag C 执行）
2. **全局扫描**: V1/V2/V5/V6/V7 验收命令覆盖全项目（段 6 执行）
3. **自动化防线**: ESLint `no-arbitrary-color` 规则 + `no-direct-useswr` 规则（Tag A 建，commit 后立即生效）
4. **模式沉淀**:
   - 更新 `CLAUDE.md` §SEE Design System v2.0：标注"M40 已完成 token 化，ESLint 规则自动拦截回退"
   - 更新 `error-prevention.md`：将"Tailwind arbitrary value 不稳定"从 🟡 升级为 🔴（有自动化防线后可强制）
   - 更新 `globals.css` 文件头注释：标注模块化结构 + 修改指引
   - 写入 `observe/events.jsonl` T0 基线（arbitrary value 计数 Before/After）

**Commit 颗粒度**:
```
Tag A 完成 → commit "feat(m40): infrastructure - globals modular + eslint rules + templates"
           → git tag m40-infra-baseline
           → 截取 Before 截图（5 页面基准）
Tag B 域 1 → commit "feat(m40): useFilteredSWR migration - analytics/dashboard/checkin"
Tag B 域 2 → commit "feat(m40): useFilteredSWR migration - remaining pages"
Tag C 域 1-5 → 每域 1 commit "feat(m40): token migration - {domain}"
Tag D 域 1-3 → 每域 1 commit "feat(m40): i18n coverage - {domain}"
全部完成 → QA 验收 → push
```

## 段 11. 复利资产产出清单

| 资产 | 类型 | 复用范围 | 自进化设计 |
|------|------|---------|-----------|
| ESLint `no-arbitrary-color` | 执行层 | 本项目所有未来 commit | 阈值从 ≤50 起步，/self-optimize 按季度检查，趋势归零则收紧为 ≤10 |
| ESLint `no-direct-useswr` | 执行层 | 本项目所有未来页面 | 新页面自动被拦截 |
| globals.css 8 模块结构 | 基建层 | 本项目 + 可作 init-infra-scaffold.sh 模板 | 新模块通过 @import 自动加入 |
| 组件模板（component.tsx.template） | 基建层 | 本项目新组件 + init-project Stage 3c | 模板随 globals.css token 更新自动反映 |
| Before/After 截图基准 | 验证层 | 后续 UI 改造的视觉回归测试 | — |
