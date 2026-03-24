// SEE Design System v2.0 Chart Palette
// Recharts 需要 hex 值，不能直接用 CSS 变量
// 这些值从 globals.css 的 --brand-* / --n-* / 语义状态色提取

export const CHART_PALETTE = {
  // 品牌主色（forest-ops）
  primary: '#3D8B6B', // --brand-p1
  secondary: '#2F6D53', // --brand-p2
  accent: '#4DA882', // --accent-spark

  // Warm Neutral
  muted: '#D4D4C4', // --n-300
  subtle: '#A3A38E', // --n-400
  border: '#E8E7E1', // --n-200

  // 语义状态
  success: '#10b981', // emerald-500
  warning: '#F59E0B', // amber-500
  danger: '#EF4444', // red-500
  info: '#3B82F6', // blue-500

  // 轴 / 网格标签
  axisLabel: '#737360', // --n-500
  axisTick: '#A3A38E', // --n-400
  grid: '#E8E7E1', // --n-200

  // 多系列（按使用频率排列）
  series: [
    '#3B82F6', // 0: blue-500   (CC)
    '#8B5CF6', // 1: violet-500 (SS)
    '#F59E0B', // 2: amber-500  (LP)
    '#10B981', // 3: emerald-500
    '#3D8B6B', // 4: brand-p1
    '#EF4444', // 5: red-500
    '#6366F1', // 6: indigo-500
    '#22C55E', // 7: green-500
  ],

  // 象限标注专用
  quadrant: {
    star: '#22C55E', // 明星CC
    latent: '#3B82F6', // 潜力CC
    lowEff: '#F59E0B', // 低效高收
    inactive: '#EF4444', // 待激活
  },
} as const;
