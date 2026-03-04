import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockOrderBy = vi.fn()
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy, where: mockWhere }))
const mockSelect = vi.fn(() => ({ from: mockFrom }))
const mockSelectDistinctFrom = vi.fn()
const mockSelectDistinct = vi.fn(() => ({ from: mockSelectDistinctFrom }))

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    selectDistinct: (...args: unknown[]) => mockSelectDistinct(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'tasks.id',
    title: 'tasks.title',
    status: 'tasks.status',
    category: 'tasks.category',
    client: 'tasks.client',
    leverageScore: 'tasks.leverageScore',
    sortOrder: 'tasks.sortOrder',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ _op: 'eq', col, val })),
  like: vi.fn((col, val) => ({ _op: 'like', col, val })),
  and: vi.fn((...args: unknown[]) => ({ _op: 'and', args })),
  desc: vi.fn((col) => ({ _op: 'desc', col })),
  asc: vi.fn((col) => ({ _op: 'asc', col })),
  inArray: vi.fn((col, vals) => ({ _op: 'inArray', col, vals })),
  ne: vi.fn((col, val) => ({ _op: 'ne', col, val })),
}))

import {
  getAllTasks,
  getTaskById,
  getTasksByFilter,
  getDistinctClients,
} from '../tasks'
import { tasks } from '@/db/schema'
import { eq, like, and, desc, asc, inArray, ne } from 'drizzle-orm'

describe('tasks queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrderBy.mockResolvedValue([])
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockFrom.mockReturnValue({ orderBy: mockOrderBy, where: mockWhere })
  })

  describe('getAllTasks', () => {
    it('selects from tasks table', async () => {
      await getAllTasks()

      expect(mockSelect).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalledWith(tasks)
    })

    it('orders by sortOrder ascending then leverageScore descending', async () => {
      await getAllTasks()

      expect(mockOrderBy).toHaveBeenCalled()
      const args = mockOrderBy.mock.calls[0]
      expect(asc).toHaveBeenCalledWith(tasks.sortOrder)
      expect(desc).toHaveBeenCalledWith(tasks.leverageScore)
    })

    it('returns the query result', async () => {
      const mockTasks = [
        { id: 1, title: 'Task A', leverageScore: 10 },
        { id: 2, title: 'Task B', leverageScore: 5 },
      ]
      mockOrderBy.mockResolvedValueOnce(mockTasks)

      const result = await getAllTasks()
      expect(result).toEqual(mockTasks)
    })
  })

  describe('getTaskById', () => {
    it('selects from tasks and filters by id', async () => {
      const mockResult = [{ id: 3, title: 'Found Task' }]
      mockWhere.mockReturnValueOnce(mockResult)

      await getTaskById(3)

      expect(mockSelect).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalledWith(tasks)
      expect(eq).toHaveBeenCalledWith(tasks.id, 3)
    })

    it('returns the first element when found', async () => {
      const task = { id: 5, title: 'My Task' }
      mockWhere.mockResolvedValueOnce([task])

      const result = await getTaskById(5)
      expect(result).toEqual(task)
    })

    it('returns null when no task is found', async () => {
      mockWhere.mockResolvedValueOnce([])

      const result = await getTaskById(999)
      expect(result).toBeNull()
    })
  })

  describe('getTasksByFilter', () => {
    it('excludes done tasks by default when no status filter provided', async () => {
      await getTasksByFilter({})

      expect(ne).toHaveBeenCalledWith(tasks.status, 'done')
    })

    it('filters by single status value', async () => {
      await getTasksByFilter({ status: 'in_progress' })

      expect(eq).toHaveBeenCalledWith(tasks.status, 'in_progress')
    })

    it('filters by multiple comma-separated statuses using inArray', async () => {
      await getTasksByFilter({ status: 'not_started,in_progress' })

      expect(inArray).toHaveBeenCalledWith(tasks.status, [
        'not_started',
        'in_progress',
      ])
    })

    it('filters by category', async () => {
      await getTasksByFilter({ category: 'admin' })

      expect(eq).toHaveBeenCalledWith(tasks.category, 'admin')
    })

    it('filters by client', async () => {
      await getTasksByFilter({ client: 'Acme Corp' })

      expect(eq).toHaveBeenCalledWith(tasks.client, 'Acme Corp')
    })

    it('filters by search term using like with wildcards', async () => {
      await getTasksByFilter({ search: 'urgent' })

      expect(like).toHaveBeenCalledWith(tasks.title, '%urgent%')
    })

    it('combines multiple filters with and()', async () => {
      await getTasksByFilter({
        status: 'in_progress',
        category: 'admin',
        client: 'Acme',
        search: 'report',
      })

      expect(and).toHaveBeenCalled()
      expect(eq).toHaveBeenCalledWith(tasks.status, 'in_progress')
      expect(eq).toHaveBeenCalledWith(tasks.category, 'admin')
      expect(eq).toHaveBeenCalledWith(tasks.client, 'Acme')
      expect(like).toHaveBeenCalledWith(tasks.title, '%report%')
    })

    it('orders results by sortOrder asc then leverageScore desc', async () => {
      await getTasksByFilter({})

      expect(asc).toHaveBeenCalledWith(tasks.sortOrder)
      expect(desc).toHaveBeenCalledWith(tasks.leverageScore)
    })
  })

  describe('getDistinctClients', () => {
    it('calls selectDistinct with client field', async () => {
      mockSelectDistinctFrom.mockResolvedValueOnce([])

      await getDistinctClients()

      expect(mockSelectDistinct).toHaveBeenCalledWith({ client: tasks.client })
      expect(mockSelectDistinctFrom).toHaveBeenCalledWith(tasks)
    })

    it('maps results to client strings', async () => {
      mockSelectDistinctFrom.mockResolvedValueOnce([
        { client: 'Acme' },
        { client: 'Globex' },
      ])

      const result = await getDistinctClients()
      expect(result).toEqual(['Acme', 'Globex'])
    })

    it('filters out null/undefined clients', async () => {
      mockSelectDistinctFrom.mockResolvedValueOnce([
        { client: 'Acme' },
        { client: null },
        { client: undefined },
        { client: 'Globex' },
      ])

      const result = await getDistinctClients()
      expect(result).toEqual(['Acme', 'Globex'])
    })

    it('returns empty array when no clients exist', async () => {
      mockSelectDistinctFrom.mockResolvedValueOnce([])

      const result = await getDistinctClients()
      expect(result).toEqual([])
    })
  })
})
