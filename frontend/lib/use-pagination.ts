/**
 * usePagination — 纯前端分页 hook
 * 数据已在内存中，支持越界保护和 data 变化时自动重置
 */
import { useState, useMemo, useEffect } from "react";

export function usePagination<T>(data: T[], pageSize: number = 20) {
  const [page, setPageRaw] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const totalItems = data.length;

  // data 长度变化时重置到第 1 页
  useEffect(() => {
    setPageRaw(1);
  }, [data.length]);

  const setPage = (p: number) => {
    setPageRaw(Math.min(Math.max(1, p), totalPages));
  };

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const nextPage = () => setPage(page + 1);
  const prevPage = () => setPage(page - 1);

  return {
    pageData,
    page,
    totalPages,
    totalItems,
    setPage,
    nextPage,
    prevPage,
  };
}
