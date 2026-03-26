# Index Decomposition Analysis (IDA) — 公式规格文档

> 调研日期：2026-03-26 | 来源级别：B/C 级（同行评审期刊 + 机构报告）

---

## 摘要

本文档提供 Index Decomposition Analysis（IDA）的学术理论基础，覆盖 Laspeyres 加法分解、LMDI（Log Mean Divisia Index）方法、四种主流方法对比，以及在销售收入三因素分解（Volume × Conversion × Price）中的具体公式推导。

**核心结论**：主用 Laspeyres（直觉可读，运营人员理解成本低），LMDI 做校验（残差 > 3% 时自动切换）。

---

## 1. 理论背景

### 1.1 什么是 IDA

Index Decomposition Analysis（IDA）是一种将聚合量的变化分解为若干驱动因素贡献之和的统计方法。最初广泛应用于能源与碳排放研究（Ang 2004），近年延伸到销售收入、市场份额等商业分析场景。

**核心问题**：总量变化 ΔV = V_T - V_0，如何归因到各因素的贡献？

### 1.2 完美分解（Perfect Decomposition）的定义

若方法满足：

```
ΔV = Δ_factor_1 + Δ_factor_2 + ... + Δ_factor_n （无残差）
```

则称之为"完美分解"（perfect decomposition / zero residual）。这是评判各 IDA 方法优劣的核心标准之一。

---

## 2. Laspeyres 加法分解

### 2.1 来源

- 最早可追溯至 Laspeyres（1871）价格指数理论，IDA 应用由 Sun (1998) 系统化
- 在能源分解文献中被 Ang (2004) Energy Policy 32 作为基准方法讨论

### 2.2 三因素 Laspeyres 分解公式

设聚合量 V = f₁ × f₂ × f₃（三个乘法因素），则两期间变化：

```
ΔV = V_T - V_0

Laspeyres 分解：
  Δ_f1 = Δf₁ × f₂⁰ × f₃⁰          （仅 f1 变化，其他固定在基期）
  Δ_f2 = f₁⁰ × Δf₂ × f₃⁰          （仅 f2 变化，其他固定在基期）
  Δ_f3 = f₁⁰ × f₂⁰ × Δf₃          （仅 f3 变化，其他固定在基期）

残差（Residual）：
  R = ΔV - (Δ_f1 + Δ_f2 + Δ_f3)

  展开得：
  R = Δf₁×Δf₂×f₃⁰ + Δf₁×f₂⁰×Δf₃ + f₁⁰×Δf₂×Δf₃ + Δf₁×Δf₂×Δf₃
```

### 2.3 残差项成因

残差来自**因素之间的交互项**（interaction terms）：

```
两因素交互：Δf_i × Δf_j × f_k⁰  （3 项）
三因素交互：Δf₁ × Δf₂ × Δf₃   （1 项）
```

**直觉理解**：Laspeyres 假设"其他因素不变"来测量每个因素的贡献，但实际上多个因素是同时变化的，这部分同时变化产生的协同效应就是残差。

**实践意义**：残差大小与各因素相对变化幅度成正比。当各因素变化幅度小（<5% YoY）时残差通常可接受（<1%），当变化幅度大时残差可达总变化的 5-15%。

### 2.4 Sun (1998) 残差分摊方案

Sun 提出"共同创造、均等分配"原则：将残差按比例分摊回各因素贡献。但这需要额外假设，不如直接使用 LMDI 完美分解。

---

## 3. LMDI 方法（Log Mean Divisia Index）

### 3.1 来源

- **核心论文**：Ang, B.W. (2004). "Decomposition analysis for policymaking in energy: which is the preferred method?" *Energy Policy*, 32(9), 1131-1139.
- **实践指南**：Ang, B.W. (2005). "The LMDI approach to decomposition analysis: a practical guide." *Energy Policy*, 33(7), 867-871. [DOI: 10.1016/S0301-4215(03)00313-6]
- **实现指南**：Ang, B.W. (2015). "LMDI decomposition approach: A guide for implementation." *Energy Policy*, 86, 233-238.
- **Python 工具**：xiwang et al. (2022). "Python-LMDI: A Tool for Index Decomposition Analysis." *Buildings*, 12(1), 83.

### 3.2 对数均值函数（Logarithmic Mean Weight Function）

LMDI 的核心是"对数均值"权重：

```python
def L(a, b):
    """对数均值函数 — LMDI 的核心权重"""
    if a == b:
        return a  # 极限情况
    if a == 0 or b == 0:
        return 0  # 处理零值（实际实现用 δ = 1e-15 替代）
    return (a - b) / (math.log(a) - math.log(b))
```

**数学定义**：L(a, b) = (a - b) / ln(a/b)

### 3.3 LMDI 加法分解公式（Additive Form）

