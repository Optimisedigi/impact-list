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

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: { id: 'tasks.id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createTask, updateTask, updateTaskField, deleteTask } from '../tasks'
import { revalidatePath } from 'next/cache'
import { tasks } from '@/db/schema'

describe('tasks actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturning.mockResolvedValue([{ id: 1, title: 'Test Task' }])
  })

  describe('createTask', () => {
    it('calls db.insert with the tasks table and provided data', async () => {
      const data = {
        title: 'New Task',
        category: 'admin' as const,
        status: 'in_progress' as const,
      }

      await createTask(data)

      expect(mockInsert).toHaveBeenCalledWith(tasks)
      expect(mockValues).toHaveBeenCalledWith(data)
      expect(mockReturning).toHaveBeenCalled()
    })

    it('returns the first element from the returning array', async () => {
      const mockRow = { id: 42, title: 'Created Task' }
      mockReturning.mockResolvedValueOnce([mockRow])

      const result = await createTask({
        title: 'Created Task',
        category: 'admin' as const,
      })

      expect(result).toEqual(mockRow)
    })

    it('revalidates /tasks and /focus paths', async () => {
      await createTask({ title: 'Task', category: 'admin' as const })

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
      expect(revalidatePath).toHaveBeenCalledTimes(2)
    })
  })

  describe('updateTask', () => {
    it('calls db.update with an updatedAt timestamp', async () => {
      const data = { title: 'Updated Title' }
      const beforeTime = new Date().toISOString()

      await updateTask(1, data)

      expect(mockUpdate).toHaveBeenCalledWith(tasks)
      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.title).toBe('Updated Title')
      expect(setArg.updatedAt).toBeDefined()
      expect(setArg.updatedAt >= beforeTime).toBe(true)
    })

    it('filters by task id using eq', async () => {
      await updateTask(5, { title: 'X' })

      expect(mockWhere).toHaveBeenCalledWith({ col: 'tasks.id', val: 5 })
    })

    it('revalidates /tasks and /focus paths', async () => {
      await updateTask(1, { title: 'Y' })

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })

    it('returns the first element from returning', async () => {
      const row = { id: 1, title: 'Updated' }
      mockReturning.mockResolvedValueOnce([row])

      const result = await updateTask(1, { title: 'Updated' })
      expect(result).toEqual(row)
    })
  })

  describe('updateTaskField', () => {
    it('updates a single field by name with computed property', async () => {
      await updateTaskField(3, 'status', 'done')

      expect(mockUpdate).toHaveBeenCalledWith(tasks)
      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.status).toBe('done')
      expect(setArg.updatedAt).toBeDefined()
    })

    it('handles numeric field values', async () => {
      await updateTaskField(3, 'priorityScore', 8)

      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.priorityScore).toBe(8)
    })

    it('handles null field values', async () => {
      await updateTaskField(3, 'deadline', null)

      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.deadline).toBeNull()
    })

    it('revalidates /tasks only (not /focus)', async () => {
      await updateTaskField(1, 'title', 'New')

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteTask', () => {
    it('calls db.delete with the tasks table', async () => {
      await deleteTask(7)

      expect(mockDelete).toHaveBeenCalledWith(tasks)
      expect(mockDeleteWhere).toHaveBeenCalledWith({ col: 'tasks.id', val: 7 })
    })

    it('revalidates /tasks and /focus paths', async () => {
      await deleteTask(1)

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })
  })
})
