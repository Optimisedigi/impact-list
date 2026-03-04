import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockWhere = vi.fn()
const mockFrom = vi.fn(() => ({ where: mockWhere }))
const mockSelect = vi.fn(() => ({ from: mockFrom }))

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  timeEntries: {
    taskId: 'timeEntries.taskId',
    date: 'timeEntries.date',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ _op: 'eq', col, val })),
  and: vi.fn((...args: unknown[]) => ({ _op: 'and', args })),
  gte: vi.fn((col, val) => ({ _op: 'gte', col, val })),
  lte: vi.fn((col, val) => ({ _op: 'lte', col, val })),
}))

import {
  getTimeEntriesForTask,
  getTimeEntriesByDateRange,
} from '../time-entries'
import { timeEntries } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

describe('time-entries queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWhere.mockResolvedValue([])
    mockFrom.mockReturnValue({ where: mockWhere })
  })

  describe('getTimeEntriesForTask', () => {
    it('selects from timeEntries table', async () => {
      await getTimeEntriesForTask(1)

      expect(mockSelect).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalledWith(timeEntries)
    })

    it('filters by taskId using eq', async () => {
      await getTimeEntriesForTask(42)

      expect(eq).toHaveBeenCalledWith(timeEntries.taskId, 42)
    })

    it('returns matching time entries', async () => {
      const entries = [
        { id: 1, taskId: 5, hours: 2, date: '2026-03-01' },
        { id: 2, taskId: 5, hours: 1.5, date: '2026-03-02' },
      ]
      mockWhere.mockResolvedValueOnce(entries)

      const result = await getTimeEntriesForTask(5)

      expect(result).toEqual(entries)
    })

    it('returns empty array when no entries exist', async () => {
      mockWhere.mockResolvedValueOnce([])

      const result = await getTimeEntriesForTask(999)

      expect(result).toEqual([])
    })
  })

  describe('getTimeEntriesByDateRange', () => {
    it('selects from timeEntries table', async () => {
      await getTimeEntriesByDateRange('2026-03-01', '2026-03-07')

      expect(mockSelect).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalledWith(timeEntries)
    })

    it('filters by date range using gte and lte', async () => {
      await getTimeEntriesByDateRange('2026-03-01', '2026-03-07')

      expect(gte).toHaveBeenCalledWith(timeEntries.date, '2026-03-01')
      expect(lte).toHaveBeenCalledWith(timeEntries.date, '2026-03-07')
    })

    it('combines date conditions with and()', async () => {
      await getTimeEntriesByDateRange('2026-03-01', '2026-03-07')

      expect(and).toHaveBeenCalled()
    })

    it('returns entries within the date range', async () => {
      const entries = [
        { id: 1, taskId: 1, hours: 3, date: '2026-03-03' },
        { id: 2, taskId: 2, hours: 1, date: '2026-03-05' },
      ]
      mockWhere.mockResolvedValueOnce(entries)

      const result = await getTimeEntriesByDateRange('2026-03-01', '2026-03-07')

      expect(result).toEqual(entries)
    })

    it('returns empty array when no entries in range', async () => {
      mockWhere.mockResolvedValueOnce([])

      const result = await getTimeEntriesByDateRange('2026-01-01', '2026-01-07')

      expect(result).toEqual([])
    })
  })
})
