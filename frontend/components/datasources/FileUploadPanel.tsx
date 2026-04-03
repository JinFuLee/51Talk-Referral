'use client';

import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { datasourcesAPI } from '@/lib/api';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    placeholder: '数据源 ID（如 orders）',
    ariaFile: '选择上传文件',
    chooseFile: '选择文件',
    upload: '上传',
    uploading: '上传中…',
    errorEmpty: '请填写数据源 ID 并选择文件',
    successMsg: '上传成功',
    successToast: '文件上传成功',
  },
  'zh-TW': {
    placeholder: '資料來源 ID（如 orders）',
    ariaFile: '選擇上傳檔案',
    chooseFile: '選擇檔案',
    upload: '上傳',
    uploading: '上傳中…',
    errorEmpty: '請填寫資料來源 ID 並選擇檔案',
    successMsg: '上傳成功',
    successToast: '檔案上傳成功',
  },
  en: {
    placeholder: 'Source ID (e.g. orders)',
    ariaFile: 'Select file to upload',
    chooseFile: 'Choose file',
    upload: 'Upload',
    uploading: 'Uploading…',
    errorEmpty: 'Please enter a source ID and select a file',
    successMsg: 'Upload successful',
    successToast: 'File uploaded successfully',
  },
  th: {
    placeholder: 'รหัสแหล่งข้อมูล (เช่น orders)',
    ariaFile: 'เลือกไฟล์เพื่ออัปโหลด',
    chooseFile: 'เลือกไฟล์',
    upload: 'อัปโหลด',
    uploading: 'กำลังอัปโหลด…',
    errorEmpty: 'กรุณากรอกรหัสแหล่งข้อมูลและเลือกไฟล์',
    successMsg: 'อัปโหลดสำเร็จ',
    successToast: 'อัปโหลดไฟล์สำเร็จ',
  },
} as const;

type Locale = keyof typeof I18N;

interface FileUploadPanelProps {
  onSuccess?: () => void;
}

export function FileUploadPanel({ onSuccess }: FileUploadPanelProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceId, setSourceId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file || !sourceId.trim()) {
      setMsg(t.errorEmpty);
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      await datasourcesAPI.upload(sourceId.trim(), file);
      setMsg(t.successMsg);
      toast.success(t.successToast);
      onSuccess?.();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : t.upload;
      setMsg(errMsg);
      toast.error(errMsg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3 max-w-lg">
      <div className="flex gap-2">
        <input
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder={t.placeholder}
          className="flex-1 px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          aria-label={t.ariaFile}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t.chooseFile}
        </button>
      </div>
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {uploading ? t.uploading : t.upload}
      </button>
      {msg && (
        <p className={`text-xs ${msg === t.successMsg ? 'text-success' : 'text-destructive'}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