设 V = ∏ᵢ fᵢ（聚合量等于多个因素之积），则：

```
ΔV = V_T - V_0

各因素贡献（加法分解）：
  Δ_fᵢ = L(V_T, V_0) × ln(fᵢ_T / fᵢ_0)

其中：
  V_T = 末期聚合值，V_0 = 基期聚合值
  fᵢ_T = 末期因素 i 的值，fᵢ_0 = 基期因素 i 的值

验证：ΔV = Σᵢ Δ_fᵢ  ← 完美分解，无残差
```

### 3.4 LMDI 乘法分解公式（Multiplicative Form）

```
V_T / V_0 = ∏ᵢ Dᵢ

各因素乘法贡献：
  Dᵢ = exp[L(V_T, V_0) × ln(fᵢ_T / fᵢ_0) / L(V_T, V_0)]
     = exp[ln(fᵢ_T / fᵢ_0)]
     = fᵢ_T / fᵢ_0  ← 三因素时简化为比率之积

验证：V_T/V_0 = ∏ᵢ Dᵢ  ← 完美分解，无残差
```

### 3.5 零残差证明（直觉版）

```
设 V = f₁ × f₂ × f₃，则 ln(V) = ln(f₁) + ln(f₂) + ln(f₃)

微分：d(ln V) = d(ln f₁) + d(ln f₂) + d(ln f₃)

即：ln(V_T/V_0) = ln(f₁_T/f₁_0) + ln(f₂_T/f₂_0) + ln(f₃_T/f₃_0)

乘以权重 L(V_T, V_0)：
L(V_T, V_0) × ln(V_T/V_0) = Σ L(V_T, V_0) × ln(fᵢ_T/fᵢ_0)

由对数均值性质：L(a,b) × ln(a/b) = a - b

∴ V_T - V_0 = Σᵢ Δ_fᵢ  ← 恒等式，无残差 QED
```

### 3.6 零值处理

LMDI 公式含对数，零值需特殊处理：

```python
delta = 1e-15  # 替代零值
# 零值替换后结果收敛，Ang et al. (1998) 证明 δ ∈ [10^-10, 10^-20] 均给出满意结果
```

---

## 4. 对比分析：四种主流方法

| 方法 | 类型 | 完美分解 | 实现复杂度 | 直觉可读性 | 推荐场景 |
|------|------|---------|-----------|-----------|---------|
| **Laspeyres** | 近似 | ✗（有残差） | 低 | 高（"其他不变"直觉） | 变化幅度小（<5%）、运营解释需求高 |
| **LMDI-I** | 完美 | ✓ | 中 | 中（需解释对数均值） | 能源/碳排放、中大幅变化（5-30%） |
| **Fisher Ideal** | 完美 | ✓ | 高 | 低（Laspeyres×Paasche 几何均值） | 价格指数编制，国民账户标准 |
| **Shapley/Sun** | 完美 | ✓ | 高（组合爆炸） | 中（博弈论视角） | 因素数≤4，需要严格公平分配 |

**来源**：Decomposition analysis review, Tandfonline (2019); Ang (2004) Energy Policy

### 4.1 各方法详细对比

**Laspeyres 加法**
- **优点**：公式最简单，"固定其他因素"直觉最强，Excel 可直接实现
- **缺点**：产生交互残差，因素变化幅度越大残差越大
- **残差量级**：变化 <5% 时残差 <0.5%；变化 10-20% 时残差 2-8%

**LMDI（Ang 2004 推荐）**
- **优点**：零残差、公式独立于因素数量、通过因子逆转检验（Factor Reversal Test）和时间逆转检验（Time Reversal Test）
- **缺点**：对数均值不直觉，零值需特殊处理，结构效应在某些场景语义有争议
- **来源验证**：Ang et al. (2004) 论文通过数学证明 LMDI 满足完美分解属性

**Fisher Ideal**
- **优点**：经济理论最严格，是国民账户标准
- **缺点**：计算复杂，需要 Laspeyres×Paasche 几何均值，三因素时计算量倍增
- **应用**：IMF/世界银行 GDP 核算

**Shapley/Sun（1998）**
- **优点**：博弈论严格公平，数学上等同于枚举所有排列的平均
- **缺点**：n 个因素需 n! 次计算（3 因素=6次，4 因素=24次）
- **Ang 等人（2003）证明**：Sun (1998) 方法等价于博弈论 Shapley 值

---

## 5. 销售收入三因素分解：具体公式推导

### 5.1 业务场景定义

```
收入 Revenue = Active_Users × Conversion_Rate × Avg_Price
             = N × C × P

其中：
  N = 有效学员数（Active Users）
  C = 参与率/转化率（Conversion Rate，带来≥1注册的比例）
  P = 人均产出（Avg referrals per converted user 或 Avg Price）
```

### 5.2 Laspeyres 加法分解（主推方案）

