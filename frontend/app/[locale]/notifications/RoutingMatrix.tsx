'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { mutate } from 'swr';
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
  all: 'text-accent-token',
  tl: 'text-warning-token',
  ops: 'text-accent-token',
};

const FORMAT_ICONS: Record<string, typeof Image> = {
  image: Image,
  markdown: FileText,
};

export function RoutingMatrix() {
    const t = useTranslations('RoutingMatrix');

  const AUDIENCE_LABELS: Record<string, string> = {
    all: t('audienceAll'),
    tl: t('audienceTl'),
    ops: t('audienceOps'),
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

  if (isLoading) return <div className="animate-pulse h-40 rounded-lg bg-subtle" />;
  if (error || !data) return <div className="text-muted-token">{t('loadFailed')}</div>;

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
    if (!confirm(`${t('confirmDelete')} "${moduleId}"？`)) return;
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
          <Grid3X3 className="w-5 h-5 text-secondary-token" />
          <h3 className="text-sm font-semibold text-primary-token">{t('contentModuleXAudience')}</h3>
          <span className="text-xs text-muted-token">
            {modules.length} {t('modules')} · {audience_types.length} {t('audienceLevels')}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg
 bg-subtle hover:bg-bg-elevated transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('addModule')}
        </button>
      </div>

      {/* Add Module Form */}
      {showAdd && (
        <div className="p-4 rounded-lg border border-default-token bg-surface space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-token mb-1 block">{t('moduleId')}</label>
              <input
                value={newModule.id}
                onChange={(e) => setNewModule({ ...newModule, id: e.target.value })}
                placeholder={t('moduleIdPlaceholder')}
                className="w-full px-3 py-1.5 text-sm border border-default-token rounded-lg
 bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-token"
              />
            </div>
            <div>
              <label className="text-xs text-muted-token mb-1 block">{t('description')}</label>
              <input
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                className="w-full px-3 py-1.5 text-sm border border-default-token rounded-lg
 bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-token"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <select
                value={newModule.format}
                onChange={(e) => setNewModule({ ...newModule, format: e.target.value })}
                className="px-2 py-1 text-xs border border-default-token rounded bg-bg-primary"
              >
                <option value="image">{t('image')}</option>
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
              {t('ccOnly')}
            </label>
            <div className="flex-1" />
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1 text-xs text-muted-token hover:text-primary-token"
            >
              {t('cancel')}
            </button>
            <button
              onClick={addModule}
              disabled={!newModule.id.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg
 bg-action-token text-white hover:bg-action-accent-token
 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-3 h-3" />
              {t('save')}
            </button>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-default-token">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-token uppercase tracking-wider w-[280px]">
                {t('contentModule')}
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-secondary-token uppercase tracking-wider w-[90px]">
                {t('format')}
              </th>
              {audience_types.map((aud) => (
                <th
                  key={aud}
                  className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider w-[100px]"
                >
                  <span className={AUDIENCE_COLORS[aud] || 'text-secondary-token'}>
                    {AUDIENCE_LABELS[aud] || aud}
                  </span>
                </th>
              ))}
              <th className="text-center px-3 py-3 text-xs font-semibold text-muted-token w-[80px]">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {modules.map((mod) => {
              const FormatIcon = FORMAT_ICONS[mod.format] || Image;
              const isEditing = editingModule === mod.id;

              return (
                <tr key={mod.id} className="hover:bg-subtle transition-colors">
                  {/* Module Name + Description */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-primary-token">{mod.id}</span>
                          {mod.cc_only && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-warning-surface text-warning-token">
                              CC
                            </span>
                          )}
                          {mod.per_team && <Users className="w-3.5 h-3.5 text-muted-token" />}
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="flex-1 px-2 py-0.5 text-xs border border-default-token rounded
 bg-bg-primary focus:outline-none focus:ring-1 focus:ring-action-token"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveDescription(mod.id);
                                if (e.key === 'Escape') setEditingModule(null);
                              }}
                            />
                            <button
                              onClick={() => saveDescription(mod.id)}
                              className="p-0.5 text-success-token hover:bg-success-surface rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingModule(null)}
                              className="p-0.5 text-muted-token hover:bg-subtle rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p
                            className="text-xs text-muted-token mt-0.5 truncate cursor-pointer hover:text-secondary-token"
                            onClick={() => {
                              setEditingModule(mod.id);
                              setEditDesc(mod.description);
                            }}
                            title={t('clickToEditDesc')}
                          >
                            {mod.description || '—'}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Format */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-token">
                      <FormatIcon className="w-3.5 h-3.5" />
                      {mod.format === 'image' ? t('image') : t('text')}
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
     ? 'bg-success-surface text-success-token hover:bg-success-surface'
     : 'bg-subtle text-muted-token hover:bg-bg-elevated'
 } ${isSaving ? 'opacity-50' : ''}`}
                          title={enabled ? t('enabledClickToDisable') : t('disabledClickToEnable')}
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
                        className="p-1.5 text-muted-token hover:text-action-token hover:bg-subtle rounded-lg transition-colors"
                        title={t('editDescription')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteModule(mod.id)}
                        className="p-1.5 text-muted-token hover:text-danger-token hover:bg-danger-surface rounded-lg transition-colors"
                        title={t('deleteModule')}
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
            <Shield className="w-4 h-4 text-secondary-token" />
            <h4 className="text-sm font-semibold text-primary-token">{t('roleMetrics')}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(data.role_metrics).map(([role, metrics]) => (
              <div key={role} className="p-3 rounded-lg border border-default-token bg-surface">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-primary-token">{role}</span>
                  <span className="text-xs text-muted-token">
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
                        <span className="text-[10px] font-medium text-muted-token uppercase w-16 shrink-0 pt-0.5">
                          {category}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {itemList.map((item: string) => (
                            <span
                              key={item}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-subtle text-secondary-token"
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
