import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockReturning = vi.fn()
const mockSelectWhere = vi.fn(() => ({ limit: vi.fn(() => []) }))
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere, orderBy: vi.fn(() => []) }))
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }))
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
  recurringTasks: {
    id: 'recurringTasks.id',
    title: 'recurringTasks.title',
    isActive: 'recurringTasks.isActive',
  },
  tasks: { id: 'tasks.id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => ({ _type: 'and', args })),
  lte: vi.fn((col, val) => ({ _type: 'lte', col, val })),
  isNull: vi.fn((col) => ({ _type: 'isNull', col })),
  or: vi.fn((...args) => ({ _type: 'or', args })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import {
  getAllRecurringTasks,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  generateRecurringTasks,
} from '../recurring-tasks'
import { revalidatePath } from 'next/cache'
import { recurringTasks, tasks } from '@/db/schema'

describe('recurring-tasks actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturning.mockResolvedValue([{ id: 1, title: 'Test' }])
  })

  // ── getAllRecurringTasks ──────────────────────────────────

  describe('getAllRecurringTasks', () => {
    it('selects from recurringTasks table with orderBy', async () => {
      const mockOrderBy = vi.fn(() => [])
      mockSelectFrom.mockReturnValueOnce({ where: mockSelectWhere, orderBy: mockOrderBy })

      await getAllRecurringTasks()

      expect(mockSelect).toHaveBeenCalled()
      expect(mockSelectFrom).toHaveBeenCalledWith(recurringTasks)
      expect(mockOrderBy).toHaveBeenCalledWith(recurringTasks.title)
    })

    it('returns the result from db query', async () => {
      const rows = [{ id: 1, title: 'Weekly Report' }, { id: 2, title: 'Monthly Review' }]
      const mockOrderBy = vi.fn(() => rows)
      mockSelectFrom.mockReturnValueOnce({ where: mockSelectWhere, orderBy: mockOrderBy })

      const result = await getAllRecurringTasks()
      expect(result).toEqual(rows)
    })
  })

  // ── createRecurringTask ──────────────────────────────────

  describe('createRecurringTask', () => {
    it('inserts into recurringTasks table with provided data', async () => {
      const data = {
        title: 'Weekly Standup',
        category: 'admin',
        frequency: 'weekly',
      }

      await createRecurringTask(data)

      expect(mockInsert).toHaveBeenCalledWith(recurringTasks)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Weekly Standup',
          category: 'admin',
          frequency: 'weekly',
          dayOfWeek: 1,
        })
      )
      expect(mockReturning).toHaveBeenCalled()
    })

    it('sets null defaults for optional fields', async () => {
      await createRecurringTask({ title: 'Task', category: 'admin', frequency: 'monthly' })

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          client: null,
          estimatedHours: null,
          dayOfMonth: null,
        })
      )
    })

    it('passes through optional fields when provided', async () => {
      const data = {
        title: 'Client Check-in',
        category: 'client_delivery',
        frequency: 'fortnightly',
        description: 'Bi-weekly client sync',
        client: 'Acme Corp',
        estimatedHours: 1.5,
        dayOfWeek: 3,
        dayOfMonth: 15,
      }

      await createRecurringTask(data)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Bi-weekly client sync',
          client: 'Acme Corp',
          estimatedHours: 1.5,
          dayOfWeek: 3,
          dayOfMonth: 15,
        })
      )
    })

    it('returns the first element from returning', async () => {
      const row = { id: 5, title: 'New Recurring' }
      mockReturning.mockResolvedValueOnce([row])

      const result = await createRecurringTask({ title: 'New Recurring', category: 'admin', frequency: 'weekly' })
      expect(result).toEqual(row)
    })

    it('revalidates /settings path', async () => {
      await createRecurringTask({ title: 'Task', category: 'admin', frequency: 'weekly' })
      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })

  // ── updateRecurringTask ──────────────────────────────────

  describe('updateRecurringTask', () => {
    it('updates recurringTasks table with provided data', async () => {
      await updateRecurringTask(3, { title: 'Updated Title' })

      expect(mockUpdate).toHaveBeenCalledWith(recurringTasks)
      expect(mockSet).toHaveBeenCalledWith({ title: 'Updated Title' })
      expect(mockUpdateWhere).toHaveBeenCalledWith({ col: 'recurringTasks.id', val: 3 })
    })

    it('revalidates /settings path', async () => {
      await updateRecurringTask(1, { isActive: false })
      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })

  // ── deleteRecurringTask ──────────────────────────────────

  describe('deleteRecurringTask', () => {
    it('deletes from recurringTasks table by id', async () => {
      await deleteRecurringTask(7)

      expect(mockDelete).toHaveBeenCalledWith(recurringTasks)
      expect(mockDeleteWhere).toHaveBeenCalledWith({ col: 'recurringTasks.id', val: 7 })
    })

    it('revalidates /settings path', async () => {
      await deleteRecurringTask(1)
      expect(revalidatePath).toHaveBeenCalledWith('/settings')
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })

  // ── generateRecurringTasks ───────────────────────────────

  describe('generateRecurringTasks', () => {
    function mockActiveRecurringTasks(rtList: Record<string, unknown>[]) {
      const mockWhere = vi.fn(() => rtList)
      mockSelectFrom.mockReturnValueOnce({ where: mockWhere, orderBy: vi.fn(() => []) })
    }

    it('returns { created: 0 } when there are no active recurring tasks', async () => {
      mockActiveRecurringTasks([])

      const result = await generateRecurringTasks()
      expect(result).toEqual({ created: 0 })
    })

    it('generates a task when lastGeneratedAt is null', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Weekly Report', category: 'admin', frequency: 'weekly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      const result = await generateRecurringTasks()

      expect(result.created).toBe(1)
      expect(mockInsert).toHaveBeenCalledWith(tasks)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Weekly Report',
          category: 'admin',
          status: 'not_started',
          recurringTaskId: 1,
        })
      )
    })

    it('sets toComplete to "this_week" for weekly frequency', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Weekly', category: 'admin', frequency: 'weekly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      await generateRecurringTasks()

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ toComplete: 'this_week' })
      )
    })

    it('sets toComplete to null for non-weekly frequencies', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Monthly', category: 'admin', frequency: 'monthly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      await generateRecurringTasks()

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ toComplete: null })
      )
    })

    it('generates a weekly task when 7+ days since last generation', async () => {
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

      mockActiveRecurringTasks([
        { id: 1, title: 'Weekly', category: 'admin', frequency: 'weekly', lastGeneratedAt: eightDaysAgo.toISOString(), client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      const result = await generateRecurringTasks()
      expect(result.created).toBe(1)
    })

    it('does not generate a weekly task when less than 7 days since last generation', async () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      mockActiveRecurringTasks([
        { id: 1, title: 'Weekly', category: 'admin', frequency: 'weekly', lastGeneratedAt: threeDaysAgo.toISOString(), client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      const result = await generateRecurringTasks()
      expect(result.created).toBe(0)
    })

    it('generates a fortnightly task when 14+ days since last generation', async () => {
      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

      mockActiveRecurringTasks([
        { id: 1, title: 'Fortnightly', category: 'admin', frequency: 'fortnightly', lastGeneratedAt: fifteenDaysAgo.toISOString(), client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      const result = await generateRecurringTasks()
      expect(result.created).toBe(1)
    })

    it('does not generate a fortnightly task when less than 14 days since last generation', async () => {
      const tenDaysAgo = new Date()
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

      mockActiveRecurringTasks([
        { id: 1, title: 'Fortnightly', category: 'admin', frequency: 'fortnightly', lastGeneratedAt: tenDaysAgo.toISOString(), client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      const result = await generateRecurringTasks()
      expect(result.created).toBe(0)
    })

    it('generates a monthly task when 28+ days since last generation', async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      mockActiveRecurringTasks([
        { id: 1, title: 'Monthly', category: 'admin', frequency: 'monthly', lastGeneratedAt: thirtyDaysAgo.toISOString(), client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      const result = await generateRecurringTasks()
      expect(result.created).toBe(1)
    })

    it('does not generate a monthly task when less than 28 days since last generation', async () => {
      const twentyDaysAgo = new Date()
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20)

      mockActiveRecurringTasks([
        { id: 1, title: 'Monthly', category: 'admin', frequency: 'monthly', lastGeneratedAt: twentyDaysAgo.toISOString(), client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      const result = await generateRecurringTasks()
      expect(result.created).toBe(0)
    })

    it('sets deadline 7 days out for weekly tasks', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Weekly', category: 'admin', frequency: 'weekly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      await generateRecurringTasks()

      const valuesArg = mockValues.mock.calls[0][0]
      const deadline = new Date(valuesArg.deadline)
      const now = new Date()
      const diffDays = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBe(7)
    })

    it('sets deadline 14 days out for fortnightly tasks', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Fortnightly', category: 'admin', frequency: 'fortnightly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      await generateRecurringTasks()

      const valuesArg = mockValues.mock.calls[0][0]
      const deadline = new Date(valuesArg.deadline)
      const now = new Date()
      const diffDays = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBe(14)
    })

    it('sets deadline to next month for monthly tasks without dayOfMonth', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Monthly', category: 'admin', frequency: 'monthly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      await generateRecurringTasks()

      const valuesArg = mockValues.mock.calls[0][0]
      const deadline = new Date(valuesArg.deadline)
      const now = new Date()
      // Should be roughly one month from now
      expect(deadline.getMonth()).not.toBe(now.getMonth())
    })

    it('sets deadline to specific dayOfMonth for monthly tasks with dayOfMonth', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Monthly', category: 'admin', frequency: 'monthly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: 15 },
      ])

      await generateRecurringTasks()

      const valuesArg = mockValues.mock.calls[0][0]
      const deadline = new Date(valuesArg.deadline)
      expect(deadline.getDate()).toBe(15)
    })

    it('updates lastGeneratedAt after generating a task', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Weekly', category: 'admin', frequency: 'weekly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: null },
      ])

      await generateRecurringTasks()

      // The second call to mockUpdate (first is insert, second is update lastGeneratedAt)
      expect(mockUpdate).toHaveBeenCalledWith(recurringTasks)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ lastGeneratedAt: expect.any(String) })
      )
    })

    it('revalidates /tasks and /focus by default', async () => {
      mockActiveRecurringTasks([])

      await generateRecurringTasks()

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })

    it('skips revalidation when skipRevalidate is true', async () => {
      mockActiveRecurringTasks([])

      await generateRecurringTasks({ skipRevalidate: true })

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('generates multiple tasks and returns correct count', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 30)

      mockActiveRecurringTasks([
        { id: 1, title: 'Task A', category: 'admin', frequency: 'weekly', lastGeneratedAt: null, client: null, estimatedHours: null, description: null, dayOfMonth: null },
        { id: 2, title: 'Task B', category: 'admin', frequency: 'monthly', lastGeneratedAt: null, client: null, estimatedHours: 2, description: 'Monthly desc', dayOfMonth: null },
      ])

      const result = await generateRecurringTasks()
      expect(result.created).toBe(2)
    })

    it('passes client and estimatedHours to the generated task', async () => {
      mockActiveRecurringTasks([
        { id: 1, title: 'Client Task', category: 'client_delivery', frequency: 'weekly', lastGeneratedAt: null, client: 'Acme', estimatedHours: 3, description: 'Do stuff', dayOfMonth: null },
      ])

      await generateRecurringTasks()

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          client: 'Acme',
          estimatedHours: 3,
          description: 'Do stuff',
        })
      )
    })
  })
})
