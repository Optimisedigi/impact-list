import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockReturning = vi.fn()
const mockWhere = vi.fn(() => ({ returning: mockReturning }))
const mockSet = vi.fn(() => ({ where: mockWhere }))
const mockValues = vi.fn(() => ({ returning: mockReturning }))
const mockInsert = vi.fn(() => ({ values: mockValues }))
const mockUpdate = vi.fn(() => ({ set: mockSet }))
const mockDeleteWhere = vi.fn()
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }))

// Mock select chain for setActivePhase's phase lookup
const mockSelectWhere = vi.fn()
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }))
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }))

// Track all update calls to verify deactivate-by-timeframe then activate-one sequence
let updateCallLog: Array<{ setArg: unknown; whereArg?: unknown }>

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => {
      const setFn = vi.fn((setArg: unknown) => {
        const entry: { setArg: unknown; whereArg?: unknown } = { setArg }
        updateCallLog.push(entry)
        return {
          where: vi.fn((whereArg: unknown) => {
            entry.whereArg = whereArg
            return { returning: mockReturning }
          }),
          returning: mockReturning,
        }
      })
      mockUpdate(...args)
      return { set: setFn }
    },
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  growthPhases: { id: 'growthPhases.id', isActive: 'growthPhases.isActive', timeframe: 'growthPhases.timeframe' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => ({ and: args })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createPhase, updatePhase, setActivePhase, deletePhase } from '../growth-phases'
import { revalidatePath } from 'next/cache'
import { growthPhases } from '@/db/schema'

describe('growth-phases actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateCallLog = []
    mockReturning.mockResolvedValue([{ id: 1, name: 'Phase 1' }])
  })

  describe('createPhase', () => {
    it('inserts with provided name, description, focusAreas, and timeframe', async () => {
      const data = {
        name: 'Growth Phase',
        description: 'Description',
        focusAreas: 'Sales, Marketing',
        timeframe: '90_day',
      }

      await createPhase(data)

      expect(mockInsert).toHaveBeenCalledWith(growthPhases)
      expect(mockValues).toHaveBeenCalledWith({
        name: 'Growth Phase',
        description: 'Description',
        focusAreas: 'Sales, Marketing',
        timeframe: '90_day',
      })
    })

    it('sets description and focusAreas to null, timeframe to 90_day when not provided', async () => {
      await createPhase({ name: 'Minimal Phase' })

      expect(mockValues).toHaveBeenCalledWith({
        name: 'Minimal Phase',
        description: null,
        focusAreas: null,
        timeframe: '90_day',
      })
    })

    it('revalidates /settings path', async () => {
      await createPhase({ name: 'Test' })

      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })

    it('returns the first element from returning', async () => {
      const row = { id: 5, name: 'New Phase' }
      mockReturning.mockResolvedValueOnce([row])

      const result = await createPhase({ name: 'New Phase' })
      expect(result).toEqual(row)
    })
  })

  describe('updatePhase', () => {
    it('updates specific fields for a given phase id', async () => {
      await updatePhase(2, { name: 'Updated', description: 'New desc' })

      expect(mockUpdate).toHaveBeenCalledWith(growthPhases)
      // Verify the set arg includes the fields
      expect(updateCallLog[0].setArg).toEqual({ name: 'Updated', description: 'New desc' })
    })

    it('filters by phase id', async () => {
      await updatePhase(3, { name: 'X' })

      expect(updateCallLog[0].whereArg).toEqual({ col: 'growthPhases.id', val: 3 })
    })

    it('revalidates /settings and /focus paths', async () => {
      await updatePhase(1, { name: 'Y' })

      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })
  })

  describe('setActivePhase', () => {
    beforeEach(() => {
      // Mock the select query to return a phase with a timeframe
      mockSelectWhere.mockResolvedValue([{ id: 4, name: 'Phase 4', timeframe: '90_day' }])
    })

    it('first selects the phase to determine its timeframe', async () => {
      await setActivePhase(4)

      expect(mockSelect).toHaveBeenCalled()
      expect(mockSelectFrom).toHaveBeenCalledWith(growthPhases)
      expect(mockSelectWhere).toHaveBeenCalledWith({ col: 'growthPhases.id', val: 4 })
    })

    it('makes two update calls: deactivate by timeframe, then activate one', async () => {
      await setActivePhase(4)

      expect(updateCallLog).toHaveLength(2)
    })

    it('first deactivates phases with the same timeframe', async () => {
      await setActivePhase(4)

      expect(updateCallLog[0].setArg).toEqual({ isActive: false })
      // The first update filters by timeframe
      expect(updateCallLog[0].whereArg).toEqual({ col: 'growthPhases.timeframe', val: '90_day' })
    })

    it('then activates the selected phase with isActive: true', async () => {
      await setActivePhase(4)

      expect(updateCallLog[1].setArg).toEqual({ isActive: true })
      expect(updateCallLog[1].whereArg).toEqual({ col: 'growthPhases.id', val: 4 })
    })

    it('does nothing if the phase is not found', async () => {
      mockSelectWhere.mockResolvedValueOnce([])

      await setActivePhase(999)

      expect(updateCallLog).toHaveLength(0)
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('revalidates /settings and /focus', async () => {
      mockSelectWhere.mockResolvedValue([{ id: 1, name: 'Phase 1', timeframe: '90_day' }])

      await setActivePhase(1)

      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })
  })

  describe('deletePhase', () => {
    it('calls db.delete with the growthPhases table', async () => {
      await deletePhase(2)

      expect(mockDelete).toHaveBeenCalledWith(growthPhases)
      expect(mockDeleteWhere).toHaveBeenCalledWith({ col: 'growthPhases.id', val: 2 })
    })

    it('revalidates /settings path only', async () => {
      await deletePhase(1)

      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })
})
