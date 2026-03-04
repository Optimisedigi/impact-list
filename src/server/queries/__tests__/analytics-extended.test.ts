import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockGroupBy = vi.fn()
const mockOrderBy = vi.fn()
const mockWhere = vi.fn(() => ({ groupBy: mockGroupBy, orderBy: mockOrderBy }))
const mockInnerJoin = vi.fn(() => ({ where: mockWhere }))
const mockFrom = vi.fn(() => ({
  where: mockWhere,
  innerJoin: mockInnerJoin,
  orderBy: mockOrderBy,
}))
const mockSelect = vi.fn(() => ({ from: mockFrom }))

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'tasks.id',
    category: 'tasks.category',
    status: 'tasks.status',
    leverageScore: 'tasks.leverageScore',
    growthPhaseId: 'tasks.growthPhaseId',
    completedAt: 'tasks.completedAt',
    updatedAt: 'tasks.updatedAt',
  },
  timeEntries: {
    taskId: 'timeEntries.taskId',
    hours: 'timeEntries.hours',
    date: 'timeEntries.date',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ _op: 'eq', col, val })),
  and: vi.fn((...args: unknown[]) => ({ _op: 'and', args })),
  gte: vi.fn((col, val) => ({ _op: 'gte', col, val })),
  lte: vi.fn((col, val) => ({ _op: 'lte', col, val })),
  desc: vi.fn((col) => ({ _op: 'desc', col })),
  sql: Object.assign(vi.fn((...args: unknown[]) => ({ _type: 'sql', args })), {
    join: vi.fn(),
  }),
}))

import {
  getWeeklyAllocationTrend,
  getCompletionsByDay,
  getPhaseBurndown,
  getCompletionsByCategoryOverTime,
  getLeverageTrend,
} from '../analytics-extended'
import { tasks, timeEntries } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

