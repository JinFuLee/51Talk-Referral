'use client';

import Link from 'next/link';

/**
 * 403 无权限页面 — 双语（中/泰）
 * 当用户不在权限名单或无对应页面权限时 redirect 到此页
 */
export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-6">
      <div className="card-base max-w-md w-full text-center p-10 space-y-6">
        {/* 图标区 */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* 标题 */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-sm text-[var(--text-secondary)]">无权限访问此页面</p>
        </div>

        {/* 说明 */}
        <div className="space-y-1 text-sm text-[var(--text-muted)]">
          <p>คุณไม่ได้รับอนุญาตให้เข้าถึงหน้านี้</p>
          <p>您没有被授权访问该页面，请联系管理员申请权限。</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3 pt-2">
          <Link href="/" className="btn-primary text-sm py-2 px-4 rounded-lg inline-block">
            กลับหน้าหลัก &nbsp;/&nbsp; 返回首页
          </Link>
          <p className="text-xs text-[var(--text-muted)]">
            ติดต่อผู้ดูแลระบบ &nbsp;/&nbsp; 如需开通权限，请联系管理员
          </p>
        </div>
      </div>
    </div>
  );
}
