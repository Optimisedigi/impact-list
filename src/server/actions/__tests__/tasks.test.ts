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
const mockSelectFrom = vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) }))
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }))

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: { id: 'tasks.id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  inArray: vi.fn((col, vals) => ({ col, vals })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import {
  createTask,
  updateTask,
  updateTaskField,
  deleteTask,
  deleteTasks,
  duplicateTasks,
  dismissFromFocus,
  bulkUpdateField,
} from '../tasks'
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

  describe('deleteTasks', () => {
    it('does nothing when given an empty array', async () => {
      await deleteTasks([])

      expect(mockDelete).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('calls db.delete with inArray for multiple ids', async () => {
      await deleteTasks([1, 2, 3])

      expect(mockDelete).toHaveBeenCalledWith(tasks)
      expect(mockDeleteWhere).toHaveBeenCalledWith({ col: 'tasks.id', vals: [1, 2, 3] })
    })

    it('revalidates /tasks and /focus paths', async () => {
      await deleteTasks([5])

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })
  })

  describe('duplicateTasks', () => {
    it('returns empty array when given an empty ids array', async () => {
      const result = await duplicateTasks([])

      expect(result).toEqual([])
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('selects originals then inserts cloned tasks', async () => {
      const originals = [
        {
          id: 1,
          title: 'Task A',
          category: 'admin',
          status: 'in_progress',
          toComplete: 'today',
          client: 'Acme',
          deadline: '2026-03-10',
          estimatedHours: 5,
          description: 'Desc A',
          priorityScore: 9,
          leverageScore: 8,
          sequenceReason: 'Do first',
          actualHours: 2,
          completedAt: null,
        },
      ]
      const mockFromWhere = vi.fn().mockResolvedValue(originals)
      mockSelectFrom.mockReturnValueOnce({ where: mockFromWhere })
      mockReturning.mockResolvedValueOnce([{ id: 10, title: 'Task A' }])

      const result = await duplicateTasks([1])

      expect(mockSelect).toHaveBeenCalled()
      expect(mockSelectFrom).toHaveBeenCalledWith(tasks)
      expect(mockInsert).toHaveBeenCalledWith(tasks)
      // Verify cloned data strips scores and actualHours
      const insertedValues = mockValues.mock.calls[0][0]
      expect(insertedValues[0].title).toBe('Task A')
      expect(insertedValues[0].priorityScore).toBeNull()
      expect(insertedValues[0].leverageScore).toBeNull()
      expect(insertedValues[0].sequenceReason).toBeNull()
      expect(insertedValues[0].actualHours).toBeNull()
      expect(insertedValues[0].completedAt).toBeNull()
      expect(result).toEqual([{ id: 10, title: 'Task A' }])
    })

    it('revalidates /tasks and /focus paths', async () => {
      const mockFromWhere = vi.fn().mockResolvedValue([
        { id: 1, title: 'T', category: 'admin', status: 'not_started', toComplete: null, client: null, deadline: null, estimatedHours: null, description: null },
      ])
      mockSelectFrom.mockReturnValueOnce({ where: mockFromWhere })
      mockReturning.mockResolvedValueOnce([{ id: 2, title: 'T' }])

      await duplicateTasks([1])

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })
  })

  describe('dismissFromFocus', () => {
    it('sets dismissedFromFocus to a timestamp string', async () => {
      const beforeTime = new Date().toISOString()

      await dismissFromFocus(4)

      expect(mockUpdate).toHaveBeenCalledWith(tasks)
      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.dismissedFromFocus).toBeDefined()
      expect(typeof setArg.dismissedFromFocus).toBe('string')
      expect(setArg.dismissedFromFocus >= beforeTime).toBe(true)
    })

    it('filters by task id using eq', async () => {
      await dismissFromFocus(4)

      expect(mockWhere).toHaveBeenCalledWith({ col: 'tasks.id', val: 4 })
    })

    it('revalidates /focus only (not /tasks)', async () => {
      await dismissFromFocus(1)

      expect(revalidatePath).toHaveBeenCalledWith('/focus')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })

  describe('bulkUpdateField', () => {
    it('does nothing when given an empty ids array', async () => {
      await bulkUpdateField([], 'status', 'done')

      expect(mockUpdate).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('updates the specified field for multiple ids using inArray', async () => {
      await bulkUpdateField([1, 2, 3], 'status', 'done')

      expect(mockUpdate).toHaveBeenCalledWith(tasks)
      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.status).toBe('done')
      expect(setArg.updatedAt).toBeDefined()
      expect(mockWhere).toHaveBeenCalledWith({ col: 'tasks.id', vals: [1, 2, 3] })
    })

    it('sets completedAt when status is changed to done', async () => {
      const beforeTime = new Date().toISOString()

      await bulkUpdateField([1], 'status', 'done')

      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.completedAt).toBeDefined()
      expect(setArg.completedAt >= beforeTime).toBe(true)
    })

    it('sets completedAt to null when status is changed to non-done', async () => {
      await bulkUpdateField([1], 'status', 'in_progress')

      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.completedAt).toBeNull()
    })

    it('does not set completedAt when field is not status', async () => {
      await bulkUpdateField([1, 2], 'category', 'admin')

      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.completedAt).toBeUndefined()
      expect(setArg.category).toBe('admin')
    })

    it('revalidates /tasks and /focus paths', async () => {
      await bulkUpdateField([1], 'title', 'Updated')

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })
  })
})
