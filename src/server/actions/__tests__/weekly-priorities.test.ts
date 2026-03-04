import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockSelectLimit = vi.fn(() => [])
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }))
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }))
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }))
const mockValues = vi.fn(() => ({ returning: vi.fn(() => []) }))
const mockInsert = vi.fn(() => ({ values: mockValues }))
const mockUpdateWhere = vi.fn()
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }))
const mockUpdate = vi.fn(() => ({ set: mockSet }))

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  weeklyPriorities: {
    id: 'weeklyPriorities.id',
    weekStart: 'weeklyPriorities.weekStart',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock time-utils to return a stable weekStart
vi.mock('@/lib/time-utils', () => ({
  getWeekBounds: vi.fn(() => ({
    start: '2026-03-02T00:00:00.000Z',
    end: '2026-03-08T23:59:59.999Z',
  })),
}))

import { getWeeklyPriorities, saveWeeklyPriorities } from '../weekly-priorities'
import { revalidatePath } from 'next/cache'
import { weeklyPriorities } from '@/db/schema'

describe('weekly-priorities actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getWeeklyPriorities ──────────────────────────────────

  describe('getWeeklyPriorities', () => {
    it('queries weeklyPriorities table by current week start', async () => {
      mockSelectLimit.mockReturnValueOnce([])

      await getWeeklyPriorities()

      expect(mockSelect).toHaveBeenCalled()
      expect(mockSelectFrom).toHaveBeenCalledWith(weeklyPriorities)
      expect(mockSelectWhere).toHaveBeenCalledWith({
        col: 'weeklyPriorities.weekStart',
        val: '2026-03-02',
      })
      expect(mockSelectLimit).toHaveBeenCalledWith(1)
    })

    it('returns null when no priorities exist for the week', async () => {
      mockSelectLimit.mockReturnValueOnce([])

      const result = await getWeeklyPriorities()
      expect(result).toBeNull()
    })

    it('returns the first row when priorities exist', async () => {
      const row = { id: 1, weekStart: '2026-03-02', priorities: 'Ship feature X' }
      mockSelectLimit.mockReturnValueOnce([row])

      const result = await getWeeklyPriorities()
      expect(result).toEqual(row)
    })
  })

  // ── saveWeeklyPriorities ─────────────────────────────────

  describe('saveWeeklyPriorities', () => {
    it('updates existing row when one exists for the current week', async () => {
      mockSelectLimit.mockReturnValueOnce([{ id: 10, weekStart: '2026-03-02', priorities: 'Old' }])

      await saveWeeklyPriorities('New priorities')

      expect(mockUpdate).toHaveBeenCalledWith(weeklyPriorities)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          priorities: 'New priorities',
          updatedAt: expect.any(String),
        })
      )
      expect(mockUpdateWhere).toHaveBeenCalledWith({
        col: 'weeklyPriorities.weekStart',
        val: '2026-03-02',
      })
    })

    it('inserts a new row when none exists for the current week', async () => {
      mockSelectLimit.mockReturnValueOnce([])

      await saveWeeklyPriorities('Focus on deployments')

      expect(mockInsert).toHaveBeenCalledWith(weeklyPriorities)
      expect(mockValues).toHaveBeenCalledWith({
        weekStart: '2026-03-02',
        priorities: 'Focus on deployments',
      })
    })

    it('does not insert when updating', async () => {
      mockSelectLimit.mockReturnValueOnce([{ id: 1 }])

      await saveWeeklyPriorities('Updated')

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('does not update when inserting', async () => {
      mockSelectLimit.mockReturnValueOnce([])

      await saveWeeklyPriorities('New')

      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('revalidates /focus path', async () => {
      mockSelectLimit.mockReturnValueOnce([])

      await saveWeeklyPriorities('Priorities')

      expect(revalidatePath).toHaveBeenCalledWith('/focus')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })
})
