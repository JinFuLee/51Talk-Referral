'use client';

import { useLocale } from 'next-intl';
import { useLabel, STUDENT_TAG_LABELS } from '@/lib/label-maps';

// 学员标签徽章组件 — 渲染彩色 pill badges

interface TagConfig {
  emoji: string;
  className: string;
}

/** Stable internal enum for style lookup */
type TagKey =
  | 'full_attendance'
  | 'active'
  | 'improving'
  | 'declining'
  | 'dormant_hp'
  | 'super_convert';

const TAG_STYLE: Record<TagKey, TagConfig> = {
  full_attendance: {
    emoji: '🏆',
    className: 'bg-warning-surface text-warning-token border-warning-token',
  },
  active: {
    emoji: '🌟',
    className: 'bg-success-surface text-success-token border-success-token',
  },
  improving: {
    emoji: '📈',
    className: 'bg-accent-surface text-accent-token border-accent-token',
  },
  declining: {
    emoji: '⚠️',
    className: 'bg-danger-surface text-danger-token border-danger-token',
  },
  dormant_hp: {
    emoji: '🔴',
    className: 'bg-subtle text-primary-token border-default-token animate-pulse',
  },
  super_convert: {
    emoji: '💎',
    className: 'bg-accent-surface text-accent-token border-accent-token',
  },
};

/** Per-locale display text → TagKey mapping */
const TAG_KEY_MAP: Record<string, Record<string, TagKey>> = {
  zh: {
    满勤: 'full_attendance',
    活跃: 'active',
    进步明显: 'improving',
    在退步: 'declining',
    沉睡高潜: 'dormant_hp',
    超级转化: 'super_convert',
  },
  'zh-TW': {
    滿勤: 'full_attendance',
    活躍: 'active',
    進步明顯: 'improving',
    在退步: 'declining',
    沉睡高潛: 'dormant_hp',
    超級轉化: 'super_convert',
  },
  en: {
    'Full Attendance': 'full_attendance',
    Active: 'active',
    Improving: 'improving',
    Declining: 'declining',
    'Dormant High-Pot': 'dormant_hp',
    'Super Converter': 'super_convert',
  },
  th: {
    เต็มพิกัด: 'full_attendance',
    กระตือรือร้น: 'active',
    พัฒนาขึ้น: 'improving',
    ถดถอย: 'declining',
    ศักยภาพสูงแต่หยุดชะงัก: 'dormant_hp',
    แปลงสูง: 'super_convert',
  },
};

function resolveStyle(tag: string, locale: string): TagConfig | undefined {
  const map = TAG_KEY_MAP[locale] ?? TAG_KEY_MAP['zh'];
  // Try locale-specific lookup first, then fall back to zh (for backend raw data)
  const key = map[tag] ?? TAG_KEY_MAP['zh'][tag];
  return key ? TAG_STYLE[key] : undefined;
}

/** 无法识别的标签 fallback 样式 */
const DEFAULT_CONFIG: TagConfig = {
  emoji: '🏷️',
  className: 'bg-subtle text-secondary-token border-default-token',
};

interface StudentTagBadgeProps {
  /** 学员标签列表，来自 StudentRow.tags */
  tags: string[];
  /** 可选：限制最多显示几个 badge（默认不限制） */
  maxVisible?: number;
}

/**
 * 学员标签徽章组件
 *
 * 将标签数组渲染为彩色 pill badges，
 * 支持满勤 / 活跃 / 进步明显 / 在退步 / 沉睡高潜 / 超级转化 六种样式。
 * 自动识别 zh/zh-TW/en/th 四语的标签字符串。
 *
 * 使用示例：
 * <StudentTagBadge tags={student.tags} />
 * <StudentTagBadge tags={student.tags} maxVisible={2} />
 */
export function StudentTagBadge({ tags, maxVisible }: StudentTagBadgeProps) {
  const locale = useLocale();
  const label = useLabel();
  if (!tags || tags.length === 0) return null;

  const visible = maxVisible != null ? tags.slice(0, maxVisible) : tags;
  const overflow = maxVisible != null ? tags.length - maxVisible : 0;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map((tag) => {
        const config = resolveStyle(tag, locale) ?? DEFAULT_CONFIG;
        return (
          <span
            key={tag}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
          >
            <span aria-hidden="true">{config.emoji}</span>
            <span>{label(STUDENT_TAG_LABELS, tag)}</span>
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-subtle text-secondary-token border border-default-token">
          +{overflow}
        </span>
      )}
    </div>
  );
}
