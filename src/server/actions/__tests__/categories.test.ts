import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
// db.select().from(table) must be both thenable (for saveCategories) and have .orderBy() (for getAllCategories)
const mockSelectOrderBy = vi.fn(() => [])
const mockSelectFrom = vi.fn(() => {
  const rows: unknown[] = []
  const thenable = {
    orderBy: mockSelectOrderBy,
    then: (resolve: (val: unknown) => void) => resolve(rows),
  }
  return thenable
})
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }))
const mockReturning = vi.fn()
const mockValues = vi.fn(() => ({ returning: mockReturning }))
const mockInsert = vi.fn(() => ({ values: mockValues }))
const mockUpdateWhere = vi.fn()
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }))
const mockUpdate = vi.fn(() => ({ set: mockSet }))
const mockDeleteWhere = vi.fn()
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }))

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  categories: {
    id: 'categories.id',
    key: 'categories.key',
    sortOrder: 'categories.sortOrder',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getAllCategories, saveCategories } from '../categories'
import { revalidatePath } from 'next/cache'
import { categories } from '@/db/schema'

// Helper: make mockSelectFrom return a thenable with specific rows (for `await db.select().from(table)`)
function mockSelectFromReturns(rows: unknown[]) {
  mockSelectFrom.mockReturnValueOnce({
    orderBy: mockSelectOrderBy,
    then: (resolve: (val: unknown) => void) => resolve(rows),
  })
}

describe('categories actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getAllCategories ──────────────────────────────────────

  describe('getAllCategories', () => {
    it('returns existing categories when rows exist', async () => {
      const existingRows = [
        { id: 1, key: 'admin', label: 'Admin', color: 'red', sortOrder: 0 },
      ]
      mockSelectOrderBy.mockReturnValueOnce(existingRows)

      const result = await getAllCategories()

      expect(mockSelect).toHaveBeenCalled()
      expect(mockSelectFrom).toHaveBeenCalledWith(categories)
      expect(result).toEqual(existingRows)
    })

    it('inserts default categories when no rows exist', async () => {
      // First call returns empty (no categories)
      mockSelectOrderBy.mockReturnValueOnce([])
      // Second call returns the newly inserted defaults
      const defaultRows = [
        { id: 1, key: 'client_delivery', label: 'Client Delivery', color: 'oklch(0.55 0.15 90)', sortOrder: 0 },
      ]
      mockSelectOrderBy.mockReturnValueOnce(defaultRows)

      const result = await getAllCategories()

      // Should have inserted 5 default categories
      expect(mockInsert).toHaveBeenCalledTimes(5)
      expect(mockInsert).toHaveBeenCalledWith(categories)
      expect(result).toEqual(defaultRows)
    })

    it('inserts defaults with correct sortOrder values', async () => {
      mockSelectOrderBy.mockReturnValueOnce([])
      mockSelectOrderBy.mockReturnValueOnce([])

      await getAllCategories()

      // Check that sortOrder values 0-4 were used
      const sortOrders = mockValues.mock.calls.map((call) => call[0].sortOrder)
      expect(sortOrders).toEqual([0, 1, 2, 3, 4])
    })
  })

  // ── saveCategories ───────────────────────────────────────

  describe('saveCategories', () => {
    it('deletes categories no longer in the list', async () => {
      // saveCategories calls `await db.select().from(categories)` (no orderBy)
      mockSelectFromReturns([
        { id: 1, key: 'admin', label: 'Admin', color: 'gray', sortOrder: 0 },
        { id: 2, key: 'marketing', label: 'Marketing', color: 'blue', sortOrder: 1 },
      ])

      // Save only "Admin" — "Marketing" should be deleted
      await saveCategories(['Admin'])

      expect(mockDelete).toHaveBeenCalledWith(categories)
      expect(mockDeleteWhere).toHaveBeenCalledWith({ col: 'categories.id', val: 2 })
    })

    it('updates existing categories with new label and sortOrder', async () => {
      mockSelectFromReturns([
        { id: 1, key: 'admin', label: 'Admin', color: 'gray', sortOrder: 0 },
      ])

      await saveCategories(['Admin'])

      expect(mockUpdate).toHaveBeenCalledWith(categories)
      expect(mockSet).toHaveBeenCalledWith({ label: 'Admin', sortOrder: 0 })
      expect(mockUpdateWhere).toHaveBeenCalledWith({ col: 'categories.id', val: 1 })
    })

    it('inserts new categories with generated key and color from palette', async () => {
      mockSelectFromReturns([])

      await saveCategories(['Client Delivery'])

      expect(mockInsert).toHaveBeenCalledWith(categories)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'client_delivery',
          label: 'Client Delivery',
          sortOrder: 0,
          color: expect.any(String),
        })
      )
    })

    it('generates correct keys from labels', async () => {
      mockSelectFromReturns([])

      await saveCategories(['Systems & Automation', 'Team Management'])

      const keys = mockValues.mock.calls.map((call) => call[0].key)
      expect(keys).toContain('systems_automation')
      expect(keys).toContain('team_management')
    })

    it('skips empty labels', async () => {
      mockSelectFromReturns([])

      await saveCategories(['Valid', '', '  ', 'Also Valid'])

      // Only 2 non-empty labels should be processed
      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('revalidates /settings and /tasks paths', async () => {
      mockSelectFromReturns([])

      await saveCategories(['Admin'])

      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledTimes(2)
    })

    it('handles mix of existing and new categories', async () => {
      mockSelectFromReturns([
        { id: 1, key: 'admin', label: 'Admin', color: 'gray', sortOrder: 0 },
      ])

      await saveCategories(['Admin', 'New Category'])

      // Should update existing and insert new
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'new_category',
          label: 'New Category',
          sortOrder: 1,
        })
      )
    })
  })
})
