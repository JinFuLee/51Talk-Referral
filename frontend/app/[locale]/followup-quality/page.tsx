'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRate } from '@/lib/utils';
import { useLocale } from 'next-intl';

/* ── I18N ─────────────────────────────────────────────────── */

const I18N = {
  zh: {
    pageTitle: '跟进质量分析',
    pageSubtitle: '通话质量分层 · 失联风险预警 · 跟进行为评估',
    pageNote: '高质量：通话 ≥120s · 可疑：通话 <30s · 失联：最后联系距今天数',
    highQualityPct: '高质量通话占比',
    highQualityNote: '通话时长 ≥120s',
    suspiciousPct: '可疑通话占比',
    suspiciousNote: '通话时长 <30s',
    lostContact: '失联 >14 天',
    lostContactNote: (total: number) => `人 / 共 ${total.toLocaleString()} 名学员`,
    tableTitle: 'CC 个人跟进质量明细',
    rank: '排名',
    ccName: 'CC 名称',
    group: '组别',
    students: '学员数',
    avgDuration: '均接通时长',
    highQualityCount: '高质量数',
    suspiciousCount: '可疑数',
    avgLostDays: '均失联天数',
    lostOver14: '失联>14天',
    totalCalls: '总拨打次数',
    tableNote: '高质量：接通时长 ≥120s · 可疑：接通时长 <30s · 点击列标题排序',
    loadError: '数据加载失败',
    loadErrorDesc: '无法获取跟进质量数据，请检查后端服务是否正常运行',
    retry: '重试',
    noData: '暂无跟进数据',
    noDataDesc: '当前数据源缺少通话记录，上传含通话日志的数据文件后自动解析',
    ssNotConnected: 'SS 跟进数据暂未接入',
    ssNotConnectedDesc: 'SS 后端跟进数据等数据源补充后自动启用，无需手动配置',
    lpNotConnected: 'LP 跟进数据暂未接入',
    lpNotConnectedDesc: 'LP 服务跟进数据等数据源补充后自动启用，无需手动配置',
    tabCC: 'CC 前端',
    tabSS: 'SS 后端',
    tabLP: 'LP 服务',
  },
  'zh-TW': {
    pageTitle: '跟進質量分析',
    pageSubtitle: '通話質量分層 · 失聯風險預警 · 跟進行為評估',
    pageNote: '高質量：通話 ≥120s · 可疑：通話 <30s · 失聯：最後聯繫距今天數',
    highQualityPct: '高質量通話佔比',
    highQualityNote: '通話時長 ≥120s',
    suspiciousPct: '可疑通話佔比',
    suspiciousNote: '通話時長 <30s',
    lostContact: '失聯 >14 天',
    lostContactNote: (total: number) => `人 / 共 ${total.toLocaleString()} 名學員`,
    tableTitle: 'CC 個人跟進質量明細',
    rank: '排名',
    ccName: 'CC 名稱',
    group: '組別',
    students: '學員數',
    avgDuration: '均接通時長',
    highQualityCount: '高質量數',
    suspiciousCount: '可疑數',
    avgLostDays: '均失聯天數',
    lostOver14: '失聯>14天',
    totalCalls: '總撥打次數',
    tableNote: '高質量：接通時長 ≥120s · 可疑：接通時長 <30s · 點擊列標題排序',
    loadError: '資料載入失敗',
    loadErrorDesc: '無法取得跟進質量資料，請檢查後端服務是否正常運行',
    retry: '重試',
    noData: '暫無跟進資料',
    noDataDesc: '當前資料來源缺少通話記錄，上傳含通話日誌的資料文件後自動解析',
    ssNotConnected: 'SS 跟進資料暫未接入',
    ssNotConnectedDesc: 'SS 後端跟進資料等資料來源補充後自動啟用，無需手動設定',
    lpNotConnected: 'LP 跟進資料暫未接入',
    lpNotConnectedDesc: 'LP 服務跟進資料等資料來源補充後自動啟用，無需手動設定',
    tabCC: 'CC 前端',
    tabSS: 'SS 後端',
    tabLP: 'LP 服務',
  },
  en: {
    pageTitle: 'Follow-up Quality Analysis',
    pageSubtitle: 'Call Quality Tiers · Lost Contact Alerts · Follow-up Behavior Assessment',
    pageNote: 'High Quality: call ≥120s · Suspicious: call <30s · Lost: days since last contact',
    highQualityPct: 'High Quality Call %',
    highQualityNote: 'Call duration ≥120s',
    suspiciousPct: 'Suspicious Call %',
    suspiciousNote: 'Call duration <30s',
    lostContact: 'Lost >14 Days',
    lostContactNote: (total: number) => `people / ${total.toLocaleString()} total students`,
    tableTitle: 'CC Individual Follow-up Quality',
    rank: 'Rank',
    ccName: 'CC Name',
    group: 'Group',
    students: 'Students',
    avgDuration: 'Avg Call Duration',
    highQualityCount: 'High Quality',
    suspiciousCount: 'Suspicious',
    avgLostDays: 'Avg Lost Days',
    lostOver14: 'Lost>14d',
    totalCalls: 'Total Calls',
    tableNote: 'High Quality: ≥120s · Suspicious: <30s · Click column header to sort',
    loadError: 'Failed to Load Data',
    loadErrorDesc: 'Unable to fetch follow-up quality data, please check backend service',
    retry: 'Retry',
    noData: 'No Follow-up Data',
    noDataDesc: 'Missing call records in current data source, upload file with call logs to parse',
    ssNotConnected: 'SS Follow-up Data Not Connected',
    ssNotConnectedDesc:
      'SS backend follow-up data will be enabled automatically when source is added',
    lpNotConnected: 'LP Follow-up Data Not Connected',
    lpNotConnectedDesc:
      'LP service follow-up data will be enabled automatically when source is added',
    tabCC: 'CC Frontend',
    tabSS: 'SS Backend',
    tabLP: 'LP Service',
  },
  th: {
    pageTitle: 'วิเคราะห์คุณภาพการติดตาม',
    pageSubtitle: 'จัดระดับคุณภาพการโทร · แจ้งเตือนความเสี่ยงขาดการติดต่อ · ประเมินพฤติกรรมติดตาม',
    pageNote: 'คุณภาพสูง: โทร ≥120s · น่าสงสัย: โทร <30s · ขาดติดต่อ: วันนับจากครั้งสุดท้าย',
    highQualityPct: 'อัตราการโทรคุณภาพสูง',
    highQualityNote: 'ระยะเวลาโทร ≥120s',
    suspiciousPct: 'อัตราการโทรน่าสงสัย',
    suspiciousNote: 'ระยะเวลาโทร <30s',
    lostContact: 'ขาดติดต่อ >14 วัน',
    lostContactNote: (total: number) => `คน / รวม ${total.toLocaleString()} คนนักเรียน`,
    tableTitle: 'รายละเอียดคุณภาพติดตามรายบุคคล CC',
    rank: 'อันดับ',
    ccName: 'ชื่อ CC',
    group: 'กลุ่ม',
    students: 'นักเรียน',
    avgDuration: 'เวลาโทรเฉลี่ย',
    highQualityCount: 'คุณภาพสูง',
    suspiciousCount: 'น่าสงสัย',
    avgLostDays: 'วันขาดติดต่อเฉลี่ย',
    lostOver14: 'ขาดติดต่อ>14วัน',
    totalCalls: 'จำนวนโทรทั้งหมด',
    tableNote: 'คุณภาพสูง: ≥120s · น่าสงสัย: <30s · คลิกหัวคอลัมน์เพื่อเรียงลำดับ',
    loadError: 'โหลดข้อมูลล้มเหลว',
    loadErrorDesc: 'ไม่สามารถดึงข้อมูลคุณภาพการติดตาม กรุณาตรวจสอบบริการ backend',
    retry: 'ลองใหม่',
    noData: 'ไม่มีข้อมูลการติดตาม',
    noDataDesc: 'แหล่งข้อมูลปัจจุบันขาดบันทึกการโทร อัปโหลดไฟล์ที่มีบันทึกการโทรเพื่อวิเคราะห์',
    ssNotConnected: 'ยังไม่ได้เชื่อมต่อข้อมูลการติดตาม SS',
    ssNotConnectedDesc: 'ข้อมูลการติดตาม SS จะเปิดใช้งานโดยอัตโนมัติเมื่อเพิ่มแหล่งข้อมูล',
    lpNotConnected: 'ยังไม่ได้เชื่อมต่อข้อมูลการติดตาม LP',
    lpNotConnectedDesc: 'ข้อมูลการติดตาม LP จะเปิดใช้งานโดยอัตโนมัติเมื่อเพิ่มแหล่งข้อมูล',
    tabCC: 'CC ฝ่ายขายหน้า',
    tabSS: 'SS ฝ่ายขายหลัง',
    tabLP: 'LP บริการหลัง',
  },
};

