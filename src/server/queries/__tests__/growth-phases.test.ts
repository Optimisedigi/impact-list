import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockLimit = vi.fn()
const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy, limit: mockLimit }))
const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }))
const mockSelect = vi.fn(() => ({ from: mockFrom }))

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  growthPhases: {
    id: 'growthPhases.id',
    isActive: 'growthPhases.isActive',
    timeframe: 'growthPhases.timeframe',
    sortOrder: 'growthPhases.sortOrder',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ _op: 'eq', col, val })),
  and: vi.fn((...args: unknown[]) => ({ _op: 'and', args })),
  asc: vi.fn((col) => ({ _op: 'asc', col })),
}))

import { getActivePhase, getActiveGoals, getAllPhases } from '../growth-phases'
import { growthPhases } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

describe('growth-phases queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue([])
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit })
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy })
  })

  describe('getActivePhase', () => {
    it('queries for phases where isActive is true', async () => {
      mockLimit.mockResolvedValueOnce([])

      await getActivePhase()

      expect(eq).toHaveBeenCalledWith(growthPhases.isActive, true)
    })

    it('limits to 1 result', async () => {
      mockLimit.mockResolvedValueOnce([])

      await getActivePhase()

      expect(mockLimit).toHaveBeenCalledWith(1)
    })

    it('returns the first active phase', async () => {
      const phase = { id: 1, name: 'Q1 Phase', isActive: true }
      mockLimit.mockResolvedValueOnce([phase])

      const result = await getActivePhase()

      expect(result).toEqual(phase)
    })

    it('returns null when no active phase exists', async () => {
      mockLimit.mockResolvedValueOnce([])

      const result = await getActivePhase()

      expect(result).toBeNull()
    })
  })

  describe('getActiveGoals', () => {
    it('queries for active phases ordered by timeframe', async () => {
      mockOrderBy.mockResolvedValueOnce([])

      await getActiveGoals()

      expect(eq).toHaveBeenCalledWith(growthPhases.isActive, true)
      expect(asc).toHaveBeenCalledWith(growthPhases.timeframe)
    })

    it('returns goal90 and goal180 from active phases', async () => {
      const goal90 = { id: 1, timeframe: '90_day', isActive: true }
      const goal180 = { id: 2, timeframe: '180_day', isActive: true }
      mockOrderBy.mockResolvedValueOnce([goal90, goal180])

      const result = await getActiveGoals()

      expect(result).toEqual({ goal90, goal180 })
    })

    it('returns null for goal90 when no 90_day phase exists', async () => {
      const goal180 = { id: 2, timeframe: '180_day', isActive: true }
      mockOrderBy.mockResolvedValueOnce([goal180])

      const result = await getActiveGoals()

      expect(result.goal90).toBeNull()
      expect(result.goal180).toEqual(goal180)
    })

    it('returns null for goal180 when no 180_day phase exists', async () => {
      const goal90 = { id: 1, timeframe: '90_day', isActive: true }
      mockOrderBy.mockResolvedValueOnce([goal90])

      const result = await getActiveGoals()

      expect(result.goal90).toEqual(goal90)
      expect(result.goal180).toBeNull()
    })

    it('returns both nulls when no active phases exist', async () => {
      mockOrderBy.mockResolvedValueOnce([])

      const result = await getActiveGoals()

      expect(result).toEqual({ goal90: null, goal180: null })
    })
  })

  describe('getAllPhases', () => {
    it('selects from growthPhases table', async () => {
      mockOrderBy.mockResolvedValueOnce([])

      await getAllPhases()

      expect(mockSelect).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalledWith(growthPhases)
    })

    it('orders by timeframe asc then sortOrder asc', async () => {
      mockOrderBy.mockResolvedValueOnce([])

      await getAllPhases()

      expect(asc).toHaveBeenCalledWith(growthPhases.timeframe)
      expect(asc).toHaveBeenCalledWith(growthPhases.sortOrder)
    })

    it('returns all phases', async () => {
      const phases = [
        { id: 1, name: 'Phase A', timeframe: '90_day', sortOrder: 0 },
        { id: 2, name: 'Phase B', timeframe: '90_day', sortOrder: 1 },
        { id: 3, name: 'Phase C', timeframe: '180_day', sortOrder: 0 },
      ]
      mockOrderBy.mockResolvedValueOnce(phases)

      const result = await getAllPhases()

      expect(result).toEqual(phases)
    })
  })
})
