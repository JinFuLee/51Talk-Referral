'use client';

// 学员标签徽章组件 — 渲染彩色 pill badges

interface TagConfig {
  emoji: string;
  className: string;
}

const TAG_CONFIG: Record<string, TagConfig> = {
  满勤: {
    emoji: '🏆',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  活跃: {
    emoji: '🌟',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  进步明显: {
    emoji: '📈',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  在退步: {
    emoji: '⚠️',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  沉睡高潜: {
    emoji: '🔴',
    className: 'bg-gray-100 text-gray-800 border-gray-200 animate-pulse',
  },
  超级转化: {
    emoji: '💎',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

/** 无法识别的标签 fallback 样式 */
const DEFAULT_CONFIG: TagConfig = {
  emoji: '🏷️',
  className: 'bg-gray-100 text-gray-700 border-gray-200',
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
 *
 * 使用示例：
 *   <StudentTagBadge tags={student.tags} />
 *   <StudentTagBadge tags={student.tags} maxVisible={2} />
 */
export function StudentTagBadge({ tags, maxVisible }: StudentTagBadgeProps) {
  if (!tags || tags.length === 0) return null;

  const visible = maxVisible != null ? tags.slice(0, maxVisible) : tags;
  const overflow = maxVisible != null ? tags.length - maxVisible : 0;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map((tag) => {
        const config = TAG_CONFIG[tag] ?? DEFAULT_CONFIG;
        return (
          <span
            key={tag}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
          >
            <span aria-hidden="true">{config.emoji}</span>
            <span>{tag}</span>
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          +{overflow}
        </span>
      )}
    </div>
  );
}
