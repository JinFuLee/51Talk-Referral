'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { datasourcesAPI } from '@/lib/api';
interface FileUploadPanelProps {
  onSuccess?: () => void;
}

export function FileUploadPanel({ onSuccess }: FileUploadPanelProps) {
  const t = useTranslations('FileUploadPanel');

  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceId, setSourceId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file || !sourceId.trim()) {
      setMsg(t('errorEmpty'));
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      await datasourcesAPI.upload(sourceId.trim(), file);
      setMsg(t('successMsg'));
      toast.success(t('successToast'));
      onSuccess?.();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : t('upload');
      setMsg(errMsg);
      toast.error(errMsg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-subtle-token bg-surface p-4 space-y-3 max-w-lg">
      <div className="flex gap-2">
        <input
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder={t('placeholder')}
          className="flex-1 px-3 py-2 border border-subtle-token rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          aria-label={t('ariaFile')}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 border border-subtle-token rounded-lg text-sm text-secondary-token hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t('chooseFile')}
        </button>
      </div>
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {uploading ? t('uploading') : t('upload')}
      </button>
      {msg && (
        <p className={`text-xs ${msg === t('successMsg') ? 'text-success' : 'text-destructive'}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
