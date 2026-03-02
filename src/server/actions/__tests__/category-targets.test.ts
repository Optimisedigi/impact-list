import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockReturning = vi.fn()
const mockFrom = vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) }))
const mockSelect = vi.fn(() => ({ from: mockFrom }))
const mockValues = vi.fn(() => ({ returning: mockReturning }))
const mockInsert = vi.fn(() => ({ values: mockValues }))
const mockSetResult = { where: vi.fn() }
const mockSet = vi.fn(() => mockSetResult)
const mockUpdate = vi.fn(() => ({ set: mockSet }))

// We need to capture .where calls on select().from() per invocation
let selectFromWhereResults: Record<string, unknown[]>

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: vi.fn((condition: { val: string }) => {
          const category = condition?.val
          return Promise.resolve(selectFromWhereResults[category] || [])
        }),
      }),
    }),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  categoryTargets: {
    category: { enumValues: ['client_delivery', 'systems_automation', 'client_growth', 'team_management', 'admin'] },
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { upsertCategoryTargets } from '../category-targets'
import { revalidatePath } from 'next/cache'

describe('category-targets actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectFromWhereResults = {}
    mockReturning.mockResolvedValue([])
  })

  describe('upsertCategoryTargets', () => {
    it('throws an error when target percentages do not sum to 100', async () => {
      const targets = [
        { category: 'admin', targetPercentage: 30 },
        { category: 'client_delivery', targetPercentage: 20 },
      ]

      await expect(upsertCategoryTargets(targets)).rejects.toThrow(
        'Targets must sum to 100%, got 50%'
      )
    })

    it('throws with correct sum in message when sum exceeds 100', async () => {
      const targets = [
        { category: 'admin', targetPercentage: 60 },
        { category: 'client_delivery', targetPercentage: 50 },
      ]

      await expect(upsertCategoryTargets(targets)).rejects.toThrow(
        'Targets must sum to 100%, got 110%'
      )
    })

    it('does not call db.insert or db.update when sum is invalid', async () => {
      const targets = [{ category: 'admin', targetPercentage: 50 }]

      try {
        await upsertCategoryTargets(targets)
      } catch {
        // expected
      }

      expect(mockInsert).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('succeeds and revalidates when percentages sum to 100', async () => {
      const targets = [
        { category: 'admin', targetPercentage: 20 },
        { category: 'client_delivery', targetPercentage: 30 },
        { category: 'client_growth', targetPercentage: 20 },
        { category: 'systems_automation', targetPercentage: 15 },
        { category: 'team_management', targetPercentage: 15 },
      ]

      await upsertCategoryTargets(targets)

      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })

    it('inserts new categories that do not exist yet', async () => {
      selectFromWhereResults = {} // All empty = all new

      const targets = [
        { category: 'admin', targetPercentage: 50 },
        { category: 'client_delivery', targetPercentage: 50 },
      ]

      await upsertCategoryTargets(targets)

      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('updates existing categories instead of inserting', async () => {
      selectFromWhereResults = {
        admin: [{ id: 1, category: 'admin', targetPercentage: 40 }],
        client_delivery: [{ id: 2, category: 'client_delivery', targetPercentage: 60 }],
      }

      const targets = [
        { category: 'admin', targetPercentage: 50 },
        { category: 'client_delivery', targetPercentage: 50 },
      ]

      await upsertCategoryTargets(targets)

      expect(mockUpdate).toHaveBeenCalledTimes(2)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('handles a mix of inserts and updates', async () => {
      selectFromWhereResults = {
        admin: [{ id: 1, category: 'admin', targetPercentage: 40 }],
        // client_delivery is not present, so it's new
      }

      const targets = [
        { category: 'admin', targetPercentage: 50 },
        { category: 'client_delivery', targetPercentage: 50 },
      ]

      await upsertCategoryTargets(targets)

      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })

  describe('getCurrentTargets', () => {
    it('calls db.select().from(categoryTargets)', async () => {
      // We need a separate import test since getCurrentTargets uses the db mock differently
      // The function just returns db.select().from(categoryTargets) directly
      const { getCurrentTargets } = await import('../category-targets')
      const result = await getCurrentTargets()
      // Since our mock returns { where: fn } from .from(), the result will be the from() return
      expect(result).toBeDefined()
    })
  })
})
