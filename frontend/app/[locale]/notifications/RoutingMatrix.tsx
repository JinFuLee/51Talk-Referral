'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import {
  Grid3X3,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Save,
  Image,
  FileText,
  Users,
  Shield,
} from 'lucide-react';

const I18N = {
  zh: {
    loadFailed: '加载失败',
    contentModuleXAudience: '内容模块 × 受众路由',
    modules: '个模块',
    audienceLevels: '个受众级别',
    addModule: '新增模块',
    moduleId: '模块 ID',
    moduleIdPlaceholder: '例: new_metrics',
    description: '描述',
    descriptionPlaceholder: '模块描述',
    ccOnly: '仅 CC',
    cancel: '取消',
    save: '保存',
    contentModule: '内容模块',
    format: '格式',
    actions: '操作',
    image: '图片',
    text: '文本',
    enabledClickToDisable: '已启用 — 点击关闭',
    disabledClickToEnable: '已关闭 — 点击启用',
    editDescription: '编辑描述',
    deleteModule: '删除模块',
    confirmDelete: '确定删除模块',
    roleMetrics: '角色指标口径',
    audienceAll: '全员群',
    audienceTl: 'TL 群',
    audienceOps: '管理层',
    clickToEditDesc: '点击编辑描述',
  },
  'zh-TW': {
    loadFailed: '載入失敗',
    contentModuleXAudience: '內容模組 × 受眾路由',
    modules: '個模組',
    audienceLevels: '個受眾級別',
    addModule: '新增模組',
    moduleId: '模組 ID',
    moduleIdPlaceholder: '例: new_metrics',
    description: '描述',
    descriptionPlaceholder: '模組描述',
    ccOnly: '僅 CC',
    cancel: '取消',
    save: '儲存',
    contentModule: '內容模組',
    format: '格式',
    actions: '操作',
    image: '圖片',
    text: '文字',
    enabledClickToDisable: '已啟用 — 點擊關閉',
    disabledClickToEnable: '已關閉 — 點擊啟用',
    editDescription: '編輯描述',
    deleteModule: '刪除模組',
    confirmDelete: '確定刪除模組',
    roleMetrics: '角色指標口徑',
    audienceAll: '全員群',
    audienceTl: 'TL 群',
    audienceOps: '管理層',
    clickToEditDesc: '點擊編輯描述',
  },
  en: {
    loadFailed: 'Failed to load',
    contentModuleXAudience: 'Content Modules × Audience Routing',
    modules: 'modules',
    audienceLevels: 'audience levels',
    addModule: 'Add Module',
    moduleId: 'Module ID',
    moduleIdPlaceholder: 'e.g. new_metrics',
    description: 'Description',
    descriptionPlaceholder: 'Module description',
    ccOnly: 'CC only',
    cancel: 'Cancel',
    save: 'Save',
    contentModule: 'Content Module',
    format: 'Format',
    actions: 'Actions',
    image: 'Image',
    text: 'Text',
    enabledClickToDisable: 'Enabled — click to disable',
    disabledClickToEnable: 'Disabled — click to enable',
    editDescription: 'Edit description',
    deleteModule: 'Delete module',
    confirmDelete: 'Confirm delete module',
    roleMetrics: 'Role Metric Definitions',
    audienceAll: 'All Staff',
    audienceTl: 'TL Group',
    audienceOps: 'Management',
    clickToEditDesc: 'Click to edit description',
  },
  th: {
    loadFailed: 'โหลดล้มเหลว',
    contentModuleXAudience: 'โมดูลเนื้อหา × การกำหนดเส้นทางผู้รับ',
    modules: 'โมดูล',
    audienceLevels: 'ระดับผู้รับ',
    addModule: 'เพิ่มโมดูล',
    moduleId: 'รหัสโมดูล',
    moduleIdPlaceholder: 'เช่น new_metrics',
    description: 'คำอธิบาย',
    descriptionPlaceholder: 'คำอธิบายโมดูล',
    ccOnly: 'เฉพาะ CC',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    contentModule: 'โมดูลเนื้อหา',
    format: 'รูปแบบ',
    actions: 'การดำเนินการ',
    image: 'รูปภาพ',
    text: 'ข้อความ',
    enabledClickToDisable: 'เปิดใช้งาน — คลิกเพื่อปิด',
    disabledClickToEnable: 'ปิดใช้งาน — คลิกเพื่อเปิด',
    editDescription: 'แก้ไขคำอธิบาย',
    deleteModule: 'ลบโมดูล',
    confirmDelete: 'ยืนยันการลบโมดูล',
    roleMetrics: 'คำนิยามเมตริกตามบทบาท',
    audienceAll: 'กลุ่มพนักงานทั้งหมด',
    audienceTl: 'กลุ่ม TL',
    audienceOps: 'ฝ่ายบริหาร',
    clickToEditDesc: 'คลิกเพื่อแก้ไขคำอธิบาย',
  },
} as const;