**符号约定**：
- 上标 0 = 基期（上月/上周）
- 上标 T = 报告期（本月/本周）
- Δf = f_T - f_0

```python
def laspeyres_decompose(N0, C0, P0, NT, CT, PT):
    """
    三因素 Laspeyres 加法分解
    Revenue = N * C * P
    """
    V0 = N0 * C0 * P0  # 基期收入
    VT = NT * CT * PT  # 报告期收入
    delta_V = VT - V0

    dN = NT - N0
    dC = CT - C0
    dP = PT - P0

    # 一阶 Laspeyres 效应（单因素贡献）
    effect_N = dN * C0 * P0    # 学员规模效应
    effect_C = N0 * dC * P0    # 转化率效应
    effect_P = N0 * C0 * dP    # 人均产出效应

    # 残差（交互项之和）
    residual = delta_V - (effect_N + effect_C + effect_P)
    residual_pct = abs(residual) / abs(delta_V) if delta_V != 0 else 0

    return {
        "delta_V": delta_V,
        "effect_N": effect_N,
        "effect_C": effect_C,
        "effect_P": effect_P,
        "residual": residual,
        "residual_pct": residual_pct,
        "method": "laspeyres"
    }
```

**残差展开（用于理解来源）**：

```
R = dN×dC×P0 + dN×C0×dP + N0×dC×dP + dN×dC×dP
    ^^^^^^^^^^^   ^^^^^^^^^^^  ^^^^^^^^^^^  ^^^^^^^^^^^
    N-C 交互      N-P 交互     C-P 交互    三因素交互
```

### 5.3 LMDI 加法分解（校验方案）

```python
import math

def log_mean(a, b, delta=1e-15):
    """对数均值函数 L(a, b)"""
    a = max(a, delta)
    b = max(b, delta)
    if abs(a - b) < 1e-12:
        return a
    return (a - b) / (math.log(a) - math.log(b))

def lmdi_decompose(N0, C0, P0, NT, CT, PT):
    """
    三因素 LMDI 加法分解（零残差）
    Revenue = N * C * P

    来源：Ang (2005) Energy Policy, DOI:10.1016/S0301-4215(03)00313-6
    """
    V0 = N0 * C0 * P0
    VT = NT * CT * PT
    delta_V = VT - V0

    # 对数均值权重
    w = log_mean(VT, V0)

    # 各因素贡献（LMDI 加法）
    effect_N = w * math.log(NT / max(N0, 1e-15))
    effect_C = w * math.log(CT / max(C0, 1e-15))
    effect_P = w * math.log(PT / max(P0, 1e-15))

    # 验证：sum == delta_V（理论上精确，浮点误差 < 1e-10）
    check = effect_N + effect_C + effect_P
    residual = abs(delta_V - check)

    return {
        "delta_V": delta_V,
        "effect_N": effect_N,
        "effect_C": effect_C,
        "effect_P": effect_P,
        "residual": residual,  # 应 ≈ 0
        "residual_pct": residual / abs(delta_V) if delta_V != 0 else 0,
        "method": "lmdi"
    }
```

### 5.4 自动方法选择（残差门控）

```python
def decompose_auto(N0, C0, P0, NT, CT, PT, residual_threshold=0.03):
    """
    主方法：Laspeyres（直觉可读）
    触发切换：残差 > threshold 时自动切换 LMDI
    """
    result = laspeyres_decompose(N0, C0, P0, NT, CT, PT)

    if result["residual_pct"] > residual_threshold:
        # 残差超阈值，切换 LMDI
        result_lmdi = lmdi_decompose(N0, C0, P0, NT, CT, PT)
        result_lmdi["switched_from"] = "laspeyres"
        result_lmdi["switch_reason"] = f"残差 {result['residual_pct']:.1%} > {residual_threshold:.0%}"
        return result_lmdi

    return result
```

### 5.5 三因素分解业务解读

```
月度收入变化分解示例：

上月：N=500学员, C=15%, P=3.2人/人  → V₀ = 500×0.15×3.2 = 240 leads
本月：N=480学员, C=17%, P=3.5人/人  → V_T = 480×0.17×3.5 = 285.6 leads
总变化：ΔV = +45.6 leads

Laspeyres 分解：
  学员规模效应：(-20) × 0.15 × 3.2 = -9.6 leads   ← 学员减少 20 人，损失 9.6 leads
  参与率效应：500 × 0.02 × 3.2  = +32.0 leads   ← 参与率提升 2pp，贡献 32 leads
  人均产出效应：500 × 0.15 × 0.3 = +22.5 leads  ← 人均产出提升，贡献 22.5 leads
  一阶合计：                        +44.9 leads
  残差：                             +0.7 leads（= 1.5%，在可接受范围）
```

---

## 6. 残差处理最佳实践

### 6.1 何时残差可接受

