import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  daysLeft,
  getWeekBounds,
  getMonthBounds,
  formatDate,
  formatDateShort,
} from '@/lib/time-utils'

describe('time-utils', () => {
  beforeEach(() => {
    // Wednesday 2026-03-04 at noon
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 4, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── daysLeft ──────────────────────────────────────────────

  describe('daysLeft', () => {
    it('returns null for null input', () => {
      expect(daysLeft(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(daysLeft(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(daysLeft('')).toBeNull()
    })

    it('returns positive number for future date', () => {
      // 2026-03-10 is 6 days after March 4
      expect(daysLeft('2026-03-10')).toBe(6)
    })

    it('returns negative number for past date', () => {
      // 2026-03-01 is 3 days before March 4
      expect(daysLeft('2026-03-01')).toBe(-3)
    })

    it('returns 0 for today', () => {
      expect(daysLeft('2026-03-04')).toBe(0)
    })

    it('returns 1 for tomorrow', () => {
      expect(daysLeft('2026-03-05')).toBe(1)
    })

    it('returns -1 for yesterday', () => {
      expect(daysLeft('2026-03-03')).toBe(-1)
    })
  })

  // ── getWeekBounds ─────────────────────────────────────────

  describe('getWeekBounds', () => {
    it('returns current week bounds for offset 0', () => {
      const { start, end } = getWeekBounds(0)
      const startDate = new Date(start)
      const endDate = new Date(end)

      // March 4, 2026 is a Wednesday → Monday is March 2
      expect(startDate.getFullYear()).toBe(2026)
      expect(startDate.getMonth()).toBe(2) // March
      expect(startDate.getDate()).toBe(2)  // Monday March 2
      expect(startDate.getDay()).toBe(1)   // 1 = Monday

      // Sunday is March 8
      expect(endDate.getDate()).toBe(8)
      expect(endDate.getDay()).toBe(0) // 0 = Sunday
    })

    it('returns previous week bounds for offset -1', () => {
      const { start, end } = getWeekBounds(-1)
      const startDate = new Date(start)
      const endDate = new Date(end)

      // Previous Monday = Feb 23
      expect(startDate.getDate()).toBe(23)
      expect(startDate.getMonth()).toBe(1) // February
      expect(startDate.getDay()).toBe(1)

      // Previous Sunday = Mar 1
      expect(endDate.getDate()).toBe(1)
      expect(endDate.getMonth()).toBe(2) // March
      expect(endDate.getDay()).toBe(0)
    })

    it('returns next week bounds for offset +1', () => {
      const { start, end } = getWeekBounds(1)
      const startDate = new Date(start)
      const endDate = new Date(end)

      // Next Monday = March 9
      expect(startDate.getDate()).toBe(9)
      expect(startDate.getMonth()).toBe(2)
      expect(startDate.getDay()).toBe(1)

      // Next Sunday = March 15
      expect(endDate.getDate()).toBe(15)
      expect(endDate.getDay()).toBe(0)
    })

    it('handles Sunday edge case (day=0) correctly', () => {
      // Set time to Sunday 2026-03-08
      vi.setSystemTime(new Date(2026, 2, 8, 12, 0, 0))
      const { start, end } = getWeekBounds(0)
      const startDate = new Date(start)
      const endDate = new Date(end)

      // On Sunday, the week's Monday should be March 2 (6 days back)
      expect(startDate.getDate()).toBe(2)
      expect(startDate.getDay()).toBe(1)
      expect(endDate.getDate()).toBe(8)
      expect(endDate.getDay()).toBe(0)
    })

    it('start has time 00:00:00 and end has time 23:59:59', () => {
      const { start, end } = getWeekBounds(0)
      const startDate = new Date(start)
      const endDate = new Date(end)

      expect(startDate.getHours()).toBe(0)
      expect(startDate.getMinutes()).toBe(0)
      expect(startDate.getSeconds()).toBe(0)

      expect(endDate.getHours()).toBe(23)
      expect(endDate.getMinutes()).toBe(59)
      expect(endDate.getSeconds()).toBe(59)
    })

    it('defaults to offset 0 when called without arguments', () => {
      const withDefault = getWeekBounds()
      const withZero = getWeekBounds(0)
      expect(withDefault).toEqual(withZero)
    })
  })

  // ── getMonthBounds ────────────────────────────────────────

  describe('getMonthBounds', () => {
    it('returns current month bounds for offset 0', () => {
      const { start, end } = getMonthBounds(0)
      const startDate = new Date(start)
      const endDate = new Date(end)

      // March 2026
      expect(startDate.getFullYear()).toBe(2026)
      expect(startDate.getMonth()).toBe(2)
      expect(startDate.getDate()).toBe(1)

      // March has 31 days
      expect(endDate.getDate()).toBe(31)
      expect(endDate.getMonth()).toBe(2)
    })

    it('returns previous month bounds for offset -1', () => {
      const { start, end } = getMonthBounds(-1)
      const startDate = new Date(start)
      const endDate = new Date(end)

      // February 2026
      expect(startDate.getMonth()).toBe(1)
      expect(startDate.getDate()).toBe(1)

      // February 2026 has 28 days (not a leap year)
      expect(endDate.getDate()).toBe(28)
      expect(endDate.getMonth()).toBe(1)
    })

    it('returns next month bounds for offset +1', () => {
      const { start, end } = getMonthBounds(1)
      const startDate = new Date(start)
      const endDate = new Date(end)

      // April 2026
      expect(startDate.getMonth()).toBe(3)
      expect(startDate.getDate()).toBe(1)

      // April has 30 days
      expect(endDate.getDate()).toBe(30)
      expect(endDate.getMonth()).toBe(3)
    })

    it('start is midnight, end is 23:59:59', () => {
      const { start, end } = getMonthBounds(0)
      const startDate = new Date(start)
      const endDate = new Date(end)

      expect(startDate.getHours()).toBe(0)
      expect(startDate.getMinutes()).toBe(0)

      expect(endDate.getHours()).toBe(23)
      expect(endDate.getMinutes()).toBe(59)
      expect(endDate.getSeconds()).toBe(59)
    })

    it('defaults to offset 0 when called without arguments', () => {
      const withDefault = getMonthBounds()
      const withZero = getMonthBounds(0)
      expect(withDefault).toEqual(withZero)
    })
  })

  // ── formatDate ────────────────────────────────────────────

  describe('formatDate', () => {
    it('returns empty string for null', () => {
      expect(formatDate(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(formatDate('')).toBe('')
    })

    it('formats a valid date with month, day, year', () => {
      const result = formatDate('2026-03-04')
      // en-US: "Mar 4, 2026"
      expect(result).toContain('Mar')
      expect(result).toContain('4')
      expect(result).toContain('2026')
    })

    it('formats another date correctly', () => {
      const result = formatDate('2025-12-25')
      expect(result).toContain('Dec')
      expect(result).toContain('25')
      expect(result).toContain('2025')
    })
  })

  // ── formatDateShort ───────────────────────────────────────

  describe('formatDateShort', () => {
    it('returns empty string for null', () => {
      expect(formatDateShort(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(formatDateShort(undefined)).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(formatDateShort('')).toBe('')
    })

    it('formats a valid date with month and day only (no year)', () => {
      const result = formatDateShort('2026-03-04')
      expect(result).toContain('Mar')
      expect(result).toContain('4')
      // Should NOT contain the year
      expect(result).not.toContain('2026')
    })

    it('formats another date correctly', () => {
      const result = formatDateShort('2025-12-25')
      expect(result).toContain('Dec')
      expect(result).toContain('25')
      expect(result).not.toContain('2025')
    })
  })
})
