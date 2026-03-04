import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
// db.select().from(table) must be both thenable (for saveClients) and have .orderBy() (for getAllClients)
const mockSelectOrderBy = vi.fn(() => [])
const mockSelectFrom = vi.fn(() => {
  const rows: unknown[] = []
  return {
    orderBy: mockSelectOrderBy,
    then: (resolve: (val: unknown) => void) => resolve(rows),
  }
})
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }))
const mockValues = vi.fn(() => ({ returning: vi.fn(() => []) }))
const mockInsert = vi.fn(() => ({ values: mockValues }))
const mockDeleteWhere = vi.fn()
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }))

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  clients: {
    id: 'clients.id',
    name: 'clients.name',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getAllClients, saveClients } from '../clients'
import { revalidatePath } from 'next/cache'
import { clients } from '@/db/schema'

// Helper: make mockSelectFrom return a thenable with specific rows
function mockSelectFromReturns(rows: unknown[]) {
  mockSelectFrom.mockReturnValueOnce({
    orderBy: mockSelectOrderBy,
    then: (resolve: (val: unknown) => void) => resolve(rows),
  })
}

describe('clients actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getAllClients ─────────────────────────────────────────

  describe('getAllClients', () => {
    it('selects from clients table with orderBy name', async () => {
      const rows = [{ id: 1, name: 'Acme' }, { id: 2, name: 'Beta Corp' }]
      mockSelectOrderBy.mockReturnValueOnce(rows)

      const result = await getAllClients()

      expect(mockSelect).toHaveBeenCalled()
      expect(mockSelectFrom).toHaveBeenCalledWith(clients)
      expect(mockSelectOrderBy).toHaveBeenCalledWith(clients.name)
      expect(result).toEqual(rows)
    })

    it('returns empty array when no clients exist', async () => {
      mockSelectOrderBy.mockReturnValueOnce([])

      const result = await getAllClients()
      expect(result).toEqual([])
    })
  })

  // ── saveClients ──────────────────────────────────────────

  describe('saveClients', () => {
    it('deletes clients no longer in the list', async () => {
      mockSelectFromReturns([
        { id: 1, name: 'Acme' },
        { id: 2, name: 'Old Client' },
      ])

      await saveClients(['Acme'])

      expect(mockDelete).toHaveBeenCalledWith(clients)
      expect(mockDeleteWhere).toHaveBeenCalledWith({ col: 'clients.id', val: 2 })
    })

    it('does not delete clients that are still in the list', async () => {
      mockSelectFromReturns([
        { id: 1, name: 'Acme' },
      ])

      await saveClients(['Acme'])

      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('adds new clients that do not exist yet', async () => {
      mockSelectFromReturns([
        { id: 1, name: 'Acme' },
      ])

      await saveClients(['Acme', 'New Client'])

      expect(mockInsert).toHaveBeenCalledWith(clients)
      expect(mockValues).toHaveBeenCalledWith({ name: 'New Client' })
    })

    it('does not re-insert existing clients', async () => {
      mockSelectFromReturns([
        { id: 1, name: 'Acme' },
      ])

      await saveClients(['Acme'])

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('trims whitespace from client names', async () => {
      mockSelectFromReturns([])

      await saveClients(['  Acme  ', '  Beta Corp  '])

      expect(mockValues).toHaveBeenCalledWith({ name: 'Acme' })
      expect(mockValues).toHaveBeenCalledWith({ name: 'Beta Corp' })
    })

    it('filters out empty names', async () => {
      mockSelectFromReturns([])

      await saveClients(['Acme', '', '  ', 'Beta'])

      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('revalidates /settings and /tasks paths', async () => {
      mockSelectFromReturns([])

      await saveClients(['Client'])

      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledTimes(2)
    })

    it('handles deleting multiple clients and adding multiple new ones', async () => {
      mockSelectFromReturns([
        { id: 1, name: 'Old A' },
        { id: 2, name: 'Old B' },
        { id: 3, name: 'Keep' },
      ])

      await saveClients(['Keep', 'New X', 'New Y'])

      // Should delete 2 old ones
      expect(mockDelete).toHaveBeenCalledTimes(2)
      // Should insert 2 new ones
      expect(mockInsert).toHaveBeenCalledTimes(2)
    })
  })
})
