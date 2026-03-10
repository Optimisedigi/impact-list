import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockGroupBy = vi.fn()
const mockLimit = vi.fn()
const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy, groupBy: mockGroupBy }))
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
    priorityScore: 'tasks.priorityScore',
    deadline: 'tasks.deadline',
    toComplete: 'tasks.toComplete',
    dismissedFromFocus: 'tasks.dismissedFromFocus',
    sortOrder: 'tasks.sortOrder',
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
  or: vi.fn((...args: unknown[]) => ({ _op: 'or', args })),
  gte: vi.fn((col, val) => ({ _op: 'gte', col, val })),
  lte: vi.fn((col, val) => ({ _op: 'lte', col, val })),
  lt: vi.fn((col, val) => ({ _op: 'lt', col, val })),
  ne: vi.fn((col, val) => ({ _op: 'ne', col, val })),
  asc: vi.fn((col) => ({ _op: 'asc', col })),
  desc: vi.fn((col) => ({ _op: 'desc', col })),
  inArray: vi.fn((col, vals) => ({ _op: 'inArray', col, vals })),
  isNull: vi.fn((col) => ({ _op: 'isNull', col })),
  sql: Object.assign(vi.fn((...args: unknown[]) => ({ _type: 'sql', args })), {
    join: vi.fn(),
  }),
}))

vi.mock('@/lib/time-utils', () => ({
  getWeekBounds: vi.fn((offset: number) => ({
    start: `2026-03-02T00:00:00.000Z`,
    end: `2026-03-08T23:59:59.999Z`,
  })),
  getMonthBounds: vi.fn((offset: number) => ({
    start: `2026-03-01T00:00:00.000Z`,
    end: `2026-03-31T23:59:59.999Z`,
  })),
}))

import {
  getTimeAllocationByPeriod,
  getTopTasksByLeverage,
  getOverdueTasks,
  getThisWeekTasks,
} from '../analytics'
import { tasks, timeEntries } from '@/db/schema'
import { eq, and, ne, gte, lte, lt, desc, inArray, isNull } from 'drizzle-orm'
import { getWeekBounds, getMonthBounds } from '@/lib/time-utils'

