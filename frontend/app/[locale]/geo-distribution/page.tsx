'use client';

import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

const I18N = {
  zh: {
    title: '地理分布',
    subtitle: '学员常登录国家分布 · 共',
    subtitleStudents: '位学员 ·',
    subtitleRegions: '个国家/地区',
    cardProportion: '占比',
    colCountry: '国家 / 地区',
    colStudents: '学员数',
    colShare: '占比分布',
    colAvgReg: '人均推荐注册',
    colAvgPay: '人均推荐付费',
    footerNote:
      '「常登录国家」来自学员账号注册/登录地理信息 · 人均指标为该国家所有学员的月度平均值',
    errorTitle: '数据加载失败',
    errorDesc: '无法获取地理分布数据，请检查后端服务是否正常运行',
    errorRetry: '重试',
    emptySubtitle: '学员常登录国家分布及推荐效果',
    emptyTitle: '暂无地理数据',
    emptyDesc: '数据源中未找到「常登录国家」列，请上传包含地理信息的学员数据文件',
  },
  'zh-TW': {
    title: '地理分布',
    subtitle: '學員常登入國家分布 · 共',
    subtitleStudents: '位學員 ·',
    subtitleRegions: '個國家/地區',
    cardProportion: '佔比',
    colCountry: '國家 / 地區',
    colStudents: '學員數',
    colShare: '佔比分布',
    colAvgReg: '人均推薦註冊',
    colAvgPay: '人均推薦付費',
    footerNote:
      '「常登入國家」來自學員帳號註冊/登入地理資訊 · 人均指標為該國家所有學員的月度平均值',
    errorTitle: '資料載入失敗',
    errorDesc: '無法取得地理分布資料，請檢查後端服務是否正常運行',
    errorRetry: '重試',
    emptySubtitle: '學員常登入國家分布及推薦效果',
    emptyTitle: '暫無地理資料',
    emptyDesc: '資料來源中未找到「常登入國家」欄，請上傳包含地理資訊的學員資料檔案',
  },
  en: {
    title: 'Geographic Distribution',
    subtitle: 'Student login country distribution · Total',
    subtitleStudents: 'students ·',
    subtitleRegions: 'countries/regions',
    cardProportion: 'Share',
    colCountry: 'Country / Region',
    colStudents: 'Students',
    colShare: 'Share Distribution',
    colAvgReg: 'Avg Referral Reg.',
    colAvgPay: 'Avg Referral Pay.',
    footerNote:
      '"Login Country" is derived from student account registration/login geography · Per-capita metrics are monthly averages for all students in that country',
    errorTitle: 'Load Failed',
    errorDesc: 'Cannot load geographic distribution data, please check backend service',
    errorRetry: 'Retry',
    emptySubtitle: 'Student login country distribution and referral performance',
    emptyTitle: 'No Geographic Data',
    emptyDesc:
      'No "Login Country" column found in data source. Please upload student data with geographic info.',
  },
  th: {
    title: 'การกระจายทางภูมิศาสตร์',
    subtitle: 'การกระจายประเทศที่นักเรียนล็อกอินบ่อย · ทั้งหมด',
    subtitleStudents: 'คน ·',
    subtitleRegions: 'ประเทศ/ภูมิภาค',
    cardProportion: 'สัดส่วน',
    colCountry: 'ประเทศ / ภูมิภาค',
    colStudents: 'นักเรียน',
    colShare: 'การกระจายสัดส่วน',
    colAvgReg: 'การลงทะเบียนแนะนำเฉลี่ย/คน',
    colAvgPay: 'การชำระเงินแนะนำเฉลี่ย/คน',
    footerNote:
      '"ประเทศที่ล็อกอินบ่อย" มาจากข้อมูลภูมิศาสตร์การลงทะเบียน/เข้าสู่ระบบของนักเรียน · ตัวชี้วัดต่อหัวคือค่าเฉลี่ยรายเดือนของนักเรียนทั้งหมดในประเทศนั้น',
    errorTitle: 'โหลดข้อมูลล้มเหลว',
    errorDesc: 'ไม่สามารถโหลดข้อมูลการกระจายทางภูมิศาสตร์ได้ กรุณาตรวจสอบบริการ backend',
    errorRetry: 'ลองใหม่',
    emptySubtitle: 'การกระจายประเทศที่นักเรียนล็อกอินบ่อยและผลการแนะนำ',
    emptyTitle: 'ไม่มีข้อมูลภูมิศาสตร์',
    emptyDesc:
      'ไม่พบคอลัมน์ "ประเทศที่ล็อกอินบ่อย" ในแหล่งข้อมูล กรุณาอัปโหลดไฟล์ข้อมูลนักเรียนที่มีข้อมูลภูมิศาสตร์',
  },
};

interface GeoItem {
  country: string;
  student_count: number;
  pct: number;
  avg_referral_registrations: number | null;
  avg_payments: number | null;
}

function BarCell({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[var(--n-100)] rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: 'var(--n-600)',
          }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)] w-10 text-right shrink-0">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function GeoDistributionPage() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  const { data, isLoading, error, mutate } = useSWR<GeoItem[]>(
    '/api/analysis/geo-distribution',
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t.errorTitle}
        description={t.errorDesc}
        action={{ label: t.errorRetry, onClick: () => mutate() }}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.emptySubtitle}</p>
        </div>
        <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
      </div>
    );
  }

  const totalStudents = data.reduce((s, r) => s + r.student_count, 0);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="page-title">{t.title}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t.subtitle} {totalStudents.toLocaleString()} {t.subtitleStudents} {data.length}{' '}
          {t.subtitleRegions}
        </p>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.slice(0, 4).map((item) => (
          <div
            key={item.country}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4"
          >
            <p className="text-xs text-[var(--text-muted)] mb-1">{item.country}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {(item.student_count ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t.cardProportion} {(item.pct ?? 0).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      {/* 国家条形图 + 详细表格 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-left">{t.colCountry}</th>
              <th className="slide-th text-right">{t.colStudents}</th>
              <th className="slide-th" style={{ minWidth: '160px' }}>
                {t.colShare}
              </th>
              <th className="slide-th text-right">{t.colAvgReg}</th>
              <th className="slide-th text-right">{t.colAvgPay}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.country} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                <td className="slide-td font-medium text-[var(--text-primary)]">{item.country}</td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {(item.student_count ?? 0).toLocaleString()}
                </td>
                <td className="slide-td" style={{ minWidth: '160px' }}>
                  <BarCell pct={item.pct} />
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {item.avg_referral_registrations != null ? (
                    (item.avg_referral_registrations ?? 0).toFixed(2)
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="slide-td text-right font-mono tabular-nums">
                  {item.avg_payments != null ? (
                    (item.avg_payments ?? 0).toFixed(2)
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 说明 */}
      <p className="text-xs text-[var(--text-muted)]">{t.footerNote}</p>
    </div>
  );
}