const API = '';

interface Module {
  id: string;
  description: string;
  format: string;
  per_team: boolean;
  cc_only: boolean;
  audiences: Record<string, boolean>;
}

interface RoutingData {
  modules: Module[];
  audience_types: string[];
  role_metrics: Record<string, Record<string, string[]>>;
}

// AUDIENCE_LABELS is now derived from t inside the component

const AUDIENCE_COLORS: Record<string, string> = {
  all: 'text-[var(--color-accent)]',
  tl: 'text-[var(--color-warning)]',
  ops: 'text-[var(--color-accent)]',
};

const FORMAT_ICONS: Record<string, typeof Image> = {
  image: Image,
  markdown: FileText,
};

export function RoutingMatrix() {
  const locale = useLocale();
  const t = I18N[locale as keyof typeof I18N] || I18N.zh;

  const AUDIENCE_LABELS: Record<string, string> = {
    all: t.audienceAll,
    tl: t.audienceTl,
    ops: t.audienceOps,
  };

  const ROUTING_KEY = `${API}/api/notifications/routing`;
  const { data, error, isLoading } = useFilteredSWR<RoutingData>(ROUTING_KEY);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newModule, setNewModule] = useState({
    id: '',
    description: '',
    format: 'image',
    cc_only: false,
  });
  const [saving, setSaving] = useState<string | null>(null);

  if (isLoading) return <div className="animate-pulse h-40 rounded-lg bg-[var(--bg-subtle)]" />;
  if (error || !data) return <div className="text-[var(--text-muted)]">{t.loadFailed}</div>;

  const { modules, audience_types } = data;

  const toggleRouting = async (moduleId: string, audience: string, current: boolean) => {
    setSaving(`${moduleId}-${audience}`);
    await fetch(`${API}/api/notifications/routing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: moduleId, audience, enabled: !current }),
    });
    mutate((key) => typeof key === 'string' && key.startsWith(ROUTING_KEY));
    setSaving(null);
  };

  const saveDescription = async (moduleId: string) => {
    await fetch(`${API}/api/notifications/modules/${moduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editDesc }),
    });
    setEditingModule(null);
    mutate((key) => typeof key === 'string' && key.startsWith(ROUTING_KEY));
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm(`${t.confirmDelete} "${moduleId}"？`)) return;
    await fetch(`${API}/api/notifications/modules/${moduleId}`, { method: 'DELETE' });
    mutate((key) => typeof key === 'string' && key.startsWith(ROUTING_KEY));
  };

  const addModule = async () => {
    if (!newModule.id.trim()) return;
    const res = await fetch(`${API}/api/notifications/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newModule),
    });
    if (res.ok) {
      setShowAdd(false);
      setNewModule({ id: '', description: '', format: 'image', cc_only: false });
      mutate((key) => typeof key === 'string' && key.startsWith(ROUTING_KEY));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-[var(--text-secondary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {t.contentModuleXAudience}
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            {modules.length} {t.modules} · {audience_types.length} {t.audienceLevels}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg
 bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t.addModule}
        </button>
      </div>

      {/* Add Module Form */}
      {showAdd && (
        <div className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">{t.moduleId}</label>
              <input
                value={newModule.id}
                onChange={(e) => setNewModule({ ...newModule, id: e.target.value })}
                placeholder={t.moduleIdPlaceholder}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-lg
 bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">{t.description}</label>
              <input
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                placeholder={t.descriptionPlaceholder}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-lg
 bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action)]"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <select
                value={newModule.format}
                onChange={(e) => setNewModule({ ...newModule, format: e.target.value })}
                className="px-2 py-1 text-xs border border-[var(--border-default)] rounded bg-[var(--bg-primary)]"
              >
                <option value="image">{t.image}</option>
                <option value="markdown">Markdown</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={newModule.cc_only}
                onChange={(e) => setNewModule({ ...newModule, cc_only: e.target.checked })}
                className="rounded"
              />
              {t.ccOnly}
            </label>
            <div className="flex-1" />
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {t.cancel}
            </button>
            <button
              onClick={addModule}
              disabled={!newModule.id.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg
 bg-[var(--action)] text-white hover:bg-[var(--action-accent)]
 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-3 h-3" />
              {t.save}
            </button>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-subtle)]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-[280px]">
                {t.contentModule}
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-[90px]">
                {t.format}
              </th>
              {audience_types.map((aud) => (
                <th
                  key={aud}
                  className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider w-[100px]"
                >
                  <span className={AUDIENCE_COLORS[aud] || 'text-[var(--text-secondary)]'}>
                    {AUDIENCE_LABELS[aud] || aud}
                  </span>
                </th>
              ))}
              <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--text-muted)] w-[80px]">
                {t.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {modules.map((mod) => {
              const FormatIcon = FORMAT_ICONS[mod.format] || Image;
              const isEditing = editingModule === mod.id;

              return (
                <tr key={mod.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  {/* Module Name + Description */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[var(--text-primary)]">{mod.id}</span>
                          {mod.cc_only && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[var(--color-warning-surface)] text-[var(--color-warning)]">
                              CC
                            </span>
                          )}
                          {mod.per_team && (
                            <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          )}
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="flex-1 px-2 py-0.5 text-xs border border-[var(--border-default)] rounded
 bg-[var(--bg-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action)]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveDescription(mod.id);
                                if (e.key === 'Escape') setEditingModule(null);
                              }}
                            />
                            <button
                              onClick={() => saveDescription(mod.id)}
                              className="p-0.5 text-[var(--color-success)] hover:bg-[var(--color-success-surface)] rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingModule(null)}
                              className="p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p
                            className="text-xs text-[var(--text-muted)] mt-0.5 truncate cursor-pointer hover:text-[var(--text-secondary)]"
                            onClick={() => {
                              setEditingModule(mod.id);
                              setEditDesc(mod.description);
                            }}
                            title={t.clickToEditDesc}
                          >
                            {mod.description || '—'}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Format */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <FormatIcon className="w-3.5 h-3.5" />
                      {mod.format === 'image' ? t.image : t.text}
                    </div>
                  </td>

                  {/* Audience Toggles */}
                  {audience_types.map((aud) => {
                    const enabled = mod.audiences[aud];
                    const key = `${mod.id}-${aud}`;
                    const isSaving = saving === key;

                    return (
                      <td key={aud} className="text-center px-3 py-3">
                        <button
                          onClick={() => toggleRouting(mod.id, aud, enabled)}
                          disabled={isSaving}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
 ${
   enabled
     ? 'bg-[var(--color-success-surface)] text-[var(--color-success)] hover:bg-[var(--color-success-surface)]'
     : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
 } ${isSaving ? 'opacity-50' : ''}`}
                          title={enabled ? t.enabledClickToDisable : t.disabledClickToEnable}
                        >
                          {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>
                    );
                  })}

                  {/* Actions */}
                  <td className="text-center px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setEditingModule(mod.id);
                          setEditDesc(mod.description);
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--action)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors"
                        title={t.editDescription}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteModule(mod.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-surface)] rounded-lg transition-colors"
                        title={t.deleteModule}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role Metrics Summary */}
      {data.role_metrics && Object.keys(data.role_metrics).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--text-secondary)]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{t.roleMetrics}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(data.role_metrics).map(([role, metrics]) => (
              <div
                key={role}
                className="p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{role}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {(metrics as Record<string, string[]>).enclosure || ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(metrics as Record<string, unknown>).map(([category, items]) => {
                    if (category === 'enclosure' || category === 'scope') return null;
                    const itemList = Array.isArray(items) ? items : [];
                    if (itemList.length === 0 && typeof items === 'object') return null; // skip nested objects for now
                    if (itemList.length === 0) return null;
                    return (
                      <div key={category} className="flex items-start gap-2">
                        <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase w-16 shrink-0 pt-0.5">
                          {category}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {itemList.map((item: string) => (
                            <span
                              key={item}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
