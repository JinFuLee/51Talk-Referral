# ROI 分析模块实现报告

## 交付状态：✓ 完成（已随 ab412fda commit 入库）

## 新增文件
| 文件 | 说明 |
|------|------|
| `backend/api/checkin_roi.py` | ROI 分析 API，`GET /api/checkin/roi-analysis` |
| `config/roi_cost_rules.json` | 次卡成本规则配置（.gitignore 范围内，不入库） |
| `frontend/lib/types/checkin-roi.ts` | TypeScript 类型：RoiAnalysisResponse、RiskLevel 等 |
| `frontend/components/checkin/RoiAnalysisTab.tsx` | 主 Tab 容器，3 子面板切换 |
| `frontend/components/checkin/RoiDashboard.tsx` | 全局仪表盘：汇总卡片 + 饼图 + 条形图 |
| `frontend/components/checkin/RoiStudentTable.tsx` | 学员 ROI 排行：风险筛选 + 排序 + CSV 导出 |
| `frontend/components/checkin/RoiChannelMatrix.tsx` | 渠道 ROI 矩阵：CC/SS/LP/宽口 4 渠道 |

## 修改文件
| 文件 | 变更 |
|------|------|
| `backend/main.py` | 注册 checkin_roi 路由 `"checkin_roi": ("backend.api.checkin_roi", "/api", ["checkin-roi"])` |
| `frontend/app/[locale]/checkin/page.tsx` | TABS 新增 `{ id: 'roi', label: 'ROI 分析' }`，渲染 RoiAnalysisTab |

## 核心业务逻辑

### 次卡成本公式
```
活动次卡 = ACTIVITY_MAP[min(max(打卡天数, 转码次数), 6)]
  0→0, 1→1, 2→2, 3→3, 4→4, 5→6, 6→8
绑定次卡 = 推荐注册人数 × 1
出席次卡 = 推荐出席人数 × 2
付费次卡 = 推荐付费数 × 3
总成本 = 总次卡 × $1.34 USD
```

### 四级风险分层
- 🟢 high_value: 收入 ≥ 成本×3（ROI ≥ 200%）
- 🟡 normal: 收入 ≥ 成本（ROI 0-200%）
- 🟠 focus: 有推荐但收入 < 成本
- 🔴 pure_freeloader / high_value_freeloader / newcomer: 零推荐零付费分层

## 验收项
- [x] `backend.api.checkin_roi` 可导入，路由数 = 1
- [x] TypeScript 零编译错误（`npx tsc --noEmit`）
- [x] ruff lint 零错误（E501 行长度已修复）
- [x] 三个子面板（仪表盘/学员排行/渠道矩阵）
- [x] loading/error/empty 三态完整
- [x] globals.css Design Token 类完整引用
- [x] 满勤学员(6次) 活动次卡 = 8（4×1 + 2×2，ACTIVITY_MAP[6]=8）
- [x] CSV 导出功能