describe('analytics queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGroupBy.mockResolvedValue([])
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy })
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockLimit.mockResolvedValue([])
    mockFrom.mockReturnValue({
      where: mockWhere,
      innerJoin: mockInnerJoin,
      orderBy: mockOrderBy,
    })
  })

  describe('getTimeAllocationByPeriod', () => {
    it('calls getWeekBounds(0) for this_week', async () => {
      mockGroupBy.mockResolvedValueOnce([])
      await getTimeAllocationByPeriod('this_week')
      expect(getWeekBounds).toHaveBeenCalledWith(0)
    })

    it('calls getWeekBounds(-1) for last_week', async () => {
      mockGroupBy.mockResolvedValueOnce([])
      await getTimeAllocationByPeriod('last_week')
      expect(getWeekBounds).toHaveBeenCalledWith(-1)
    })

    it('calls getMonthBounds(0) for this_month', async () => {
      mockGroupBy.mockResolvedValueOnce([])
      await getTimeAllocationByPeriod('this_month')
      expect(getMonthBounds).toHaveBeenCalledWith(0)
    })

    it('calls getMonthBounds(-1) for last_month', async () => {
      mockGroupBy.mockResolvedValueOnce([])
      await getTimeAllocationByPeriod('last_month')
      expect(getMonthBounds).toHaveBeenCalledWith(-1)
    })

    it('joins timeEntries with tasks and groups by category', async () => {
      mockGroupBy.mockResolvedValueOnce([
        { category: 'admin', totalHours: 5 },
        { category: 'dev', totalHours: 10 },
      ])

      const result = await getTimeAllocationByPeriod('this_week')

      expect(mockInnerJoin).toHaveBeenCalledWith(tasks, expect.anything())
      expect(eq).toHaveBeenCalledWith(timeEntries.taskId, tasks.id)
      expect(mockGroupBy).toHaveBeenCalledWith(tasks.category)
      expect(result).toEqual([
        { category: 'admin', totalHours: 5 },
        { category: 'dev', totalHours: 10 },
      ])
    })

    it('uses date portion of bounds for filtering', async () => {
      mockGroupBy.mockResolvedValueOnce([])
      await getTimeAllocationByPeriod('this_week')

      expect(gte).toHaveBeenCalledWith(timeEntries.date, '2026-03-02')
      expect(lte).toHaveBeenCalledWith(timeEntries.date, '2026-03-08')
    })
  })

  describe('getTopTasksByLeverage', () => {
    it('first queries tasks marked as "today"', async () => {
      mockLimit.mockResolvedValueOnce([]).mockResolvedValueOnce([])

      await getTopTasksByLeverage(3)

      expect(ne).toHaveBeenCalledWith(tasks.status, 'done')
      expect(isNull).toHaveBeenCalledWith(tasks.dismissedFromFocus)
      expect(eq).toHaveBeenCalledWith(tasks.toComplete, 'today')
    })

    it('returns only today tasks when they fill the limit', async () => {
      const todayTasks = [
        { id: 1, title: 'T1' },
        { id: 2, title: 'T2' },
        { id: 3, title: 'T3' },
      ]
      mockLimit.mockResolvedValueOnce(todayTasks)

      const result = await getTopTasksByLeverage(3)

      expect(result).toEqual(todayTasks)
      // Should not make a second query
      expect(mockLimit).toHaveBeenCalledTimes(1)
    })

    it('fills remaining slots with leverage tasks when today tasks are fewer than limit', async () => {
      const todayTasks = [{ id: 1, title: 'Today Task' }]
      const leverageTasks = [
        { id: 2, title: 'High Leverage' },
        { id: 3, title: 'Med Leverage' },
      ]
      mockLimit
        .mockResolvedValueOnce(todayTasks)
        .mockResolvedValueOnce(leverageTasks)

      const result = await getTopTasksByLeverage(3)

      expect(result).toEqual([...todayTasks, ...leverageTasks])
      // Second query should request remaining = 2
      expect(mockLimit).toHaveBeenCalledTimes(2)
      expect(mockLimit).toHaveBeenLastCalledWith(2)
    })

    it('uses default limit of 3', async () => {
      mockLimit.mockResolvedValueOnce([]).mockResolvedValueOnce([])

      await getTopTasksByLeverage()

      expect(mockLimit).toHaveBeenCalledWith(3)
    })

    it('orders by leverageScore desc then priorityScore desc', async () => {
      mockLimit.mockResolvedValueOnce([]).mockResolvedValueOnce([])

      await getTopTasksByLeverage(3)

      expect(desc).toHaveBeenCalledWith(tasks.leverageScore)
      expect(desc).toHaveBeenCalledWith(tasks.priorityScore)
    })
  })

  describe('getOverdueTasks', () => {
    it('filters for non-done tasks with deadline before today', async () => {
      mockWhere.mockResolvedValueOnce([])

      await getOverdueTasks()

      expect(ne).toHaveBeenCalledWith(tasks.status, 'done')
      expect(lt).toHaveBeenCalledWith(tasks.deadline, expect.any(String))
    })

    it('returns overdue tasks', async () => {
      const overdue = [
        { id: 1, title: 'Late Task', deadline: '2026-01-01' },
      ]
      mockWhere.mockResolvedValueOnce(overdue)

      const result = await getOverdueTasks()
      expect(result).toEqual(overdue)
    })
  })

  describe('getThisWeekTasks', () => {
    it('calls getWeekBounds(0) for current week bounds', async () => {
      mockOrderBy.mockResolvedValueOnce([])

      await getThisWeekTasks()

      expect(getWeekBounds).toHaveBeenCalledWith(0)
    })

    it('excludes done tasks and dismissed tasks', async () => {
      mockOrderBy.mockResolvedValueOnce([])

      await getThisWeekTasks()

      expect(ne).toHaveBeenCalledWith(tasks.status, 'done')
      expect(isNull).toHaveBeenCalledWith(tasks.dismissedFromFocus)
    })

    it('includes tasks with deadlines this week or marked today/this_week', async () => {
      mockOrderBy.mockResolvedValueOnce([])

      await getThisWeekTasks()

      expect(inArray).toHaveBeenCalledWith(tasks.toComplete, [
        'today',
        'this_week',
      ])
    })

    it('orders by leverageScore descending', async () => {
      mockOrderBy.mockResolvedValueOnce([])

      await getThisWeekTasks()

      expect(desc).toHaveBeenCalledWith(tasks.leverageScore)
    })
  })
})
