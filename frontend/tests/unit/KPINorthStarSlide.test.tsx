import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Mock SWR ──────────────────────────────────────────────────────────────────
vi.mock('swr', () => ({
  default: vi.fn(),
}))

// ── Mock @/lib/api ────────────────────────────────────────────────────────────
vi.mock('@/lib/api', () => ({
  swrFetcher: vi.fn(),
}))

// ── Mock Recharts (RadialBarChart / ResponsiveContainer use ResizeObserver
//    and SVG APIs unavailable in jsdom) ────────────────────────────────────────
vi.mock('recharts', () => ({
  RadialBarChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="radial-bar-chart">{children}</div>
  ),
  RadialBar: () => <div data-testid="radial-bar" />,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PolarAngleAxis: () => null,
}))

import React from 'react'
import useSWR from 'swr'
import { KPINorthStarSlide } from '@/components/presentation/KPINorthStarSlide'

const mockUseSWR = vi.mocked(useSWR)

const mockNorthStarData = {
  by_cc: [
    { cc_name: 'Alice', checkin_24h_rate: 0.92 },
    { cc_name: 'Bob', checkin_24h_rate: 0.85 },
    { cc_name: 'Carol', checkin_24h_rate: 0.78 },
    { cc_name: 'Dave', checkin_24h_rate: 0.45 },
    { cc_name: 'Eve', checkin_24h_rate: 0.30 },
  ],
  by_team: [],
  summary: {
    avg_checkin_24h_rate: 0.66,
    target: 0.5,
    total_achievement: 0.66,
  },
  achieved_count: 3,
  total_cc: 5,
}

const mockCheckinABData = {
  merged: [
    { cc_name: 'Alice', checkin_monthly_rate: 0.9, checkin_multiplier: 1.8 },
    { cc_name: 'Bob', checkin_monthly_rate: 0.8, checkin_multiplier: 1.5 },
  ],
  d5_summary: { avg_checkin_rate: 0.85, avg_referral_participation: 0.6 },
  d1_summary: { avg_checkin_24h_rate: 0.66, target: 0.5 },
}

describe('KPINorthStarSlide — smoke test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // First call → north-star, second call → checkin-ab
    mockUseSWR
      .mockReturnValueOnce({
        data: mockNorthStarData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({
        data: mockCheckinABData,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      } as ReturnType<typeof useSWR>)
  })

  it('renders without crashing', () => {
    const { container } = render(<KPINorthStarSlide revealStep={3} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('displays the slide title', () => {
    render(<KPINorthStarSlide revealStep={3} />)
    // h2 contains the exact text "北极星指标：打卡率" (with star icons as siblings)
    expect(screen.getByText('北极星指标：打卡率')).toBeInTheDocument()
    // subtitle paragraph is unique
    expect(screen.getByText('KPI North Star — 打卡率 × 打卡倍率')).toBeInTheDocument()
  })

  it('shows achieved count and total CC', () => {
    render(<KPINorthStarSlide revealStep={3} />)
    // "3/5" rendered as a single text node inside the component
    expect(screen.getByText('3/5')).toBeInTheDocument()
    expect(screen.getByText('人达标')).toBeInTheDocument()
  })

  it('shows top-5 and bottom-5 section labels', () => {
    render(<KPINorthStarSlide revealStep={3} />)
    expect(screen.getByText('Top 5 打卡达人')).toBeInTheDocument()
    expect(screen.getByText('Bottom 5 需关注')).toBeInTheDocument()
  })

  it('displays error state when north-star API fails', () => {
    // Override the default return value so ALL useSWR calls return an error state.
    // mockReturnValue (no "Once") takes priority over any queued once-values.
    mockUseSWR.mockReset()
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: new Error('network error'),
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)
    render(<KPINorthStarSlide revealStep={3} />)
    expect(screen.getByText('北极星数据加载失败')).toBeInTheDocument()
  })
})
