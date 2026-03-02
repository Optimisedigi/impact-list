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

// Track all update calls to verify deactivate-all then activate-one sequence
let updateCallLog: Array<{ setArg: unknown; whereArg?: unknown }>

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
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
  growthPhases: { id: 'growthPhases.id', isActive: 'growthPhases.isActive' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
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
    it('inserts with provided name, description, and focusAreas', async () => {
      const data = {
        name: 'Growth Phase',
        description: 'Description',
        focusAreas: 'Sales, Marketing',
      }

      await createPhase(data)

      expect(mockInsert).toHaveBeenCalledWith(growthPhases)
      expect(mockValues).toHaveBeenCalledWith({
        name: 'Growth Phase',
        description: 'Description',
        focusAreas: 'Sales, Marketing',
      })
    })

    it('sets description and focusAreas to null when not provided', async () => {
      await createPhase({ name: 'Minimal Phase' })

      expect(mockValues).toHaveBeenCalledWith({
        name: 'Minimal Phase',
        description: null,
        focusAreas: null,
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
    it('makes two update calls: deactivate all, then activate one', async () => {
      await setActivePhase(4)

      expect(updateCallLog).toHaveLength(2)
    })

    it('first deactivates all phases with isActive: false (no where clause)', async () => {
      await setActivePhase(4)

      expect(updateCallLog[0].setArg).toEqual({ isActive: false })
      // The first update should NOT have a where clause (deactivates ALL)
      expect(updateCallLog[0].whereArg).toBeUndefined()
    })

    it('then activates the selected phase with isActive: true', async () => {
      await setActivePhase(4)

      expect(updateCallLog[1].setArg).toEqual({ isActive: true })
      expect(updateCallLog[1].whereArg).toEqual({ col: 'growthPhases.id', val: 4 })
    })

    it('revalidates /settings and /focus', async () => {
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
