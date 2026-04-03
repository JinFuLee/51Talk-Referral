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
  // 窄口径 = Lead 来自特定销售岗位（CC/SS/LP 员工绑定学员带来的 lead）
  CC窄: { zh: 'CC窄', 'zh-TW': 'CC窄', en: 'CC Narrow', th: 'Lead จาก CC' },
  SS窄: { zh: 'SS窄', 'zh-TW': 'SS窄', en: 'SS Narrow', th: 'Lead จาก SS' },
  LP窄: { zh: 'LP窄', 'zh-TW': 'LP窄', en: 'LP Narrow', th: 'Lead จาก LP' },
  // 带"口"后缀变体（后端有时返回这些 key）
  CC窄口: { zh: 'CC窄口', 'zh-TW': 'CC窄口', en: 'CC Narrow', th: 'Lead จาก CC' },
  SS窄口: { zh: 'SS窄口', 'zh-TW': 'SS窄口', en: 'SS Narrow', th: 'Lead จาก SS' },
  LP窄口: { zh: 'LP窄口', 'zh-TW': 'LP窄口', en: 'LP Narrow', th: 'Lead จาก LP' },
  // 宽口径 = Lead 来自学员自发分享（非员工绑定）
  宽口: { zh: '宽口', 'zh-TW': '寬口', en: 'Wide', th: 'Lead จาก User' },
  CC宽: { zh: 'CC宽', 'zh-TW': 'CC寬', en: 'CC Wide', th: 'Lead จาก User (CC)' },
  LP宽: { zh: 'LP宽', 'zh-TW': 'LP寬', en: 'LP Wide', th: 'Lead จาก User (LP)' },
  运营宽: { zh: '运营宽', 'zh-TW': '運營寬', en: 'Ops Wide', th: 'Lead จาก User (Ops)' },
  总计: { zh: '总计', 'zh-TW': '總計', en: 'Total', th: 'รวม' },
  รวมช่องทางแคบ: { zh: '总窄口', 'zh-TW': '總窄口', en: 'Total Narrow', th: 'รวม Lead จาก Staff' },
};

