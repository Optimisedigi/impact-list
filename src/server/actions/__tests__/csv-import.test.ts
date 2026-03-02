import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────

const { mockValues, mockInsert } = vi.hoisted(() => {
  const mockValues = vi.fn(() => ({ returning: vi.fn(() => []) }))
  const mockInsert = vi.fn(() => ({ values: mockValues }))
  return { mockValues, mockInsert }
})

vi.mock('@/db', () => ({
  db: { insert: mockInsert },
}))

vi.mock('@/db/schema', () => ({
  tasks: 'tasks-table',
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Import AFTER mocks are set up
import { importCsv } from '@/server/actions/csv-import'
import { revalidatePath } from 'next/cache'

describe('csv-import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Error cases ─────────────────────────────────────────

  describe('error handling', () => {
    it('returns error for empty CSV (no lines)', async () => {
      const result = await importCsv('')
      expect(result.success).toBe(false)
      expect(result.error).toContain('header row')
    })

    it('returns error for CSV with only a header row', async () => {
      const result = await importCsv('Title,Category,Status')
      expect(result.success).toBe(false)
      expect(result.error).toContain('header row')
    })

    it('returns error when no title/task column is present', async () => {
      const csv = 'Category,Status\nclient_delivery,done'
      const result = await importCsv(csv)
      expect(result.success).toBe(false)
      expect(result.error).toContain("'Title' or 'Task'")
    })
  })

  // ── Successful imports ──────────────────────────────────

  describe('successful import', () => {
    it('imports rows with standard headers', async () => {
      const csv = 'Title,Category,Status\nBuild dashboard,client_delivery,in_progress'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(0)
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Build dashboard',
          category: 'client_delivery',
          status: 'in_progress',
        })
      )
    })

    it('imports multiple rows and returns correct counts', async () => {
      const csv = [
        'Title,Category,Status',
        'Task one,admin,done',
        'Task two,admin,in_progress',
        'Task three,admin,done',
      ].join('\n')

      const result = await importCsv(csv)
      expect(result.success).toBe(true)
      expect(result.imported).toBe(3)
      expect(result.skipped).toBe(0)
    })

    it('calls revalidatePath for /tasks and /focus', async () => {
      const csv = 'Title\nSome task'
      await importCsv(csv)

      expect(revalidatePath).toHaveBeenCalledWith('/tasks')
      expect(revalidatePath).toHaveBeenCalledWith('/focus')
    })
  })

  // ── Column name mapping ─────────────────────────────────

  describe('flexible column name mapping', () => {
    it('maps "Task" column to title', async () => {
      const csv = 'Task,Category\nDo something,admin'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Do something' })
      )
    })

    it('maps "Task Name" column to title', async () => {
      const csv = 'Task Name,Category\nAnother task,admin'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Another task' })
      )
    })

    it('maps "Name" column to title', async () => {
      const csv = 'Name,Status\nNamedTask,done'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
    })

    it('maps "Due Date" column to deadline', async () => {
      const csv = 'Title,Due Date\nFix bug,2026-04-01'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ deadline: '2026-04-01' })
      )
    })
  })

  // ── Category mapping ────────────────────────────────────

  describe('category mapping', () => {
    it('maps "client delivery" to "client_delivery"', async () => {
      const csv = 'Title,Category\nTask,client delivery'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'client_delivery' })
      )
    })

    it('maps "Systems & Automation" to "systems_automation"', async () => {
      const csv = 'Title,Category\nTask,Systems & Automation'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'systems_automation' })
      )
    })

    it('maps "systems and automation" to "systems_automation"', async () => {
      const csv = 'Title,Category\nTask,systems and automation'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'systems_automation' })
      )
    })

    it('maps "Client Growth Work" to "client_growth"', async () => {
      const csv = 'Title,Category\nTask,Client Growth Work'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'client_growth' })
      )
    })

    it('maps "Team Management" to "team_management"', async () => {
      const csv = 'Title,Category\nTask,Team Management'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'team_management' })
      )
    })

    it('defaults to "client_delivery" for unknown category', async () => {
      const csv = 'Title,Category\nTask,unknown_thing'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'client_delivery' })
      )
    })

    it('defaults to "client_delivery" when category is empty', async () => {
      const csv = 'Title,Category\nTask,'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'client_delivery' })
      )
    })
  })

  // ── Status mapping ──────────────────────────────────────

  describe('status mapping', () => {
    it('maps "in progress" to "in_progress"', async () => {
      const csv = 'Title,Status\nTask,in progress'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_progress' })
      )
    })

    it('maps "completed" to "done"', async () => {
      const csv = 'Title,Status\nTask,completed'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'done' })
      )
    })

    it('maps "done" to "done"', async () => {
      const csv = 'Title,Status\nTask,done'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'done' })
      )
    })

    it('defaults to "in_progress" for unknown status', async () => {
      const csv = 'Title,Status\nTask,pending'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_progress' })
      )
    })

    it('defaults to "in_progress" when status is empty', async () => {
      const csv = 'Title,Status\nTask,'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_progress' })
      )
    })
  })

  // ── toComplete mapping ──────────────────────────────────

  describe('toComplete mapping', () => {
    it('maps "today" correctly', async () => {
      const csv = 'Title,To Complete\nTask,today'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ toComplete: 'today' })
      )
    })

    it('maps "next 2 days" to "next_2_days"', async () => {
      const csv = 'Title,To Complete\nTask,next 2 days'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ toComplete: 'next_2_days' })
      )
    })

    it('maps "this week" to "this_week"', async () => {
      const csv = 'Title,To Complete\nTask,this week'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ toComplete: 'this_week' })
      )
    })

    it('passes through unknown toComplete values', async () => {
      const csv = 'Title,To Complete\nTask,next month'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ toComplete: 'next month' })
      )
    })

    it('sets toComplete to null when column is missing', async () => {
      const csv = 'Title\nTask'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ toComplete: null })
      )
    })
  })

  // ── Row skipping ────────────────────────────────────────

  describe('row skipping', () => {
    it('skips rows without a title', async () => {
      const csv = 'Title,Category\n,admin\nReal task,admin'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
    })

    it('skips empty rows', async () => {
      const csv = 'Title,Category\nTask one,admin\n\nTask two,admin'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      // The empty line still produces [""] from parseCsvLine, but title is empty so it's skipped
      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(1)
    })

    it('returns correct imported and skipped counts', async () => {
      const csv = [
        'Title,Category',
        'Good task,admin',
        ',admin',
        'Another good task,admin',
        ',',
      ].join('\n')

      const result = await importCsv(csv)
      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(2)
    })
  })

  // ── CSV parsing (quoted fields) ─────────────────────────

  describe('CSV parsing with quoted fields', () => {
    it('handles quoted fields with commas inside', async () => {
      const csv = 'Title,Description,Category\n"Build, test, deploy",Some desc,admin'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Build, test, deploy',
          description: 'Some desc',
        })
      )
    })

    it('handles quoted fields with escaped quotes', async () => {
      const csv = 'Title,Description\n"Task ""alpha""",desc'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task "alpha"',
        })
      )
    })

    it('handles quoted headers', async () => {
      const csv = '"Title","Category"\nMyTask,admin'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
    })
  })

  // ── Numeric fields ──────────────────────────────────────

  describe('numeric field conversion', () => {
    it('converts estimatedHours and actualHours to numbers', async () => {
      const csv = 'Title,Estimated Hours,Actual Hours\nTask,4.5,2'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedHours: 4.5,
          actualHours: 2,
        })
      )
    })

    it('converts priorityScore and leverageScore to numbers', async () => {
      const csv = 'Title,Priority Score,Leverage Score\nTask,8,9'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          priorityScore: 8,
          leverageScore: 9,
        })
      )
    })

    it('sets numeric fields to null when empty', async () => {
      const csv = 'Title,Estimated Hours\nTask,'
      await importCsv(csv)

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedHours: null,
        })
      )
    })
  })

  // ── DB error handling ───────────────────────────────────

  describe('database error handling', () => {
    it('counts rows as skipped when db insert throws', async () => {
      mockValues.mockImplementationOnce(() => {
        throw new Error('DB constraint error')
      })

      const csv = 'Title\nBad task\nGood task'
      const result = await importCsv(csv)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0]).toContain('DB constraint error')
    })
  })
})
