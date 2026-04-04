/**
 * KPI 下钻映射配置
 * 定义每个 KPI key 对应的详情页面路由和按钮文案
 */

export interface DrilldownTarget {
  href: string;
  label: string;
}

export const kpiDrilldownMap: Record<string, DrilldownTarget> = {
  // 注册类指标（注册人数=转介绍用户数=ref leads）
  registrations: {
    href: '/biz/leads-detail',
    label: '查看 Leads 明细 ->',
  },

  // 付费类指标
  payments: {
    href: '/ops/funnel-detail',
    label: '查看付费漏斗 →',
  },

  // 收入类指标
  revenue: {
    href: '/biz/orders-detail',
    label: '查看订单详情 →',
  },

  // Leads 类指标
  leads: {
    href: '/biz/leads-detail',
    label: '查看 Leads 明细 →',
  },

  // 效率指标
  checkin_rate: {
    href: '/ops/kpi-north-star',
    label: '查看打卡率分析 →',
  },
  contact_rate: {
    href: '/ops/outreach',
    label: '查看外呼分析 →',
  },
  participation_rate: {
    href: '/ops/kpi-north-star',
    label: '查看参与率分析 →',
  },
  conversion_rate: {
    href: '/ops/funnel-detail',
    label: '查看转化漏斗 →',
  },

  // 产能
  productivity: {
    href: '/ops/productivity-history',
    label: '查看产能趋势 →',
  },

  // 留存
  retention: {
    href: '/ops/retention-rank',
    label: '查看留存排名 →',
  },
};
