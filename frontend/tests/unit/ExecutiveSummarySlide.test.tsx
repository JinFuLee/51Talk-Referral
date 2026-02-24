import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Mock SWR before importing the component ───────────────────────────────────
vi.mock('swr', () => ({
  default: vi.fn(),
}))

// ── Mock @/lib/api (swrFetcher is never called; SWR is fully mocked) ──────────
vi.mock('@/lib/api', () => ({
  swrFetcher: vi.fn(),
}))

import useSWR from 'swr'
import { ExecutiveSummarySlide } from '@/components/presentation/ExecutiveSummarySlide'

const mockUseSWR = vi.mocked(useSWR)

/** Minimal summary shape returned by /api/analysis/summary */
const mockSummaryData = {
  data: {
    registrations: { actual: 120, gap: 10, mom_pct: 5.2 },
    payments: { actual: 45, gap: -3, mom_pct: -2.1 },
    revenue: { actual: 8500, target: 10000, gap: -1500, mom_pct: 3.0 },
    checkin_rate: { actual: 0.62, gap: 0.02, mom_pct: 1.5 },
    conversion_rate: { actual: 0.375, gap: -0.025 },
    roi: { actual: 2.1, mom_pct: 0.3 },
    time_progress: 0.70,
  },
}

describe('ExecutiveSummarySlide — smoke test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Every useSWR call returns the same summary payload
    mockUseSWR.mockReturnValue({
      data: mockSummaryData,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)
  })

  it('renders without crashing when data is available', () => {
    const { container } = render(<ExecutiveSummarySlide revealStep={6} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('displays all six KPI card labels', () => {
    render(<ExecutiveSummarySlide revealStep={6} />)
    expect(screen.getByText('注册数 (leads)')).toBeInTheDocument()
    expect(screen.getByText('付费单量')).toBeInTheDocument()
    expect(screen.getByText('转介绍业绩')).toBeInTheDocument()
    expect(screen.getByText('打卡率')).toBeInTheDocument()
    expect(screen.getByText('注册→付费转化率')).toBeInTheDocument()
    expect(screen.getByText('ROI')).toBeInTheDocument()
  })

  it('renders month progress bar section when revealStep >= 6', () => {
    render(<ExecutiveSummarySlide revealStep={6} />)
    expect(screen.getByText('月度进度')).toBeInTheDocument()
    expect(screen.getByText(/时间进度/)).toBeInTheDocument()
    expect(screen.getByText(/业绩完成/)).toBeInTheDocument()
  })

  it('renders gracefully with empty data (all zeros)', () => {
    mockUseSWR.mockReturnValue({
      data: { data: {} },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)
    const { container } = render(<ExecutiveSummarySlide revealStep={0} />)
    expect(container.firstChild).not.toBeNull()
    // ROI card value should fall back to "0.00x"
    expect(screen.getByText('0.00x')).toBeInTheDocument()
  })
})
