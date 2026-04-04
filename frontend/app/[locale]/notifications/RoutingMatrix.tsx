'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import {
  Grid3X3, Plus, Trash2, Edit2, Check, X, Save,
  Image, FileText, Users, Shield,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100';
const fetcher = (url: string) => fetch(url).then(r => r.json());

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

const AUDIENCE_LABELS: Record<string, string> = {
  all: '全员群',
  tl: 'TL 群',
  ops: '管理层',
};

const AUDIENCE_COLORS: Record<string, string> = {
  all: 'text-blue-600',
  tl: 'text-amber-600',
  ops: 'text-purple-600',
};

const FORMAT_ICONS: Record<string, typeof Image> = {
  image: Image,
  markdown: FileText,
};

export function RoutingMatrix() {
  const { data, error, isLoading } = useSWR<RoutingData>(
    `${API}/api/notifications/routing`,
    fetcher
  );
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newModule, setNewModule] = useState({ id: '', description: '', format: 'image', cc_only: false });
  const [saving, setSaving] = useState<string | null>(null);

  if (isLoading) return <div className="animate-pulse h-40 rounded-lg bg-[var(--bg-subtle)]" />;
  if (error || !data) return <div className="text-[var(--text-muted)]">加载失败</div>;

  const { modules, audience_types } = data;

  const toggleRouting = async (moduleId: string, audience: string, current: boolean) => {
    setSaving(`${moduleId}-${audience}`);
    await fetch(`${API}/api/notifications/routing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: moduleId, audience, enabled: !current }),
    });
    mutate(`${API}/api/notifications/routing`);
    setSaving(null);
  };

  const saveDescription = async (moduleId: string) => {
    await fetch(`${API}/api/notifications/modules/${moduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editDesc }),
    });
    setEditingModule(null);
    mutate(`${API}/api/notifications/routing`);
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm(`确定删除模块 "${moduleId}"？`)) return;
    await fetch(`${API}/api/notifications/modules/${moduleId}`, { method: 'DELETE' });
    mutate(`${API}/api/notifications/routing`);
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
      mutate(`${API}/api/notifications/routing`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-[var(--text-secondary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            内容模块 × 受众路由
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            {modules.length} 个模块 · {audience_types.length} 个受众级别
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新增模块
        </button>
      </div>

      {/* Add Module Form */}
      {showAdd && (
        <div className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">模块 ID</label>
              <input
                value={newModule.id}
                onChange={e => setNewModule({ ...newModule, id: e.target.value })}
                placeholder="例: new_metrics"
                className="w-full px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-lg
                           bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">描述</label>
              <input
                value={newModule.description}
                onChange={e => setNewModule({ ...newModule, description: e.target.value })}
                placeholder="模块描述"
                className="w-full px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-lg
                           bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action)]"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <select
                value={newModule.format}
                onChange={e => setNewModule({ ...newModule, format: e.target.value })}
                className="px-2 py-1 text-xs border border-[var(--border-default)] rounded bg-[var(--bg-primary)]"
              >
                <option value="image">图片</option>
                <option value="markdown">Markdown</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={newModule.cc_only}
                onChange={e => setNewModule({ ...newModule, cc_only: e.target.checked })}
                className="rounded"
              />
              仅 CC
            </label>
            <div className="flex-1" />
            <button onClick={() => setShowAdd(false)} className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              取消
            </button>
            <button
              onClick={addModule}
              disabled={!newModule.id.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg
                         bg-[var(--action)] text-white hover:bg-[var(--action-accent)]
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-3 h-3" />
              保存
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
                内容模块
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-[90px]">
                格式
              </th>
              {audience_types.map(aud => (
                <th key={aud} className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider w-[100px]">
                  <span className={AUDIENCE_COLORS[aud] || 'text-[var(--text-secondary)]'}>
                    {AUDIENCE_LABELS[aud] || aud}
                  </span>
                </th>
              ))}
              <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--text-muted)] w-[80px]">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {modules.map(mod => {
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
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
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
                              onChange={e => setEditDesc(e.target.value)}
                              className="flex-1 px-2 py-0.5 text-xs border border-[var(--border-default)] rounded
                                         bg-[var(--bg-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action)]"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') saveDescription(mod.id); if (e.key === 'Escape') setEditingModule(null); }}
                            />
                            <button onClick={() => saveDescription(mod.id)} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingModule(null)} className="p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] rounded">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p
                            className="text-xs text-[var(--text-muted)] mt-0.5 truncate cursor-pointer hover:text-[var(--text-secondary)]"
                            onClick={() => { setEditingModule(mod.id); setEditDesc(mod.description); }}
                            title="点击编辑描述"
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
                      {mod.format === 'image' ? '图片' : '文本'}
                    </div>
                  </td>

                  {/* Audience Toggles */}
                  {audience_types.map(aud => {
                    const enabled = mod.audiences[aud];
                    const key = `${mod.id}-${aud}`;
                    const isSaving = saving === key;

                    return (
                      <td key={aud} className="text-center px-3 py-3">
                        <button
                          onClick={() => toggleRouting(mod.id, aud, enabled)}
                          disabled={isSaving}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                            ${enabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
                            } ${isSaving ? 'opacity-50' : ''}`}
                          title={enabled ? '已启用 — 点击关闭' : '已关闭 — 点击启用'}
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
                        onClick={() => { setEditingModule(mod.id); setEditDesc(mod.description); }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--action)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors"
                        title="编辑描述"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteModule(mod.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除模块"
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
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">角色指标口径</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(data.role_metrics).map(([role, metrics]) => (
              <div key={role} className="p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
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
                            <span key={item} className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
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
