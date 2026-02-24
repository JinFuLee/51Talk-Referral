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

import useSWR from 'swr'
import { FunnelSlide } from '@/components/presentation/FunnelSlide'

const mockUseSWR = vi.mocked(useSWR)

/** Realistic payload shape from /api/analysis/funnel */
const mockFunnelData = {
  data: {
    active_students: 500,
    reached: 350,
    participated: 280,
    registered: 180,
    booked: 120,
    attended: 90,
    paid: 45,
    contact_rate: 0.70,
    participation_rate: 0.56,
    reached_rate_gap: 0.02,
    participated_rate_gap: -0.04,
    registered_rate_gap: 0.01,
    booked_rate_gap: -0.08,
    attended_rate_gap: -0.02,
    paid_rate_gap: 0.05,
  },
}

describe('FunnelSlide — smoke test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSWR.mockReturnValue({
      data: mockFunnelData,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)
  })

  it('renders without crashing when data is available', () => {
    const { container } = render(<FunnelSlide revealStep={8} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('displays all seven funnel stage labels', () => {
    render(<FunnelSlide revealStep={8} />)
    expect(screen.getByText('有效学员')).toBeInTheDocument()
    expect(screen.getByText('触达')).toBeInTheDocument()
    expect(screen.getByText('参与')).toBeInTheDocument()
    expect(screen.getByText('注册')).toBeInTheDocument()
    // "约课" appears in both the funnel bar and the bottleneck summary — use getAllByText
    expect(screen.getAllByText('约课').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('出席')).toBeInTheDocument()
    // "付费" appears in funnel bar and "付费人数" label — target the funnel bar span
    expect(screen.getAllByText('付费').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the bottom summary section with key metrics', () => {
    render(<FunnelSlide revealStep={8} />)
    expect(screen.getByText('整体转化率')).toBeInTheDocument()
    expect(screen.getByText('关键瓶颈')).toBeInTheDocument()
    expect(screen.getByText('付费人数')).toBeInTheDocument()
  })

  it('shows loading spinner when isLoading is true', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: true,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)
    const { container } = render(<FunnelSlide revealStep={8} />)
    // Spinner div has animate-spin class
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).not.toBeNull()
  })

  it('shows error state when API call fails', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: new Error('fetch failed'),
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>)
    render(<FunnelSlide revealStep={8} />)
    expect(screen.getByText('数据加载失败，请稍后重试')).toBeInTheDocument()
  })
})
