'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  FileText,
  Settings,
} from 'lucide-react';
import { useLocale,  useTranslations } from 'next-intl';
// ── 分类配置（与 PageOverview 保持一致）────────────────────────────────────

const CATEGORY_INFO: Record<
  string,
  { zh: string; 'zh-TW': string; en: string; th: string; icon: React.ReactNode }
> = {
  ops_core: {
    zh: '运营核心',
    'zh-TW': '運營核心',
    en: 'Ops Core',
    th: 'แกนปฏิบัติการ',
    icon: <BarChart3 className="w-3.5 h-3.5" />,
  },
  performance: {
    zh: '业绩管理',
    'zh-TW': '業績管理',
    en: 'Performance',
    th: 'การจัดการผลงาน',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  student: {
    zh: '学员管理',
    'zh-TW': '學員管理',
    en: 'Student Mgmt',
    th: 'จัดการนักเรียน',
    icon: <Users className="w-3.5 h-3.5" />,
  },
  risk: {
    zh: '风险与质量',
    'zh-TW': '風險與品質',
    en: 'Risk & Quality',
    th: 'ความเสี่ยงและคุณภาพ',
    icon: <Shield className="w-3.5 h-3.5" />,
  },
  reports: {
    zh: '报告汇报',
    'zh-TW': '報告匯報',
    en: 'Reports',
    th: 'รายงาน',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  system: {
    zh: '系统管理',
    'zh-TW': '系統管理',
    en: 'System',
    th: 'ระบบ',
    icon: <Settings className="w-3.5 h-3.5" />,
  },
};

const PRESET_COLORS = ['#1B365D', '#2D9F6F', '#E8932A', '#E05545', '#5576A8', '#7C3AED'];

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface RoleDef {
  id: string;
  name_zh: string;
  name_en?: string;
  color: string;
  is_preset: boolean;
  page_count?: number;
  user_count?: number;
  allowed_pages?: string[];
}

interface PageEntry {
  path: string;
  name_zh: string;
  name_en?: string;
  category: string;
}

interface RoleEditorProps {
  roles: RoleDef[];
  pages: PageEntry[];
  onSaveRole: (role: Partial<RoleDef> & { id: string }) => Promise<void>;
  onCreateRole: (name: string, color: string) => Promise<void>;
}

// ── 页面 Checkbox 分组 ────────────────────────────────────────────────────────
function PageChecklist({
  pages,
  selectedPaths,
  onToggle,
  lang,
}: {
  pages: PageEntry[];
  selectedPaths: Set<string>;
  onToggle: (path: string) => void;
  lang: 'zh' | 'zh-TW' | 'en' | 'th';
}) {
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const t = useTranslations('RoleEditor');
  const grouped: Record<string, PageEntry[]> = {};
  for (const p of pages) {
    const cat = p.category || 'system';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  function toggleCat(cat: string) {
    setOpenCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function selectAllInCat(cat: string) {
    for (const p of grouped[cat] ?? []) {
      if (!selectedPaths.has(p.path)) onToggle(p.path);
    }
  }

  function clearAllInCat(cat: string) {
    for (const p of grouped[cat] ?? []) {
      if (selectedPaths.has(p.path)) onToggle(p.path);
    }
  }

  return (
    <div className="space-y-2">
      {Object.keys(CATEGORY_INFO)
        .filter((k) => grouped[k]?.length)
        .map((catKey) => {
          const catPages = grouped[catKey];
          const catInfo = CATEGORY_INFO[catKey];
          const allSelected = catPages.every((p) => selectedPaths.has(p.path));
          const someSelected = catPages.some((p) => selectedPaths.has(p.path));
          const isOpen = openCats[catKey] !== false; // default open

          return (
            <div key={catKey} className="border border-subtle-token rounded-lg overflow-hidden">
              {/* 分类标题栏 */}
              <div className="flex items-center justify-between px-3 py-2 bg-subtle">
                <button
                  onClick={() => toggleCat(catKey)}
                  className="flex items-center gap-2 text-sm font-medium text-primary-token"
                >
                  <span className="text-muted-token">{catInfo.icon}</span>
                  <span>{catInfo[lang] ?? catInfo.zh}</span>
                  <span className="text-xs text-muted-token">
                    ({catPages.filter((p) => selectedPaths.has(p.path)).length}/{catPages.length})
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-token" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-token" />
                  )}
                </button>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => (allSelected ? clearAllInCat(catKey) : selectAllInCat(catKey))}
                    className="text-muted-token hover:text-secondary-token transition-colors"
                  >
                    {allSelected ? t('clearAll') : t('selectAll')}
                  </button>
                  {someSelected && !allSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-action shrink-0" />
                  )}
                </div>
              </div>

              {/* 页面列表 */}
              {isOpen && (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {catPages.map((page) => (
                    <label
                      key={page.path}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-subtle transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPaths.has(page.path)}
                        onChange={() => onToggle(page.path)}
                        className="w-4 h-4 rounded border-default-token text-action accent-action cursor-pointer focus-visible:ring-2 focus-visible:ring-action"
                      />
                      <span className="text-sm text-primary-token">
                        {lang !== 'zh' && lang !== 'zh-TW' && page.name_en
                          ? page.name_en
                          : page.name_zh}
                      </span>
                      <span className="text-xs text-muted-token ml-auto">{page.path}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function RoleEditor({ roles, pages, onSaveRole, onCreateRole }: RoleEditorProps) {
  const t = useTranslations('RoleEditor');
  const locale = useLocale();
  const lang = (['zh', 'zh-TW', 'en', 'th'].includes(locale) ? locale : 'en') as 'zh' | 'zh-TW' | 'en' | 'th';
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const editingRole = roles.find((r) => r.id === editingRoleId);

  function startEdit(role: RoleDef) {
    setEditingRoleId(role.id);
    setSelectedPages(new Set(role.allowed_pages ?? []));
  }

  function cancelEdit() {
    setEditingRoleId(null);
    setSelectedPages(new Set());
  }

  function togglePage(path: string) {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleSavePermissions() {
    if (!editingRoleId) return;
    setSaving(true);
    try {
      await onSaveRole({
        id: editingRoleId,
        allowed_pages: Array.from(selectedPages),
      });
      toast.success(t('toastSaved'));
      cancelEdit();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('toastSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newRoleName.trim()) return;
    setSaving(true);
    try {
      await onCreateRole(newRoleName.trim(), newRoleColor);
      toast.success(t('toastCreated'));
      setNewRoleName('');
      setNewRoleColor(PRESET_COLORS[0]);
      setShowCreate(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('toastCreateFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-token">{t('roleCount', { n: roles.length })}</span>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 btn-secondary text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('createRole')}
        </button>
      </div>

      {/* 新建角色表单 */}
      {showCreate && (
        <div className="card-base p-4 space-y-3 border-action/30">
          <h4 className="text-sm font-medium text-primary-token">{t('createRole')}</h4>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="input-base flex-1"
              placeholder={t('namePlaceholder')}
            />
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewRoleColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    newRoleColor === c ? 'border-default-token scale-125' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-xs">
              {t('cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !newRoleName.trim()}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      )}

      {/* 角色列表 */}
      <div className="space-y-3">
        {roles.length === 0 && (
          <div className="state-empty">
            <Shield className="w-8 h-8 text-n-300" />
            <span className="text-sm">{t('noRoles')}</span>
          </div>
        )}

        {roles.map((role) => {
          const isEditing = editingRoleId === role.id;

          return (
            <div key={role.id} className="card-base p-4 space-y-3">
              {/* 角色头部 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="text-sm font-semibold text-primary-token">
                    {lang !== 'zh' && lang !== 'zh-TW' && role.name_en
                      ? role.name_en
                      : role.name_zh}
                  </span>
                  {role.is_preset && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-n-100 text-muted-token font-medium">
                      {t('preset')}
                    </span>
                  )}
                  <span className="text-xs text-muted-token">
                    {role.page_count ?? 0}
                    {t('pages')}
                  </span>
                  {role.user_count !== undefined && (
                    <span className="text-xs text-muted-token">
                      {role.user_count}
                      {t('users')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSavePermissions}
                        disabled={saving}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success-token text-white text-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        <Check className="w-3 h-3" />
                        {saving ? t('saving') : t('save')}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-default-token text-xs hover:bg-subtle transition-colors"
                      >
                        <X className="w-3 h-3" />
                        {t('cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(role)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-default-token text-xs hover:bg-subtle transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      {t('editRole')}
                    </button>
                  )}
                </div>
              </div>

              {/* 页面权限编辑区 */}
              {isEditing && (
                <PageChecklist
                  pages={pages}
                  selectedPaths={selectedPages}
                  onToggle={togglePage}
                  lang={lang}
                />
              )}

              {/* 非编辑状态：显示已授权页面摘要 */}
              {!isEditing && role.allowed_pages && role.allowed_pages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {role.allowed_pages.slice(0, 8).map((path) => {
                    const page = pages.find((p) => p.path === path);
                    return (
                      <span
                        key={path}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-muted-token"
                      >
                        {page?.name_zh ?? path}
                      </span>
                    );
                  })}
                  {role.allowed_pages.length > 8 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-muted-token">
                      +{role.allowed_pages.length - 8}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
