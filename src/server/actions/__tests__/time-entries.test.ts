import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockReturning = vi.fn()
const mockWhere = vi.fn(() => ({ returning: mockReturning }))
const mockSet = vi.fn(() => ({ where: mockWhere }))
const mockValues = vi.fn(() => ({ returning: mockReturning }))
const mockInsert = vi.fn(() => ({ values: mockValues }))
const mockUpdate = vi.fn(() => ({ set: mockSet }))

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  timeEntries: { taskId: 'timeEntries.taskId' },
  tasks: { id: 'tasks.id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    _tag: 'sql',
    strings: Array.from(strings),
    values,
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createTimeEntry, quickLogHours } from '../time-entries'
import { revalidatePath } from 'next/cache'
import { timeEntries, tasks } from '@/db/schema'

describe('time-entries actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturning.mockResolvedValue([{ id: 1, taskId: 10, hours: 2 }])
  })

  describe('createTimeEntry', () => {
    it('inserts a time entry with the provided data', async () => {
      const data = { taskId: 10, hours: 2.5, date: '2026-03-01', note: 'Worked on feature' }

      await createTimeEntry(data)

      expect(mockInsert).toHaveBeenCalledWith(timeEntries)
      expect(mockValues).toHaveBeenCalledWith(data)
      expect(mockReturning).toHaveBeenCalled()
    })

    it('updates the parent task actualHours after inserting', async () => {
      await createTimeEntry({ taskId: 10, hours: 1, date: '2026-03-01' })

      // First call is insert on timeEntries, second is update on tasks
      expect(mockUpdate).toHaveBeenCalledWith(tasks)
      const setArg = mockSet.mock.calls[0][0]
      expect(setArg.actualHours).toBeDefined()
      expect(setArg.actualHours._tag).toBe('sql')
      expect(setArg.updatedAt).toBeDefined()
    })

    it('filters the task update by task id', async () => {
      await createTimeEntry({ taskId: 42, hours: 1, date: '2026-03-01' })

      expect(mockWhere).toHaveBeenCalledWith({ col: 'tasks.id', val: 42 })
    })

    it('revalidates /tasks and /focus paths', async () => {
      await createTimeEntry({ taskId: 10, hours: 1, date: '2026-03-01' })

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })

    it('returns the first element from returning', async () => {
      const row = { id: 5, taskId: 10, hours: 3 }
      mockReturning.mockResolvedValueOnce([row])

      const result = await createTimeEntry({ taskId: 10, hours: 3, date: '2026-03-01' })
      expect(result).toEqual(row)
    })

    it('works without a note (optional field)', async () => {
      const data = { taskId: 10, hours: 1, date: '2026-03-01' }

      await createTimeEntry(data)

      expect(mockValues).toHaveBeenCalledWith(data)
    })
  })

  describe('quickLogHours', () => {
    it('uses todays date formatted as YYYY-MM-DD', async () => {
      const today = new Date().toISOString().split('T')[0]

      await quickLogHours(10, 2)

      expect(mockValues).toHaveBeenCalledWith({
        taskId: 10,
        hours: 2,
        date: today,
      })
    })

    it('delegates to createTimeEntry (inserts and updates task)', async () => {
      await quickLogHours(10, 3)

      // Should trigger both insert (timeEntries) and update (tasks)
      expect(mockInsert).toHaveBeenCalledWith(timeEntries)
      expect(mockUpdate).toHaveBeenCalledWith(tasks)
    })

    it('revalidates paths like createTimeEntry', async () => {
      await quickLogHours(10, 1)

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })
  })
})
