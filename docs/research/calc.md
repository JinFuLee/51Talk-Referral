# 三 CLI 路由分计算说明

## 1. 输入工件

- 指标口径：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/metrics/schema.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/metrics/schema.csv)
- 原始打分：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/scores_by_cli.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/scores_by_cli.csv)

## 2. StageScore 公式

对任一 CLI、任一阶段：

`StageScore = Σ(raw_score × criterion_weight) / 5`

其中：
- `raw_score` 取值 `0..5`
- `criterion_weight` 在各阶段内求和为 `1.00`
- 除以 `5` 是把结果归一到 `0..1`

## 3. 实算结果

### Research

- Claude Code:
  - `(3×0.50 + 4×0.15 + 3×0.10 + 3×0.10 + 5×0.10 + 4×0.05) / 5`
  - `= 3.40 / 5 = 0.68`
- Codex:
  - `(3×0.50 + 4×0.15 + 3×0.10 + 4×0.10 + 4×0.10 + 5×0.05) / 5`
  - `= 3.45 / 5 = 0.69`
- Gemini CLI:
  - `(5×0.50 + 5×0.15 + 5×0.10 + 5×0.10 + 4×0.10 + 3×0.05) / 5`
  - `= 4.80 / 5 = 0.96`

### Review

- Claude Code: `4.90 / 5 = 0.98`
- Codex: `4.10 / 5 = 0.82`
- Gemini CLI: `3.20 / 5 = 0.64`

### Delivery

- Claude Code: `4.00 / 5 = 0.80`
- Codex: `4.60 / 5 = 0.92`
- Gemini CLI: `3.50 / 5 = 0.70`

## 4. Composite Route Score 公式

`Composite Route Score = 0.25 × Research + 0.30 × Review + 0.45 × Delivery`

### 推荐路线 `Gemini -> Claude -> Codex`

- `0.25×0.96 + 0.30×0.98 + 0.45×0.92`
- `= 0.240 + 0.294 + 0.414`
- `= 0.948`
- 四舍五入后为 `0.95`

### 单 CLI 对照

- Claude-only: `0.25×0.68 + 0.30×0.98 + 0.45×0.80 = 0.824`
- Codex-only: `0.25×0.69 + 0.30×0.82 + 0.45×0.92 = 0.833`
- Gemini-only: `0.25×0.96 + 0.30×0.64 + 0.45×0.70 = 0.747`

## 5. 敏感性检查（阶段权重 ±10%）

目标：验证“推荐路线胜出”是否仅由某一组权重偶然导致。

### Case A

- 权重：Research `0.275`，Review `0.27`，Delivery `0.455`
- 推荐路线得分：`0.275×0.96 + 0.27×0.98 + 0.455×0.92 = 0.947`

### Case B

- 权重：Research `0.225`，Review `0.33`，Delivery `0.445`
- 推荐路线得分：`0.225×0.96 + 0.33×0.98 + 0.445×0.92 = 0.949`

结论：在权重做 ±10% 摆动时，推荐路线仍保持最高分，说明推荐不是偶然。

## 6. 最小权重校准证明

- 网格结果：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/weight_grid.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/weight_grid.csv)
- 参数化范围：Research `0.20..0.30`，Review `0.25..0.35`，步长 `0.05`，Delivery 取剩余权重
- 结论：在局部权重网格中，`0.25 / 0.30 / 0.45` 不是唯一可行组合，但稳定保持推荐路线为最优，且 Delivery 权重最高，符合 SEE 的交付优先原则。

## 7. Monte Carlo 不确定性

- 扰动模型：对每个 `raw_score` 施加 `±0.5` 均匀扰动，裁剪到 `0..5`
- 运行次数：`5000`
- 结果：[/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/monte_carlo_route.csv](/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research/monte_carlo_route.csv)
- 推荐路线区间：`0.929 [0.904, 0.948]`
- 最佳单 CLI 区间：`Codex-only = 0.824 [0.793, 0.852]`
- 结论：在扰动下推荐路线仍保持最高均值与最高下界。

## 8. 验证命令

```bash
python3 reliability_calc.py
python3 compute_traceability.py
python3 contradictions_calc.py
python3 route_selector.py
python3 monte_carlo_route.py
```
