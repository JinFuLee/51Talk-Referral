'use client';

// ── 统一筛选栏 ─────────────────────────────────────────────────────────────────
// 单行水平排列，4 组用竖线分隔：
// [围场 pills] | [角色 toggle] | [团队 select] | [CC搜索 + 清除]

interface UnifiedFilterBarProps {
  role: string;
  onRoleChange: (r: string) => void;
  activeRoles: string[];
  team: string;
  onTeamChange: (t: string) => void;
  teams: string[];
  ccSearch: string;
  onCCSearchChange: (s: string) => void;
  enclosure: string | null;
  onEnclosureChange: (e: string | null) => void;
  kpiEnclosures: string[];
  onClearAll: () => void;
  hasFilter: boolean;
}

// 全量围场列表（M0～M12+）
const ALL_ENCLOSURES = [
  'M0', 'M1', 'M2',
  'M3', 'M4', 'M5',
  'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M12+',
] as const;

// 围场分组（视觉分组，用间距隔开）
const ENCLOSURE_GROUPS = [
  ['M0', 'M1', 'M2'],
  ['M3', 'M4', 'M5'],
  ['M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M12+'],
] as const;

export function UnifiedFilterBar({
  role,
  onRoleChange,
  activeRoles,
  team,
  onTeamChange,
  teams,
  ccSearch,
  onCCSearchChange,
  enclosure,
  onEnclosureChange,
  kpiEnclosures,
  onClearAll,
  hasFilter,
}: UnifiedFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b border-[var(--border-subtle)]">
      {/* ── 围场 pills ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 flex-shrink-0">
        {/* 全部围场按钮 */}
        <button
          onClick={() => onEnclosureChange(null)}
          className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
            enclosure === null
              ? 'bg-[var(--color-action,#1B365D)] text-white font-medium'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)]'
          }`}
        >
          全部
        </button>

        {/* 分组围场 pills */}
        {ENCLOSURE_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-1 flex-shrink-0">
            {/* 组间隔：非第一组前加小间距 */}
            {gi > 0 && <span className="w-1.5 flex-shrink-0" />}
            {group.map((enc) => {
              const isKpi = kpiEnclosures.includes(enc);
              const isSelected = enclosure === enc;
              return (
                <button
                  key={enc}
                  onClick={() => onEnclosureChange(enc)}
                  title={isKpi ? undefined : '非考核范围'}
                  className={`px-2 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
                    isSelected
                      ? isKpi
                        ? 'bg-[var(--color-action,#1B365D)] text-white font-medium'
                        : 'bg-gray-200 text-gray-700 font-medium'
                      : isKpi
                        ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)]'
                        : 'border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
                  }`}
                >
                  {enc}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="w-px h-5 bg-[var(--border-subtle)] flex-shrink-0 hidden sm:block" />

      {/* ── 角色 toggle ─────────────────────────────────────────────── */}
      <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden text-xs font-medium flex-shrink-0">
        {activeRoles.map((r) => (
          <button
            key={r}
            onClick={() => onRoleChange(r)}
            className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
              role === r
                ? 'bg-[var(--n-800,#1e293b)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="w-px h-5 bg-[var(--border-subtle)] flex-shrink-0 hidden sm:block" />

      {/* ── 团队下拉 ─────────────────────────────────────────────────── */}
      <select
        value={team}
        onChange={(e) => onTeamChange(e.target.value)}
        className="px-2.5 py-1.5 border border-[var(--border-subtle)] rounded-lg text-xs bg-[var(--bg-surface)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-action flex-shrink-0"
      >
        <option value="">全部团队</option>
        {teams.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* 分隔线 */}
      <div className="w-px h-5 bg-[var(--border-subtle)] flex-shrink-0 hidden sm:block" />

      {/* ── CC 搜索 ──────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs select-none pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          placeholder="搜索 CC..."
          value={ccSearch}
          onChange={(e) => onCCSearchChange(e.target.value)}
          className="pl-7 pr-7 py-1.5 border border-[var(--border-subtle)] rounded-lg text-xs bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action w-32"
        />
        {ccSearch && (
          <button
            onClick={() => onCCSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs"
            aria-label="清除搜索"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── 清除全部 ─────────────────────────────────────────────────── */}
      {hasFilter && (
        <button
          onClick={onClearAll}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:underline transition-colors flex-shrink-0 ml-auto"
        >
          清除筛选
        </button>
      )}
    </div>
  );
}
