'use client';

import { useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

const I18N = {
  zh: {
    title: 'SM 业绩目标导入',
    desc: '上传 SM 月度 Target Proposal Excel → 自动按比例计算每个 CC 的转介绍目标',
    upload: '选择 Excel 文件',
    importing: '计算中...',
    change: '更换文件',
    result: '导入结果',
    referralTarget: '系统转介绍目标',
    totalFromExcel: 'Excel CC 总目标',
    ratio: '转介绍占比',
    ccCount: 'CC 人数',
    allocated: '已分配总额',
    preview: 'CC 个人目标预览',
    ccName: 'CC 名称',
    totalTarget: '总目标 (USD)',
    referralUsd: '转介绍目标 (USD)',
    noReferralTarget: '请先在上方设置当月转介绍收入目标',
    importFailed: '导入失败',
    importSuccess: '导入成功，已保存 {n} 人的转介绍目标',
  },
  'zh-TW': {
    title: 'SM 業績目標導入',
    desc: '上傳 SM 月度 Target Proposal Excel → 自動按比例計算每個 CC 的轉介紹目標',
    upload: '選擇 Excel 文件',
    importing: '計算中...',
    change: '更換文件',
    result: '導入結果',
    referralTarget: '系統轉介紹目標',
    totalFromExcel: 'Excel CC 總目標',
    ratio: '轉介紹佔比',
    ccCount: 'CC 人數',
    allocated: '已分配總額',
    preview: 'CC 個人目標預覽',
    ccName: 'CC 名稱',
    totalTarget: '總目標 (USD)',
    referralUsd: '轉介紹目標 (USD)',
    noReferralTarget: '請先在上方設置當月轉介紹收入目標',
    importFailed: '導入失敗',
    importSuccess: '導入成功，已儲存 {n} 人的轉介紹目標',
  },
  en: {
    title: 'SM Target Import',
    desc: 'Upload SM monthly Target Proposal Excel → auto-calculate each CC referral target by ratio',
    upload: 'Select Excel File',
    importing: 'Calculating...',
    change: 'Change File',
    result: 'Import Result',
    referralTarget: 'System Referral Target',
    totalFromExcel: 'Excel CC Total Target',
    ratio: 'Referral Ratio',
    ccCount: 'CC Count',
    allocated: 'Total Allocated',
    preview: 'CC Target Preview',
    ccName: 'CC Name',
    totalTarget: 'Total Target (USD)',
    referralUsd: 'Referral Target (USD)',
    noReferralTarget: 'Please set the referral revenue target above first',
    importFailed: 'Import failed',
    importSuccess: 'Import successful, saved targets for {n} CCs',
  },
  th: {
    title: 'นำเข้าเป้าหมาย SM',
    desc: 'อัปโหลด Excel เป้าหมาย SM → คำนวณเป้าหมายแนะนำเพื่อนอัตโนมัติ',
    upload: 'เลือกไฟล์ Excel',
    importing: 'กำลังคำนวณ...',
    change: 'เปลี่ยนไฟล์',
    result: 'ผลการนำเข้า',
    referralTarget: 'เป้าหมายแนะนำเพื่อน',
    totalFromExcel: 'เป้าหมายรวมจาก Excel',
    ratio: 'สัดส่วนแนะนำเพื่อน',
    ccCount: 'จำนวน CC',
    allocated: 'ยอดที่จัดสรร',
    preview: 'ตัวอย่างเป้าหมาย CC',
    ccName: 'ชื่อ CC',
    totalTarget: 'เป้าหมายรวม (USD)',
    referralUsd: 'เป้าหมายแนะนำเพื่อน (USD)',
    noReferralTarget: 'กรุณาตั้งเป้าหมายรายได้แนะนำเพื่อนก่อน',
    importFailed: 'นำเข้าล้มเหลว',
    importSuccess: 'นำเข้าสำเร็จ บันทึกเป้าหมาย {n} CC',
  },
};

interface ImportResult {
  status: string;
  month: string;
  referral_revenue: number;
  total_target_from_excel: number;
  referral_ratio_pct: number;
  cc_count: number;
  total_allocated: number;
  preview: { cc_name: string; total_target_usd: number; referral_usd_target: number }[];
}

export default function SMTargetImportCard({ month }: { month: string }) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');

  async function handleImport(file: File) {
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/cc-performance/targets/import-sm?month=${month}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || t.importFailed);
      }
      const data: ImportResult = await res.json();
      setResult(data);
      toast.success(t.importSuccess.replace('{n}', String(data.cc_count)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.importFailed;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    handleImport(file);
  }

  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-primary-token">{t.title}</h3>
          <p className="text-xs text-muted-token mt-1">{t.desc}</p>
        </div>

        {/* Upload area */}
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="btn-secondary px-4 py-2 text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> {t.importing}
              </span>
            ) : fileName ? (
              t.change
            ) : (
              t.upload
            )}
          </button>
          {fileName && !loading && (
            <span className="text-xs text-secondary-token truncate max-w-[200px]">{fileName}</span>
          )}
        </div>

        {/* Result summary */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: t.referralTarget, value: fmt(result.referral_revenue) },
                { label: t.totalFromExcel, value: fmt(result.total_target_from_excel) },
                { label: t.ratio, value: `${result.referral_ratio_pct}%` },
                { label: t.ccCount, value: String(result.cc_count) },
                { label: t.allocated, value: fmt(result.total_allocated) },
              ].map((item) => (
                <div key={item.label} className="bg-subtle rounded-lg p-3">
                  <div className="text-[10px] text-muted-token uppercase tracking-wide">
                    {item.label}
                  </div>
                  <div className="text-sm font-semibold text-primary-token mt-1">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <details>
              <summary className="text-xs text-secondary-token cursor-pointer hover:text-primary-token transition-colors">
                {t.preview} ({result.cc_count})
              </summary>
              <div className="mt-2 max-h-[300px] overflow-y-auto border border-default-token rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-subtle sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-secondary-token">
                        {t.ccName}
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-secondary-token">
                        {t.totalTarget}
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-secondary-token">
                        {t.referralUsd}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {result.preview.map((row) => (
                      <tr key={row.cc_name} className="hover:bg-subtle transition-colors">
                        <td className="px-3 py-1.5 text-primary-token">{row.cc_name}</td>
                        <td className="px-3 py-1.5 text-right text-secondary-token">
                          {fmt(row.total_target_usd)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-primary-token">
                          {fmt(row.referral_usd_target)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </div>
    </Card>
  );
}
