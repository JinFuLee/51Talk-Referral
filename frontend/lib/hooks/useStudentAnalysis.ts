'use client';

import { useFilteredSWR } from './use-filtered-swr';
import type { StudentAnalysisResponse } from '../types/checkin-student';

/**
 * 学员维度打卡分析数据钩子
 *
 * 封装 /api/checkin/student-analysis 端点，
 * 自动附加全局 teamFilter / focusCC 查询参数。
 *
 * @param extraParams 额外查询参数（如 { enclosure: 'M0,M1' }），null 值自动跳过
 *
 * 使用示例：
 *   const { data, error, isLoading } = useStudentAnalysis();
 *   const { data } = useStudentAnalysis({ enclosure: 'M0' });
 */
export function useStudentAnalysis(
  extraParams?: Record<string, string | null | undefined>
) {
  const { data, error, isLoading } = useFilteredSWR<StudentAnalysisResponse>(
    '/api/checkin/student-analysis',
    undefined,
    extraParams
  );

  return { data, error, isLoading };
}
