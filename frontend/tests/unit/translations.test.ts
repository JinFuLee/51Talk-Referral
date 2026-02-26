import { describe, it, expect } from 'vitest'
import { getCurrentMonthLabel, zhTranslations, thTranslations } from '@/lib/translations'

// ── getCurrentMonthLabel ──────────────────────────────────────────────────────
describe('getCurrentMonthLabel', () => {
  it('returns Chinese format for zh (default)', () => {
    const label = getCurrentMonthLabel('zh')
    // matches "YYYY年M月" or "YYYY年MM月"
    expect(label).toMatch(/^\d{4}年\d{1,2}月$/)
  })

  it('returns Thai format for th (M/YYYY)', () => {
    const label = getCurrentMonthLabel('th')
    // matches "M/YYYY" or "MM/YYYY"
    expect(label).toMatch(/^\d{1,2}\/\d{4}$/)
  })

  it('defaults to zh when no argument given', () => {
    const label = getCurrentMonthLabel()
    expect(label).toMatch(/^\d{4}年\d{1,2}月$/)
  })

  it('contains current year in zh format', () => {
    const year = new Date().getFullYear().toString()
    expect(getCurrentMonthLabel('zh')).toContain(year)
  })

  it('contains current year in th format', () => {
    const year = new Date().getFullYear().toString()
    expect(getCurrentMonthLabel('th')).toContain(year)
  })
})

// ── zhTranslations ────────────────────────────────────────────────────────────
describe('zhTranslations', () => {
  it('is a non-empty Record<string, string>', () => {
    expect(typeof zhTranslations).toBe('object')
    expect(Object.keys(zhTranslations).length).toBeGreaterThan(0)
  })

  it('all values are strings', () => {
    for (const [, v] of Object.entries(zhTranslations)) {
      expect(typeof v).toBe('string')
    }
  })

  it('has key "common.button.refresh"', () => {
    expect(zhTranslations['common.button.refresh']).toBeDefined()
  })

  it('has key "root.title"', () => {
    expect(zhTranslations['root.title']).toBeDefined()
  })

  it('has key "common.label.noData"', () => {
    expect(zhTranslations['common.label.noData']).toBe('暂无数据')
  })
})

// ── thTranslations ────────────────────────────────────────────────────────────
describe('thTranslations', () => {
  it('is a non-empty Record<string, string>', () => {
    expect(typeof thTranslations).toBe('object')
    expect(Object.keys(thTranslations).length).toBeGreaterThan(0)
  })

  it('all values are strings', () => {
    for (const [, v] of Object.entries(thTranslations)) {
      expect(typeof v).toBe('string')
    }
  })

  it('has the exact same number of keys as zhTranslations', () => {
    expect(Object.keys(thTranslations).length).toBe(Object.keys(zhTranslations).length)
  })

  it('all th values are prefixed with "[TH] " (placeholder convention)', () => {
    // thTranslations is auto-derived: Object.entries(zhTranslations).map([k, v] => [k, `[TH] ${v}`])
    for (const [, v] of Object.entries(thTranslations)) {
      expect(v.startsWith('[TH] ')).toBe(true)
    }
  })

  it('th value contains the zh value after prefix', () => {
    const key = 'common.label.noData'
    const zhVal = zhTranslations[key]
    const thVal = thTranslations[key]
    expect(thVal).toBe(`[TH] ${zhVal}`)
  })
})
