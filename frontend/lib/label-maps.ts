'use client';

import { useLocale } from 'next-intl';

type L = 'zh' | 'zh-TW' | 'en' | 'th';
export type LabelMap = Record<string, Record<L, string>>;

/** 统一 label 查找：后端中文 key → 当前 locale 翻译 */
export function useLabel() {
  const locale = useLocale() as L;
  return (map: LabelMap, key: string) => map[key]?.[locale] ?? map[key]?.zh ?? key;
}

export const CHANNEL_LABELS: LabelMap = {
  CC窄: { zh: 'CC窄', 'zh-TW': 'CC窄', en: 'CC Narrow', th: 'CC แคบ' },
  SS窄: { zh: 'SS窄', 'zh-TW': 'SS窄', en: 'SS Narrow', th: 'SS แคบ' },
  LP窄: { zh: 'LP窄', 'zh-TW': 'LP窄', en: 'LP Narrow', th: 'LP แคบ' },
  CC宽: { zh: 'CC宽', 'zh-TW': 'CC寬', en: 'CC Wide', th: 'CC กว้าง' },
  LP宽: { zh: 'LP宽', 'zh-TW': 'LP寬', en: 'LP Wide', th: 'LP กว้าง' },
  运营宽: { zh: '运营宽', 'zh-TW': '運營寬', en: 'Ops Wide', th: 'ปฏิบัติการ กว้าง' },
  总计: { zh: '总计', 'zh-TW': '總計', en: 'Total', th: 'รวม' },
};

export const STUDENT_TAG_LABELS: LabelMap = {
  满勤: { zh: '满勤', 'zh-TW': '滿勤', en: 'Full Attendance', th: 'เข้าเรียนครบ' },
  活跃: { zh: '活跃', 'zh-TW': '活躍', en: 'Active', th: 'กระตือรือร้น' },
  进步明显: { zh: '进步明显', 'zh-TW': '進步明顯', en: 'Improving', th: 'พัฒนาขึ้น' },
  在退步: { zh: '在退步', 'zh-TW': '在退步', en: 'Declining', th: 'ถดถอย' },
  沉睡高潜: { zh: '沉睡高潜', 'zh-TW': '沉睡高潛', en: 'Dormant HP', th: 'หยุดชะงัก' },
  超级转化: { zh: '超级转化', 'zh-TW': '超級轉化', en: 'Super Converter', th: 'แปลงสูง' },
};

export const FEASIBILITY_LABELS: LabelMap = {
  高概率达成: { zh: '高概率达成', 'zh-TW': '高概率達成', en: 'High Probability', th: 'โอกาสสูง' },
  基本可达: { zh: '基本可达', 'zh-TW': '基本可達', en: 'Achievable', th: 'บรรลุได้' },
  有挑战: { zh: '有挑战', 'zh-TW': '有挑戰', en: 'Challenging', th: 'ท้าทาย' },
  风险较大: { zh: '风险较大', 'zh-TW': '風險較大', en: 'Risky', th: 'มีความเสี่ยง' },
  难度极高: { zh: '难度极高', 'zh-TW': '難度極高', en: 'Very Hard', th: 'ยากมาก' },
};

export const BEHAVIOR_TIER_LABELS: LabelMap = {
  金牌推荐人: {
    zh: '金牌推荐人',
    'zh-TW': '金牌推薦人',
    en: 'Gold Referrer',
    th: 'ผู้แนะนำระดับทอง',
  },
  有效推荐: {
    zh: '有效推荐',
    'zh-TW': '有效推薦',
    en: 'Effective Referrer',
    th: 'ผู้แนะนำที่มีประสิทธิภาพ',
  },
  成交待跟进: {
    zh: '成交待跟进',
    'zh-TW': '成交待跟進',
    en: 'Pending Conversion',
    th: 'รอปิดการขาย',
  },
  出席待跟进: {
    zh: '出席待跟进',
    'zh-TW': '出席待跟進',
    en: 'Pending Attendance',
    th: 'รอติดตามเข้าร่วม',
  },
  高潜待激活: {
    zh: '高潜待激活',
    'zh-TW': '高潛待激活',
    en: 'High-Pot to Activate',
    th: 'ศักยภาพสูงรอกระตุ้น',
  },
  纯消耗: { zh: '纯消耗', 'zh-TW': '純消耗', en: 'Pure Consumer', th: 'บริโภคอย่างเดียว' },
  新人观望: { zh: '新人观望', 'zh-TW': '新人觀望', en: 'New Observer', th: 'มือใหม่รอดู' },
  低频参与: { zh: '低频参与', 'zh-TW': '低頻參與', en: 'Low Frequency', th: 'มีส่วนร่วมน้อย' },
};

export const CHART_LEGEND_LABELS: LabelMap = {
  成本: { zh: '成本', 'zh-TW': '成本', en: 'Cost', th: 'ต้นทุน' },
  收入: { zh: '收入', 'zh-TW': '收入', en: 'Revenue', th: 'รายได้' },
};

export const OPS_CHANNEL_LABELS: LabelMap = {
  电话: { zh: '电话', 'zh-TW': '電話', en: 'Phone', th: 'โทรศัพท์' },
  短信: { zh: '短信', 'zh-TW': '短信', en: 'SMS', th: 'SMS' },
  '电话/短信': { zh: '电话/短信', 'zh-TW': '電話/短信', en: 'Phone/SMS', th: 'โทรศัพท์/SMS' },
  'LINE OA': { zh: 'LINE OA', 'zh-TW': 'LINE OA', en: 'LINE OA', th: 'LINE OA' },
  'APP 站内推送': {
    zh: 'APP 站内推送',
    'zh-TW': 'APP 站內推送',
    en: 'App Push',
    th: 'แจ้งเตือน App',
  },
  邮件: { zh: '邮件', 'zh-TW': '郵件', en: 'Email', th: 'อีเมล' },
};
