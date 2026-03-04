import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CATEGORIES,
  buildCategoryOptions,
  STATUS_OPTIONS,
  STATUS_COLORS,
  TO_COMPLETE_OPTIONS,
} from '@/lib/constants'

describe('constants', () => {
  // ── DEFAULT_CATEGORIES ──────────────────────────────────────────

  describe('DEFAULT_CATEGORIES', () => {
    it('has exactly 5 entries', () => {
      expect(Object.keys(DEFAULT_CATEGORIES)).toHaveLength(5)
    })

    it('has the correct keys', () => {
      const keys = Object.keys(DEFAULT_CATEGORIES)
      expect(keys).toContain('client_delivery')
      expect(keys).toContain('systems_automation')
      expect(keys).toContain('client_growth')
      expect(keys).toContain('team_management')
      expect(keys).toContain('admin')
    })

    it('each category has a label and color', () => {
      for (const [key, value] of Object.entries(DEFAULT_CATEGORIES)) {
        expect(value).toHaveProperty('label')
        expect(value).toHaveProperty('color')
        expect(typeof value.label).toBe('string')
        expect(typeof value.color).toBe('string')
        expect(value.label.length).toBeGreaterThan(0)
        expect(value.color.length).toBeGreaterThan(0)
      }
    })

    it('has correct labels', () => {
      expect(DEFAULT_CATEGORIES.client_delivery.label).toBe('Client Delivery')
      expect(DEFAULT_CATEGORIES.systems_automation.label).toBe('Systems & Automation')
      expect(DEFAULT_CATEGORIES.client_growth.label).toBe('Client Growth Work')
      expect(DEFAULT_CATEGORIES.team_management.label).toBe('Team Management')
      expect(DEFAULT_CATEGORIES.admin.label).toBe('Admin')
    })

    it('colors use oklch format', () => {
      for (const value of Object.values(DEFAULT_CATEGORIES)) {
        expect(value.color).toMatch(/^oklch\(/)
      }
    })
  })

  // ── buildCategoryOptions ──────────────────────────────────────

  describe('buildCategoryOptions', () => {
    const options = buildCategoryOptions()

    it('returns exactly 5 items when no DB categories provided', () => {
      expect(options).toHaveLength(5)
    })

    it('each option has value, label, and color', () => {
      for (const option of options) {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('color')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
        expect(typeof option.color).toBe('string')
      }
    })

    it('values match DEFAULT_CATEGORIES keys', () => {
      const categoryKeys = Object.keys(DEFAULT_CATEGORIES)
      const optionValues = options.map((o) => o.value)
      expect(optionValues).toEqual(categoryKeys)
    })

    it('labels match DEFAULT_CATEGORIES labels', () => {
      const categoryLabels = Object.values(DEFAULT_CATEGORIES).map((c) => c.label)
      const optionLabels = options.map((o) => o.label)
      expect(optionLabels).toEqual(categoryLabels)
    })
  })

  // ── STATUS_OPTIONS ────────────────────────────────────────

  describe('STATUS_OPTIONS', () => {
    it('has exactly 3 entries', () => {
      expect(STATUS_OPTIONS).toHaveLength(3)
    })

    it('contains not_started, in_progress and done', () => {
      const values = STATUS_OPTIONS.map((o) => o.value)
      expect(values).toContain('not_started')
      expect(values).toContain('in_progress')
      expect(values).toContain('done')
    })

    it('has correct labels', () => {
      const notStarted = STATUS_OPTIONS.find((o) => o.value === 'not_started')
      const inProgress = STATUS_OPTIONS.find((o) => o.value === 'in_progress')
      const done = STATUS_OPTIONS.find((o) => o.value === 'done')
      expect(notStarted?.label).toBe('Not Started')
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
    it('has entries for not_started, in_progress and done', () => {
      expect(STATUS_COLORS).toHaveProperty('not_started')
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
      expect(STATUS_COLORS.not_started).toBe('bg-muted text-muted-foreground')
      expect(STATUS_COLORS.in_progress).toBe('bg-blue-500/20 text-blue-400')
      expect(STATUS_COLORS.done).toBe('bg-green-500/20 text-green-400')
    })
  })
})
