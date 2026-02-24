import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// 规范：所有的 Props 继承必须规范化，并留有 className 对外开放
export interface FlashCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

/**
 * FlashUI 标准容器卡片
 * 从此处的 Database 拷贝后运用到业务代码中。
 * 特性：弥散阴影、透明边框、超大圆角。
 */
export function FlashCard({ children, className, hoverable = true }: FlashCardProps) {
  return (
    <div
      className={cn(
        "bg-white/95 backdrop-blur-md rounded-2xl border border-white/40 p-6",
        "shadow-flash transition-all duration-500", // 核心光影：使用 shadow-flash
        hoverable && "hover:shadow-flash-lg hover:-translate-y-1 cursor-default",
        className
      )}
    >
      {children}
    </div>
  );
}