/* ── 类型定义 ─────────────────────────────────────────────── */

interface FollowupSummary {
  total_students: number;
  high_quality_pct: number;
  low_quality_pct: number;
  suspicious_pct: number;
  avg_lost_days: number;
  lost_contact_count: number;
}

interface FollowupPerson {
  cc_name: string;
  cc_group: string;
  students: number;
  avg_call_duration_sec: number;
  high_quality_count: number;
  low_quality_count: number;
  suspicious_count: number;
  avg_lost_days: number;
  lost_14d_count: number;
  avg_note_delay_days: number;
  total_calls: number;
}

interface FollowupQualityResponse {
  summary: FollowupSummary;
  by_person: FollowupPerson[];
}

/* ── 工具函数 ─────────────────────────────────────────────── */

type SortKey = keyof FollowupPerson;

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v == null) return '—';
  if (decimals > 0) return v.toFixed(decimals);
  return v.toLocaleString();
}

function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function pct(v: number | null | undefined): string {
  return formatRate(v);
}

/* ── Tab 按钮 ─────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'cc', label: 'CC' },
  { key: 'ss', label: 'SS' },
  { key: 'lp', label: 'LP' },
];

/* ── CC 内容 ─────────────────────────────────────────────── */

function CCContent() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const { data, isLoading, error, mutate } = useSWR<FollowupQualityResponse>(
    '/api/analysis/followup-quality?role=cc',
    swrFetcher
  );

  const [sortKey, setSortKey] = useState<SortKey>('students');
  const [sortAsc, setSortAsc] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t.loadError}
        description={t.loadErrorDesc}
        action={{ label: t.retry, onClick: () => mutate() }}
      />
    );
  }

  const persons = data?.by_person ?? [];
  const summary = data?.summary;

  if (persons.length === 0) {
    return <EmptyState title={t.noData} description={t.noDataDesc} />;
  }

  const sorted = [...persons].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortAsc ? av - bv : bv - av;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="text-[var(--text-muted)] ml-0.5">⇅</span>;
    return <span className="text-[var(--text-primary)] ml-0.5">{sortAsc ? '↑' : '↓'}</span>;
  }

  return (
    <div className="space-y-3">
      {/* 汇总卡片 */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.highQualityPct}</p>
              <p className="text-3xl font-bold text-emerald-800">{pct(summary.high_quality_pct)}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t.highQualityNote}</p>
            </div>
          </Card>
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.suspiciousPct}</p>
              <p className="text-3xl font-bold text-amber-800">{pct(summary.suspicious_pct)}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t.suspiciousNote}</p>
            </div>
          </Card>
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.lostContact}</p>
              <p className="text-3xl font-bold text-[var(--color-danger)]">
                {(summary.lost_contact_count ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {t.lostContactNote(summary.total_students ?? 0)}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* CC 个人明细表 */}
      <Card title={t.tableTitle}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">{t.rank}</th>
                <th className="slide-th text-left">{t.ccName}</th>
                <th className="slide-th text-left">{t.group}</th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('students')}
                >
                  {t.students}
                  {sortIcon('students')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('avg_call_duration_sec')}
                >
                  {t.avgDuration}
                  {sortIcon('avg_call_duration_sec')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('high_quality_count')}
                >
                  {t.highQualityCount}
                  {sortIcon('high_quality_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('suspicious_count')}
                >
                  {t.suspiciousCount}
                  {sortIcon('suspicious_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('avg_lost_days')}
                >
                  {t.avgLostDays}
                  {sortIcon('avg_lost_days')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('lost_14d_count')}
                >
                  {t.lostOver14}
                  {sortIcon('lost_14d_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_calls')}
                >
                  {t.totalCalls}
                  {sortIcon('total_calls')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const highRate = p.students > 0 ? p.high_quality_count / p.students : 0;
                const suspRate = p.students > 0 ? p.suspicious_count / p.students : 0;
                return (
                  <tr key={p.cc_name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td text-center text-[var(--text-muted)] font-mono">
                      {i + 1}
                    </td>
                    <td className="slide-td font-medium">{p.cc_name}</td>
                    <td className="slide-td text-[var(--text-secondary)] text-xs">{p.cc_group}</td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {(p.students ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {fmtDuration(p.avg_call_duration_sec)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          highRate >= 0.6
                            ? 'text-emerald-800 font-semibold'
                            : highRate >= 0.4
                              ? 'text-amber-800'
                              : 'text-[var(--color-danger)]'
                        }
                      >
                        {p.high_quality_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          suspRate > 0.3
                            ? 'text-[var(--color-danger)] font-semibold'
                            : suspRate > 0.1
                              ? 'text-amber-800'
                              : 'text-[var(--text-secondary)]'
                        }
                      >
                        {p.suspicious_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {fmt(p.avg_lost_days, 1)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          p.lost_14d_count > 5
                            ? 'text-[var(--color-danger)] font-semibold'
                            : 'text-[var(--text-secondary)]'
                        }
                      >
                        {p.lost_14d_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {(p.total_calls ?? 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2 px-1">
          高质量：接通时长 ≥120s · 可疑：接通时长 &lt;30s · 点击列标题排序
        </p>
      </Card>
    </div>
  );
}

/* ── 主页面 ─────────────────────────────────────────────── */

export default function FollowupQualityPage() {
  const [tab, setTab] = useState<TabKey>('cc');

  return (
    <div className="space-y-3">
      {/* 页头 */}
      <div>
        <h1 className="page-title">跟进质量分析</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          通话质量分层 · 失联风险预警 · 跟进行为评估
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          高质量：通话 ≥120s · 可疑：通话 &lt;30s · 失联：最后联系距今天数
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
              tab === t.key
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-b-0 border-[var(--border-default)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {tab === 'cc' && <CCContent />}
      {tab === 'ss' && (
        <EmptyState
          title="SS 跟进数据暂未接入"
          description="SS 后端跟进数据等数据源补充后自动启用，无需手动配置"
        />
      )}
      {tab === 'lp' && (
        <EmptyState
          title="LP 跟进数据暂未接入"
          description="LP 服务跟进数据等数据源补充后自动启用，无需手动配置"
        />
      )}
    </div>
  );
}
