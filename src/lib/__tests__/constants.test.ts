import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  STATUS_COLORS,
  TO_COMPLETE_OPTIONS,
} from '@/lib/constants'

describe('constants', () => {
  // ── CATEGORIES ──────────────────────────────────────────

  describe('CATEGORIES', () => {
    it('has exactly 5 entries', () => {
      expect(Object.keys(CATEGORIES)).toHaveLength(5)
    })

    it('has the correct keys', () => {
      const keys = Object.keys(CATEGORIES)
      expect(keys).toContain('client_delivery')
      expect(keys).toContain('systems_automation')
      expect(keys).toContain('client_growth')
      expect(keys).toContain('team_management')
      expect(keys).toContain('admin')
    })

    it('each category has a label and color', () => {
      for (const [key, value] of Object.entries(CATEGORIES)) {
        expect(value).toHaveProperty('label')
        expect(value).toHaveProperty('color')
        expect(typeof value.label).toBe('string')
        expect(typeof value.color).toBe('string')
        expect(value.label.length).toBeGreaterThan(0)
        expect(value.color.length).toBeGreaterThan(0)
      }
    })

    it('has correct labels', () => {
      expect(CATEGORIES.client_delivery.label).toBe('Client Delivery')
      expect(CATEGORIES.systems_automation.label).toBe('Systems & Automation')
      expect(CATEGORIES.client_growth.label).toBe('Client Growth Work')
      expect(CATEGORIES.team_management.label).toBe('Team Management')
      expect(CATEGORIES.admin.label).toBe('Admin')
    })

    it('colors use CSS custom properties', () => {
      for (const value of Object.values(CATEGORIES)) {
        expect(value.color).toMatch(/^var\(--cat-.+\)$/)
      }
    })
  })

  // ── CATEGORY_OPTIONS ──────────────────────────────────────

  describe('CATEGORY_OPTIONS', () => {
    it('has exactly 5 items', () => {
      expect(CATEGORY_OPTIONS).toHaveLength(5)
    })

    it('each option has value and label', () => {
      for (const option of CATEGORY_OPTIONS) {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      }
    })

    it('values match CATEGORIES keys', () => {
      const categoryKeys = Object.keys(CATEGORIES)
      const optionValues = CATEGORY_OPTIONS.map((o) => o.value)
      expect(optionValues).toEqual(categoryKeys)
    })

    it('labels match CATEGORIES labels', () => {
      const categoryLabels = Object.values(CATEGORIES).map((c) => c.label)
      const optionLabels = CATEGORY_OPTIONS.map((o) => o.label)
      expect(optionLabels).toEqual(categoryLabels)
    })
  })

  // ── STATUS_OPTIONS ────────────────────────────────────────

  describe('STATUS_OPTIONS', () => {
    it('has exactly 2 entries', () => {
      expect(STATUS_OPTIONS).toHaveLength(2)
    })

    it('contains in_progress and done', () => {
      const values = STATUS_OPTIONS.map((o) => o.value)
      expect(values).toContain('in_progress')
      expect(values).toContain('done')
    })

    it('has correct labels', () => {
      const inProgress = STATUS_OPTIONS.find((o) => o.value === 'in_progress')
      const done = STATUS_OPTIONS.find((o) => o.value === 'done')
      expect(inProgress?.label).toBe('In Progress')
      expect(done?.label).toBe('Done')
    })
  })

  // ── TO_COMPLETE_OPTIONS ───────────────────────────────────

  describe('TO_COMPLETE_OPTIONS', () => {
    it('has exactly 3 entries', () => {
      expect(TO_COMPLETE_OPTIONS).toHaveLength(3)
    })

    it('contains today, next_2_days, this_week', () => {
      const values = TO_COMPLETE_OPTIONS.map((o) => o.value)
      expect(values).toContain('today')
      expect(values).toContain('next_2_days')
      expect(values).toContain('this_week')
    })

    it('has correct labels', () => {
      const today = TO_COMPLETE_OPTIONS.find((o) => o.value === 'today')
      const next2 = TO_COMPLETE_OPTIONS.find((o) => o.value === 'next_2_days')
      const week = TO_COMPLETE_OPTIONS.find((o) => o.value === 'this_week')
      expect(today?.label).toBe('Today')
      expect(next2?.label).toBe('Next 2 Days')
      expect(week?.label).toBe('This Week')
    })
  })

  // ── STATUS_COLORS ─────────────────────────────────────────

  describe('STATUS_COLORS', () => {
    it('has entries for in_progress and done', () => {
      expect(STATUS_COLORS).toHaveProperty('in_progress')
      expect(STATUS_COLORS).toHaveProperty('done')
    })

    it('in_progress color contains blue classes', () => {
      expect(STATUS_COLORS.in_progress).toContain('blue')
    })

    it('done color contains green classes', () => {
      expect(STATUS_COLORS.done).toContain('green')
    })

    it('maps to Tailwind utility classes', () => {
      expect(STATUS_COLORS.in_progress).toBe('bg-blue-500/20 text-blue-400')
      expect(STATUS_COLORS.done).toBe('bg-green-500/20 text-green-400')
    })
  })
})
