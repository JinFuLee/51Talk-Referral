import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the useCountUp hook so the component renders the real value immediately
vi.mock('@/lib/use-count-up', () => ({
  useCountUp: (end: number) => end,
}))

import { KPICard } from '@/components/charts/KPICard'

const defaultProps = {
  title: 'Test Metric',
  actual: 1500,
  target: 2000,
  unit: '人',
  status: 'green' as const,
  progress: 0.75,
}

describe('KPICard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the title', () => {
    render(<KPICard {...defaultProps} />)
    expect(screen.getByText('Test Metric')).toBeInTheDocument()
  })

  it('displays the actual value formatted', () => {
    render(<KPICard {...defaultProps} actual={1500} />)
    // 1500 → "1.5k"
    expect(screen.getByText('1.5k')).toBeInTheDocument()
  })

  it('displays the target value in footer', () => {
    render(<KPICard {...defaultProps} target={2000} unit="人" />)
    // Text split across multiple spans: "目标 " + "2.0k" + "人"
    expect(screen.getByText(/目标/)).toBeInTheDocument()
    expect(screen.getByText(/2\.0k/)).toBeInTheDocument()
  })

  it('shows green status emoji for green status', () => {
    render(<KPICard {...defaultProps} status="green" />)
    expect(screen.getByText('🟢')).toBeInTheDocument()
  })

  it('shows red status emoji for red status', () => {
    render(<KPICard {...defaultProps} status="red" />)
    expect(screen.getByText('🔴')).toBeInTheDocument()
  })

  it('shows yellow status emoji for yellow status', () => {
    render(<KPICard {...defaultProps} status="yellow" />)
    expect(screen.getByText('🟡')).toBeInTheDocument()
  })

  it('displays remaining_daily_avg when provided', () => {
    render(<KPICard {...defaultProps} remaining_daily_avg={50} />)
    expect(screen.getByText(/达标需日均/)).toBeInTheDocument()
  })

  it('does not render enhanced metrics section when neither prop is provided', () => {
    render(<KPICard {...defaultProps} />)
    expect(screen.queryByText(/达标需日均/)).not.toBeInTheDocument()
    expect(screen.queryByText(/效率提升需求/)).not.toBeInTheDocument()
  })

  it('shows efficiency lift text when efficiency_lift_pct > 0', () => {
    render(<KPICard {...defaultProps} efficiency_lift_pct={12.5} />)
    expect(screen.getByText(/效率提升/)).toBeInTheDocument()
    expect(screen.getByText(/12.5%/)).toBeInTheDocument()
  })

  it('shows over-achieved text when efficiency_lift_pct <= 0', () => {
    render(<KPICard {...defaultProps} efficiency_lift_pct={-5} />)
    expect(screen.getByText(/超额/)).toBeInTheDocument()
  })

  it('renders comparison row when comparison is provided', () => {
    const comparison = { value: 1200, changePct: 25, label: '上月同期' }
    render(<KPICard {...defaultProps} comparison={comparison} />)
    expect(screen.getByText('上月同期')).toBeInTheDocument()
    expect(screen.getByText(/25.0%/)).toBeInTheDocument()
  })

  it('does not render comparison row when comparison is null', () => {
    render(<KPICard {...defaultProps} comparison={null} />)
    expect(screen.queryByText(/上月同期/)).not.toBeInTheDocument()
  })

  it('renders progress percentage', () => {
    render(<KPICard {...defaultProps} progress={0.75} />)
    expect(screen.getByText(/75%/)).toBeInTheDocument()
  })
})