/** 后端 projection_engine 返回的场景名称 → 当前 locale */
export const SCENARIO_NAME_LABELS: LabelMap = {
  预约率提升至目标: {
    zh: '预约率提升至目标',
    'zh-TW': '預約率提升至目標',
    en: 'Appt Rate to Target',
    th: 'อัตรานัดหมายถึงเป้า',
  },
  出席率提升至目标: {
    zh: '出席率提升至目标',
    'zh-TW': '出席率提升至目標',
    en: 'Attend Rate to Target',
    th: 'อัตราเข้าร่วมถึงเป้า',
  },
  付费率提升至目标: {
    zh: '付费率提升至目标',
    'zh-TW': '付費率提升至目標',
    en: 'Pay Rate to Target',
    th: 'อัตราชำระเงินถึงเป้า',
  },
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

// ── Data Health page ─────────────────────────────────────────────────────────

/** 后端 pipeline_status[].layer 字段（固定 4 个值） */
export const PIPELINE_LAYER_LABELS: LabelMap = {
  'Excel 文件': { zh: 'Excel 文件', 'zh-TW': 'Excel 文件', en: 'Excel Files', th: 'ไฟล์ Excel' },
  'Python 引擎': {
    zh: 'Python 引擎',
    'zh-TW': 'Python 引擎',
    en: 'Python Engine',
    th: 'Python Engine',
  },
  'API 响应': { zh: 'API 响应', 'zh-TW': 'API 回應', en: 'API Response', th: 'API Response' },
  前端渲染: { zh: '前端渲染', 'zh-TW': '前端渲染', en: 'Frontend Render', th: 'Frontend Render' },
};

/** 后端 modules[].name 字段（来自 _ENDPOINTS_TO_CHECK module） */
export const DATA_MODULE_LABELS: LabelMap = {
  健康检查: { zh: '健康检查', 'zh-TW': '健康檢查', en: 'Health Check', th: 'Health Check' },
  总览: { zh: '总览', 'zh-TW': '總覽', en: 'Overview', th: 'ภาพรวม' },
  漏斗分析: {
    zh: '漏斗分析',
    'zh-TW': '漏斗分析',
    en: 'Funnel Analysis',
    th: 'การวิเคราะห์ Funnel',
  },
  围场分析: {
    zh: '围场分析',
    'zh-TW': '圍場分析',
    en: 'Enclosure Analysis',
    th: 'การวิเคราะห์ Enclosure',
  },
  打卡管理: { zh: '打卡管理', 'zh-TW': '打卡管理', en: 'Check-in Mgmt', th: 'จัดการการเช็คอิน' },
  运营报告: { zh: '运营报告', 'zh-TW': '運營報告', en: 'Ops Report', th: 'รายงานปฏิบัติการ' },
  运营摘要: { zh: '运营摘要', 'zh-TW': '運營摘要', en: 'Ops Summary', th: 'สรุปปฏิบัติการ' },
  配置: { zh: '配置', 'zh-TW': '配置', en: 'Configuration', th: 'การตั้งค่า' },
  指标矩阵: {
    zh: '指标矩阵',
    'zh-TW': '指標矩陣',
    en: 'Indicator Matrix',
    th: 'เมทริกซ์ตัวชี้วัด',
  },
  'CC 个人业绩': {
    zh: 'CC 个人业绩',
    'zh-TW': 'CC 個人業績',
    en: 'CC Performance',
    th: 'ผลงาน CC',
  },
  内场激励: { zh: '内场激励', 'zh-TW': '內場激勵', en: 'Incentive', th: 'แรงจูงใจ' },
};

/** 后端 root_causes[].cause 字段 */
export const ROOT_CAUSE_LABELS: LabelMap = {
  'D4 学员数据': {
    zh: 'D4 学员数据',
    'zh-TW': 'D4 學員數據',
    en: 'D4 Student Data',
    th: 'ข้อมูลนักเรียน D4',
  },
  'CC 个人目标上传': {
    zh: 'CC 个人目标上传',
    'zh-TW': 'CC 個人目標上傳',
    en: 'CC Target Upload',
    th: 'อัปโหลดเป้าหมาย CC',
  },
  'CC 个人目标上传（推算）': {
    zh: 'CC 个人目标上传（推算）',
    'zh-TW': 'CC 個人目標上傳（推算）',
    en: 'CC Target Upload (Derived)',
    th: 'อัปโหลดเป้าหมาย CC (คำนวณ)',
  },
  月度目标未配置: {
    zh: '月度目标未配置',
    'zh-TW': '月度目標未配置',
    en: 'Monthly Target Not Set',
    th: 'ยังไม่ได้ตั้งเป้าหมายรายเดือน',
  },
  历史快照不足: {
    zh: '历史快照不足',
    'zh-TW': '歷史快照不足',
    en: 'Insufficient Snapshots',
    th: 'ข้อมูลประวัติไม่เพียงพอ',
  },
  'D2B 数据': { zh: 'D2B 数据', 'zh-TW': 'D2B 數據', en: 'D2B Data', th: 'ข้อมูล D2B' },
  'CC 无有效围场': {
    zh: 'CC 无有效围场',
    'zh-TW': 'CC 無有效圍場',
    en: 'CC No Active Enclosure',
    th: 'CC ไม่มี Enclosure ที่ใช้งาน',
  },
  'D2 围场数据': {
    zh: 'D2 围场数据',
    'zh-TW': 'D2 圍場數據',
    en: 'D2 Enclosure Data',
    th: 'ข้อมูล Enclosure D2',
  },
  'D1 汇总数据': {
    zh: 'D1 汇总数据',
    'zh-TW': 'D1 匯總數據',
    en: 'D1 Summary Data',
    th: 'ข้อมูลสรุป D1',
  },
  激励活动配置: {
    zh: '激励活动配置',
    'zh-TW': '激勵活動配置',
    en: 'Incentive Config',
    th: 'การตั้งค่ากิจกรรมจูงใจ',
  },
  打卡角色数据: {
    zh: '打卡角色数据',
    'zh-TW': '打卡角色數據',
    en: 'Check-in Role Data',
    th: 'ข้อมูลบทบาทการเช็คอิน',
  },
  未知: { zh: '未知', 'zh-TW': '未知', en: 'Unknown', th: 'ไม่ทราบ' },
};

/** 后端 root_causes[].remediation.action 字段 */
export const REMEDIATION_ACTION_LABELS: LabelMap = {
  '下载 BI 数据': {
    zh: '下载 BI 数据',
    'zh-TW': '下載 BI 數據',
    en: 'Download BI Data',
    th: 'ดาวน์โหลดข้อมูล BI',
  },
  上传个人目标: {
    zh: '上传个人目标',
    'zh-TW': '上傳個人目標',
    en: 'Upload Personal Target',
    th: 'อัปโหลดเป้าหมายส่วนตัว',
  },
  设置月度目标: {
    zh: '设置月度目标',
    'zh-TW': '設置月度目標',
    en: 'Set Monthly Target',
    th: 'ตั้งเป้าหมายรายเดือน',
  },
  等待数据积累: {
    zh: '等待数据积累',
    'zh-TW': '等待數據積累',
    en: 'Awaiting Data Accumulation',
    th: 'รอสะสมข้อมูล',
  },
  配置激励活动: {
    zh: '配置激励活动',
    'zh-TW': '配置激勵活動',
    en: 'Configure Incentive',
    th: 'ตั้งค่ากิจกรรมจูงใจ',
  },
  正常现象: { zh: '正常现象', 'zh-TW': '正常現象', en: 'Normal', th: 'ปกติ' },
};

/** 后端 root_causes[].remediation.manual 字段（固定文本） */
export const REMEDIATION_MANUAL_LABELS: LabelMap = {
  '双击 下载BI数据.command': {
    zh: '双击 下载BI数据.command',
    'zh-TW': '雙擊 下載BI數據.command',
    en: 'Double-click 下载BI数据.command',
    th: 'ดับเบิลคลิก 下载BI数据.command',
  },
  '需 ≥7 天快照（自动积累）': {
    zh: '需 ≥7 天快照（自动积累）',
    'zh-TW': '需 ≥7 天快照（自動積累）',
    en: 'Requires ≥7 days of snapshots (auto-accumulated)',
    th: 'ต้องการ ≥7 วันของ snapshot (สะสมอัตโนมัติ)',
  },
  运营角色无数据为正常: {
    zh: '运营角色无数据为正常',
    'zh-TW': '運營角色無數據為正常',
    en: 'No data for ops role is normal',
    th: 'ไม่มีข้อมูลสำหรับบทบาท ops ถือเป็นปกติ',
  },
  'CC 名下无有效围场学员，过程指标为空': {
    zh: 'CC 名下无有效围场学员，过程指标为空',
    'zh-TW': 'CC 名下無有效圍場學員，過程指標為空',
    en: 'CC has no active enclosure students; process metrics are empty',
    th: 'CC ไม่มีนักเรียน enclosure ที่ใช้งาน ตัวชี้วัดกระบวนการว่างเปล่า',
  },
};

/** 后端 cross_checks[].name 字段 */
export const CROSS_CHECK_LABELS: LabelMap = {
  'CC 人数': { zh: 'CC 人数', 'zh-TW': 'CC 人數', en: 'CC Headcount', th: 'จำนวน CC' },
  '注册数（总览 vs 漏斗）': {
    zh: '注册数（总览 vs 漏斗）',
    'zh-TW': '註冊數（總覽 vs 漏斗）',
    en: 'Register Count (Overview vs Funnel)',
    th: 'จำนวนลงทะเบียน (ภาพรวม vs Funnel)',
  },
};
