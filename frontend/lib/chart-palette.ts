// SEE Design System v2.0 Chart Palette
// Recharts 需要 hex 值，不能直接用 CSS 变量
// 这些值与 globals.css 中 --chart-*-hex / 品牌 token 完全对齐

export const CHART_PALETTE = {
  // 51Talk 品牌图表五色（与 globals.css --chart-*-hex 完全一致）
  c1: '#ffd100', // 金黄   —— 主色
  c2: '#1b365d', // 深蓝   —— 副色
  c3: '#e8932a', // 暖橙   —— 第三
  c4: '#2d9f6f', // 翡翠绿 —— 成功
  c5: '#e05545', // 珊瑚红 —— 危险

  // Warm Neutral 轴/网格
  axisLabel: '#737360', // --n-500
  axisTick: '#a3a38e', // --n-400
  grid: '#e8e7e1', // --n-200
  secondary: '#a3a38e', // --n-400（次要文本/点/描边）
  border: '#e8e7e1', // --n-200（图表内边框/网格线）

  // 语义状态（与品牌体系对齐）
  success: '#2d9f6f', // --color-success（翡翠绿）
  warning: '#e8932a', // --color-warning（暖橙）
  danger: '#e05545', // --color-danger（珊瑚红）
  info: '#1b365d', // --color-info（深蓝）
  neutral: '#a3a38e', // --n-400

  // 多系列（按角色语义排列）
  series: [
    '#ffd100', // 0: 金黄   chart-1
    '#1b365d', // 1: 深蓝   chart-2
    '#e8932a', // 2: 暖橙   chart-3
    '#2d9f6f', // 3: 翡翠绿 chart-4
    '#e05545', // 4: 珊瑚红 chart-5
    '#5576a8', // 5: 深蓝中 --color-accent-muted
    '#737360', // 6: 暖灰   --n-500
    '#a3a38e', // 7: 浅灰   --n-400
  ],

  // 角色专用色（CC/SS/LP 固定色映射）
  role: {
    CC: '#ffd100', // 金黄
    SS: '#1b365d', // 深蓝
    LP: '#e8932a', // 暖橙
  },

  // 象限标注专用
  quadrant: {
    star: '#2d9f6f', // 明星CC（翡翠绿）
    latent: '#1b365d', // 潜力CC（深蓝）
    lowEff: '#e8932a', // 低效高收（暖橙）
    inactive: '#e05545', // 待激活（珊瑚红）
  },
} as const;