| 场景 | 各因素 MoM 变化幅度 | 预期残差比例 | 建议方法 |
|------|-------------------|------------|---------|
| 稳定运营期 | < 5% | < 0.5% | Laspeyres（直觉优先） |
| 正常波动 | 5-10% | 0.5-3% | Laspeyres（残差注释） |
| 大幅波动 | 10-20% | 3-8% | **自动切换 LMDI** |
| 极端变化 | > 20% | > 8% | LMDI（强制） |

**阈值来源**：残差计算公式推导（来源级别 D — 经验推导），建议 3% 为切换点（生产后 30 天用实测数据校准）。

### 6.2 何时应切换 LMDI

自动切换触发条件（任一满足）：
1. `|residual| / |ΔV| > 3%`
2. 任一因素变化幅度 > 15%（如疫情/假期导致的突变）
3. 残差方向与总变化方向相反（可能误导解读）

### 6.3 向非技术用户解释残差

```
"学员规模、参与率、人均产出这三个因素同时变化时，
它们之间有'协同效应'——比如学员增多同时参与率也提升，
这部分叠加效应无法单独归因到某一个因素，
我们将它单独展示为'交叉效应'（本月：+0.7 leads，占 1.5%）。
当这个数字 > 3% 时，我们切换到更精确的 LMDI 方法。"
```

---

## 7. 推荐方案（ref-ops-engine 实施决策）

### 7.1 技术选型

```
主方法：Laspeyres 加法分解
  理由：
  - 运营人员直觉最强（"固定其他变量"可直接解释给 TL/CC）
  - 公式简单，Excel 可复现，不依赖对数运算
  - 当月变化通常 <10%（泰国团队），残差在可接受范围

校验方法：LMDI 加法分解
  触发：残差 > 3%（自动切换，对用户透明）
  原因：保证数学完整性，大波动期（寒暑假/活动月）必须无残差
```

### 7.2 实施规范

```python
# 分解结果标准输出格式
DecompositionResult = {
    "method": "laspeyres" | "lmdi",
    "delta_V": float,          # 总变化量
    "effect_N": float,         # 规模效应
    "effect_C": float,         # 转化率效应
    "effect_P": float,         # 人均产出效应
    "residual": float,         # 残差（Laspeyres 专有）
    "residual_pct": float,     # 残差比例（用于切换判定）
    "switched_from": str,      # 如发生切换，记录原方法
    "switch_reason": str,      # 切换原因
}
```

### 7.3 展示规范

瀑布图（Waterfall Chart）展示顺序：
1. 基期收入（V₀）
2. ± 规模效应（学员数变化）
3. ± 参与率效应
4. ± 人均产出效应
5. ± 残差/交叉效应（仅 Laspeyres 时展示）
6. 报告期收入（V_T）

验证规则：步骤 2+3+4+5 必须等于 V_T - V₀。

---

## 8. 参考文献

| # | 来源 | 级别 | 链接 |
|---|------|------|------|
| 1 | Ang, B.W. (2004). *Energy Policy*, 32(9), 1131-1139. LMDI 方法推荐论文 | B | [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0301421503003136) |
| 2 | Ang, B.W. (2015). *Energy Policy*, 86, 233-238. LMDI 实现指南 | B | [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0301421515300173) |
| 3 | xiwang et al. (2022). Python-LMDI. *Buildings*, 12(1), 83. Python 工具 | B | [MDPI](https://www.mdpi.com/2075-5309/12/1/83) |
| 4 | Heun, M. & Brockway. LMDIR R Package. 含 LMDI 公式推导 | C | [GitHub](https://matthewheun.github.io/LMDIR/articles/LMDIR.html) |
| 5 | Decomposition analysis: when to use which method? *Economic Systems Research* (2019) | B | [Tandfonline](https://www.tandfonline.com/doi/full/10.1080/09535314.2019.1652571) |
| 6 | Sun, J.W. (1998). Changes in energy consumption and energy intensity: a complete decomposition model. *Energy Economics*, 20(1), 85-100. Sun 方法 | B | — |
| 7 | PMC LMDI 误读讨论与 MESE 替代方法 | B | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9061863/) |
| 8 | Price-Volume-Mix Waterfall 方法论（QuickAI/Shapley 均值方案）| C | [Medium](https://medium.com/quickai-app/how-to-do-the-price-volume-mix-waterfall-right-6723f5ed2920) |
| 9 | FTI Consulting PVM Analysis White Paper | C | [FTI](https://www.fticonsulting.com/insights/white-papers/quantifiable-approach-price-volume-mix-analysis) |
| 10 | Generalized Fisher index or Siegel-Shapley decomposition? (2009) *Energy Economics* | B | [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0140988309000401) |

---

*文档生成时间：2026-03-26 | 调研 agent：research-agent (Sonnet 4.6)*