describe('analytics-extended queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGroupBy.mockResolvedValue([])
    mockWhere.mockReturnValue({ groupBy: mockGroupBy, orderBy: mockOrderBy })
    mockFrom.mockReturnValue({
      where: mockWhere,
      innerJoin: mockInnerJoin,
      orderBy: mockOrderBy,
    })
  })

  describe('getWeeklyAllocationTrend', () => {
    it('defaults to 12 weeks of data', async () => {
      mockGroupBy.mockResolvedValue([])

      const result = await getWeeklyAllocationTrend()

      expect(result).toHaveLength(12)
    })

    it('accepts a custom number of weeks', async () => {
      mockGroupBy.mockResolvedValue([])

      const result = await getWeeklyAllocationTrend(4)

      expect(result).toHaveLength(4)
    })

    it('returns week data with shortDate format (day/month)', async () => {
      mockGroupBy.mockResolvedValue([])

      const result = await getWeeklyAllocationTrend(1)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('week')
      expect(result[0]).toHaveProperty('weekCommencing')
      // week format should be "day/month"
      expect(result[0].week).toMatch(/^\d{1,2}\/\d{1,2}$/)
      // weekCommencing should be ISO date
      expect(result[0].weekCommencing).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('maps category hours into week data objects', async () => {
      mockGroupBy.mockResolvedValue([
        { category: 'admin', totalHours: 3 },
        { category: 'dev', totalHours: 8 },
      ])

      const result = await getWeeklyAllocationTrend(1)

      expect(result[0]).toHaveProperty('admin', 3)
      expect(result[0]).toHaveProperty('dev', 8)
    })

    it('iterates weeks from oldest to newest', async () => {
      mockGroupBy.mockResolvedValue([])

      const result = await getWeeklyAllocationTrend(3)

      // weekCommencing dates should be in ascending order
      const dates = result.map((r: Record<string, unknown>) => r.weekCommencing as string)
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] > dates[i - 1]).toBe(true)
      }
    })

    it('joins timeEntries with tasks', async () => {
      mockGroupBy.mockResolvedValue([])

      await getWeeklyAllocationTrend(1)

      expect(mockInnerJoin).toHaveBeenCalled()
      expect(eq).toHaveBeenCalledWith(timeEntries.taskId, tasks.id)
    })
  })

  describe('getCompletionsByDay', () => {
    it('defaults to 365 days lookback', async () => {
      mockGroupBy.mockResolvedValue([])

      await getCompletionsByDay()

      expect(gte).toHaveBeenCalled()
      expect(eq).toHaveBeenCalledWith(tasks.status, 'done')
    })

    it('accepts a custom number of days', async () => {
      mockGroupBy.mockResolvedValue([])

      await getCompletionsByDay(30)

      expect(gte).toHaveBeenCalled()
    })

    it('returns mapped date and count objects', async () => {
      mockGroupBy.mockResolvedValueOnce([
        { date: '2026-03-01', count: 3 },
        { date: '2026-03-02', count: 1 },
      ])

      const result = await getCompletionsByDay()

      expect(result).toEqual([
        { date: '2026-03-01', count: 3 },
        { date: '2026-03-02', count: 1 },
      ])
    })

    it('returns empty array when no completions', async () => {
      mockGroupBy.mockResolvedValueOnce([])

      const result = await getCompletionsByDay()
      expect(result).toEqual([])
    })
  })

  describe('getPhaseBurndown', () => {
    it('queries tasks by growthPhaseId', async () => {
      mockWhere.mockResolvedValueOnce([])

      await getPhaseBurndown(5)

      expect(eq).toHaveBeenCalledWith(tasks.growthPhaseId, 5)
    })

    it('calculates burndown from completed tasks', async () => {
      const phaseTasks = [
        { id: 1, status: 'done', completedAt: '2026-03-01T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z' },
        { id: 2, status: 'done', completedAt: '2026-03-02T10:00:00Z', updatedAt: '2026-03-02T10:00:00Z' },
        { id: 3, status: 'in_progress', completedAt: null, updatedAt: '2026-03-01T10:00:00Z' },
        { id: 4, status: 'not_started', completedAt: null, updatedAt: '2026-02-28T10:00:00Z' },
      ]
      mockWhere.mockResolvedValueOnce(phaseTasks)

      const result = await getPhaseBurndown(1)

      // Total = 4 tasks
      // First point: date of first completion, remaining = 4
      // After 2026-03-01: 1 done, remaining = 3
      // After 2026-03-02: 1 done, remaining = 2
      expect(result[0]).toEqual({ date: '2026-03-01', remaining: 4 })
      expect(result[1]).toEqual({ date: '2026-03-01', remaining: 3 })
      expect(result[2]).toEqual({ date: '2026-03-02', remaining: 2 })
    })

    it('handles multiple completions on the same day', async () => {
      const phaseTasks = [
        { id: 1, status: 'done', completedAt: '2026-03-01T08:00:00Z', updatedAt: '2026-03-01T08:00:00Z' },
        { id: 2, status: 'done', completedAt: '2026-03-01T15:00:00Z', updatedAt: '2026-03-01T15:00:00Z' },
        { id: 3, status: 'not_started', completedAt: null, updatedAt: '2026-02-28T10:00:00Z' },
      ]
      mockWhere.mockResolvedValueOnce(phaseTasks)

      const result = await getPhaseBurndown(1)

      expect(result[0]).toEqual({ date: '2026-03-01', remaining: 3 })
      expect(result[1]).toEqual({ date: '2026-03-01', remaining: 1 })
    })

    it('returns default burndown when no tasks are done', async () => {
      const phaseTasks = [
        { id: 1, status: 'not_started', completedAt: null, updatedAt: '2026-03-01T10:00:00Z' },
      ]
      mockWhere.mockResolvedValueOnce(phaseTasks)

      const result = await getPhaseBurndown(1)

      // No done tasks, so dates array is empty, uses today's date as fallback
      expect(result).toHaveLength(1)
      expect(result[0].remaining).toBe(1)
    })

    it('falls back to updatedAt when completedAt is null for done tasks', async () => {
      const phaseTasks = [
        { id: 1, status: 'done', completedAt: null, updatedAt: '2026-03-05T10:00:00Z' },
      ]
      mockWhere.mockResolvedValueOnce(phaseTasks)

      const result = await getPhaseBurndown(1)

      expect(result[0]).toEqual({ date: '2026-03-05', remaining: 1 })
      expect(result[1]).toEqual({ date: '2026-03-05', remaining: 0 })
    })

    it('returns single point for empty phase', async () => {
      mockWhere.mockResolvedValueOnce([])

      const result = await getPhaseBurndown(1)

      expect(result).toHaveLength(1)
      expect(result[0].remaining).toBe(0)
    })
  })

  describe('getCompletionsByCategoryOverTime', () => {
    it('defaults to 12 weeks', async () => {
      mockGroupBy.mockResolvedValue([])

      const result = await getCompletionsByCategoryOverTime()

      expect(result).toHaveLength(12)
    })

    it('labels weeks as W1, W2, etc.', async () => {
      mockGroupBy.mockResolvedValue([])

      const result = await getCompletionsByCategoryOverTime(3)

      expect(result[0].week).toBe('W1')
      expect(result[1].week).toBe('W2')
      expect(result[2].week).toBe('W3')
    })

    it('includes weekCommencing as ISO date', async () => {
      mockGroupBy.mockResolvedValue([])

      const result = await getCompletionsByCategoryOverTime(1)

      expect(result[0].weekCommencing).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('maps category counts into week objects', async () => {
      mockGroupBy.mockResolvedValue([
        { category: 'admin', count: 2 },
        { category: 'dev', count: 5 },
      ])

      const result = await getCompletionsByCategoryOverTime(1)

      expect(result[0]).toHaveProperty('admin', 2)
      expect(result[0]).toHaveProperty('dev', 5)
    })

    it('filters for done tasks only', async () => {
      mockGroupBy.mockResolvedValue([])

      await getCompletionsByCategoryOverTime(1)

      expect(eq).toHaveBeenCalledWith(tasks.status, 'done')
    })
  })

  describe('getLeverageTrend', () => {
    it('defaults to 12 weeks', async () => {
      mockWhere.mockResolvedValue([{ avgLeverage: 5 }])

      const result = await getLeverageTrend()

      expect(result).toHaveLength(12)
    })

    it('returns week, weekCommencing, and avgLeverage for each entry', async () => {
      mockWhere.mockResolvedValue([{ avgLeverage: 7.5 }])

      const result = await getLeverageTrend(1)

      expect(result[0]).toHaveProperty('week')
      expect(result[0]).toHaveProperty('weekCommencing')
      expect(result[0]).toHaveProperty('avgLeverage', 7.5)
    })

    it('uses shortDate format for week field', async () => {
      mockWhere.mockResolvedValue([{ avgLeverage: 5 }])

      const result = await getLeverageTrend(1)

      expect(result[0].week).toMatch(/^\d{1,2}\/\d{1,2}$/)
    })

    it('defaults avgLeverage to 0 when no data returned', async () => {
      mockWhere.mockResolvedValue([])

      const result = await getLeverageTrend(1)

      expect(result[0].avgLeverage).toBe(0)
    })

    it('produces weeks in chronological order', async () => {
      mockWhere.mockResolvedValue([{ avgLeverage: 3 }])

      const result = await getLeverageTrend(4)

      const dates = result.map((r: { weekCommencing: string }) => r.weekCommencing)
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] > dates[i - 1]).toBe(true)
      }
    })

    it('filters for done tasks only', async () => {
      mockWhere.mockResolvedValue([{ avgLeverage: 0 }])

      await getLeverageTrend(1)

      expect(eq).toHaveBeenCalledWith(tasks.status, 'done')
    })
  })
})
