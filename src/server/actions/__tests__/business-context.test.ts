import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock drizzle query builder chain
const mockSelectLimit = vi.fn(() => [])
const mockSelectFrom = vi.fn(() => ({ limit: mockSelectLimit }))
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }))
const mockValues = vi.fn(() => ({ returning: vi.fn(() => []) }))
const mockInsert = vi.fn(() => ({ values: mockValues }))
const mockUpdateWhere = vi.fn()
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }))
const mockUpdate = vi.fn(() => ({ set: mockSet }))

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  businessContext: {
    id: 'businessContext.id',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

import { getBusinessContext, saveBusinessContext } from '../business-context'
import { businessContext } from '@/db/schema'

describe('business-context actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getBusinessContext ────────────────────────────────────

  describe('getBusinessContext', () => {
    it('returns null when no rows exist', async () => {
      mockSelectLimit.mockReturnValueOnce([])

      const result = await getBusinessContext()

      expect(mockSelect).toHaveBeenCalled()
      expect(mockSelectFrom).toHaveBeenCalledWith(businessContext)
      expect(mockSelectLimit).toHaveBeenCalledWith(1)
      expect(result).toBeNull()
    })

    it('returns business context data when a row exists', async () => {
      mockSelectLimit.mockReturnValueOnce([
        {
          id: 1,
          businessName: 'My Biz',
          businessDescription: 'My business',
          toolsUsed: 'Slack, Notion',
          teamSize: '5',
          revenueModel: 'SaaS',
          startDate: '2026-01-06',
        },
      ])

      const result = await getBusinessContext()

      expect(result).toEqual({
        businessName: 'My Biz',
        businessDescription: 'My business',
        toolsUsed: 'Slack, Notion',
        teamSize: '5',
        revenueModel: 'SaaS',
        startDate: '2026-01-06',
      })
    })

    it('returns empty strings for null fields', async () => {
      mockSelectLimit.mockReturnValueOnce([
        {
          id: 1,
          businessName: null,
          businessDescription: null,
          toolsUsed: null,
          teamSize: null,
          revenueModel: null,
          startDate: null,
        },
      ])

      const result = await getBusinessContext()

      expect(result).toEqual({
        businessName: '',
        businessDescription: '',
        toolsUsed: '',
        teamSize: '',
        revenueModel: '',
        startDate: '',
      })
    })
  })

  // ── saveBusinessContext ───────────────────────────────────

  describe('saveBusinessContext', () => {
    const data = {
      businessName: 'Acme Digital',
      businessDescription: 'Digital agency',
      toolsUsed: 'Figma, Linear',
      teamSize: '10',
      revenueModel: 'Retainer',
      startDate: '2026-01-06',
    }

    it('updates existing row when one exists', async () => {
      mockSelectLimit.mockReturnValueOnce([{ id: 5 }])

      await saveBusinessContext(data)

      expect(mockUpdate).toHaveBeenCalledWith(businessContext)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          businessDescription: 'Digital agency',
          toolsUsed: 'Figma, Linear',
          teamSize: '10',
          revenueModel: 'Retainer',
          updatedAt: expect.any(String),
        })
      )
      expect(mockUpdateWhere).toHaveBeenCalledWith({ col: 'businessContext.id', val: 5 })
    })

    it('inserts a new row when none exists', async () => {
      mockSelectLimit.mockReturnValueOnce([])

      await saveBusinessContext(data)

      expect(mockInsert).toHaveBeenCalledWith(businessContext)
      expect(mockValues).toHaveBeenCalledWith({
        businessName: 'Acme Digital',
        businessDescription: 'Digital agency',
        toolsUsed: 'Figma, Linear',
        teamSize: '10',
        revenueModel: 'Retainer',
        startDate: '2026-01-06',
      })
    })

    it('does not insert when updating existing', async () => {
      mockSelectLimit.mockReturnValueOnce([{ id: 1 }])

      await saveBusinessContext(data)

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('does not update when inserting new', async () => {
      mockSelectLimit.mockReturnValueOnce([])

      await saveBusinessContext(data)

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })
})
