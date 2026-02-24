import { describe, it, expect } from 'vitest'
import { formatRevenue, formatUSD, formatUSDShort, cn } from '@/lib/utils'

// ── formatRevenue ─────────────────────────────────────────────────────────────
describe('formatRevenue', () => {
  it('formats $1234 with default rate 34 → $1,234 (฿41,956)', () => {
    const result = formatRevenue(1234)
    expect(result).toBe('$1,234 (฿41,956)')
  })

  it('formats 0 → $0 (฿0)', () => {
    const result = formatRevenue(0)
    expect(result).toBe('$0 (฿0)')
  })

  it('formats large value $1000000', () => {
    const result = formatRevenue(1_000_000)
    expect(result).toBe('$1,000,000 (฿34,000,000)')
  })

  it('uses custom exchange rate', () => {
    const result = formatRevenue(100, 40)
    expect(result).toBe('$100 (฿4,000)')
  })

  it('handles null input as 0', () => {
    const result = formatRevenue(null)
    expect(result).toBe('$0 (฿0)')
  })

  it('handles undefined input as 0', () => {
    const result = formatRevenue(undefined)
    expect(result).toBe('$0 (฿0)')
  })
})

// ── formatUSD ─────────────────────────────────────────────────────────────────
describe('formatUSD', () => {
  it('formats positive value', () => {
    expect(formatUSD(500)).toBe('$500')
  })

  it('handles null', () => {
    expect(formatUSD(null)).toBe('$0')
  })
})

// ── formatUSDShort ────────────────────────────────────────────────────────────
describe('formatUSDShort', () => {
  it('formats millions', () => {
    expect(formatUSDShort(2_500_000)).toBe('$2.5M')
  })

  it('formats thousands', () => {
    expect(formatUSDShort(3_400)).toBe('$3.4k')
  })

  it('formats small values', () => {
    expect(formatUSDShort(567)).toBe('$567')
  })
})

// ── cn ────────────────────────────────────────────────────────────────────────
describe('cn', () => {
  it('merges two class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting tailwind classes', () => {
    // tailwind-merge collapses conflicting padding classes
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('handles conditional falsy values', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })
})
