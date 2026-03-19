"use client";

import { useState } from "react";
import { Filter, Calendar, Users, Search } from "lucide-react";

export function GlobalFilterBar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 w-full bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-slate-200 shadow-sm flex-shrink-0">
      {/* Mobile Toggle */}
      <div className="md:hidden flex items-center justify-between p-3">
        <span className="text-sm font-semibold text-[var(--text-primary)]">全局数据筛选</span>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 hover:bg-slate-100 text-[var(--text-secondary)] rounded-md transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop & Mobile Expanded View */}
      <div className={`md:flex items-center justify-between px-4 py-2.5 transition-all duration-300 origin-top overflow-hidden ${isMobileOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 md:max-h-full md:opacity-100'}`}>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
          {/* Left: Time Range */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-50 text-[var(--text-secondary)] rounded hidden md:block">
              <Calendar className="w-4 h-4" />
            </div>
            <select className="bg-[var(--bg-surface)] hover:bg-slate-50 cursor-pointer border border-slate-200 text-[var(--text-primary)] text-sm font-medium rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 block w-full md:w-auto px-3 py-1.5 outline-none transition-colors">
              <option value="this_month">本月 (This Month)</option>
              <option value="this_week">本周 (This Week)</option>
              <option value="last_month">上月 (Last Month)</option>
              <option value="custom">自定义日期...</option>
            </select>
          </div>

          {/* Center: Team Filter */}
          <div className="flex items-center gap-2 flex-1 md:justify-center">
            <div className="p-1.5 bg-slate-50 text-[var(--text-secondary)] rounded hidden md:block">
              <Users className="w-4 h-4" />
            </div>
            <select className="bg-[var(--bg-surface)] hover:bg-slate-50 cursor-pointer border border-slate-200 text-[var(--text-primary)] text-sm font-medium rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 block w-full md:w-48 px-3 py-1.5 outline-none transition-colors">
              <option value="all">所有团队 (All Teams)</option>
              <option value="team_a">A 组 / Team A</option>
              <option value="team_b">B 组 / Team B</option>
              <option value="team_c">渠道团队 / Partnership</option>
            </select>
          </div>
        </div>

        {/* Right: CC Search */}
        <div className="relative w-full md:w-64 mt-4 md:mt-0">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <input
            type="text"
            className="bg-slate-50 border border-slate-200 text-[var(--text-primary)] text-sm rounded-full focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 block w-full pl-9 pr-4 py-1.5 outline-none transition-all placeholder:text-[var(--text-muted)]" 
            placeholder="搜索/选择特定 CC..." 
          />
        </div>

      </div>
    </div>
  );
}
