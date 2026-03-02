import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db update chain
const mockUpdateWhere = vi.fn()
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }))
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }))

vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: { id: 'tasks.id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

const mockGetAllTasks = vi.fn()
const mockGetActivePhase = vi.fn()
const mockGetCurrentTargets = vi.fn()

vi.mock('@/server/queries/tasks', () => ({
  getAllTasks: () => mockGetAllTasks(),
}))

vi.mock('@/server/queries/growth-phases', () => ({
  getActivePhase: () => mockGetActivePhase(),
}))

vi.mock('@/server/actions/category-targets', () => ({
  getCurrentTargets: () => mockGetCurrentTargets(),
}))

// Stub global fetch
vi.stubGlobal('fetch', vi.fn())

import { POST } from '@/app/api/ai/score/route'
import { tasks } from '@/db/schema'

// Helper to set env var
function setApiKey(key: string | undefined) {
  if (key === undefined) {
    delete process.env.ANTHROPIC_API_KEY
  } else {
    process.env.ANTHROPIC_API_KEY = key
  }
}

// Sample tasks for tests
const sampleTasks = [
  {
    id: 1,
    title: 'Build dashboard',
    description: 'Main dashboard',
    category: 'client_delivery',
    status: 'in_progress',
    toComplete: 'Finish layout',
    client: 'Acme',
    deadline: '2026-03-10',
    estimatedHours: 10,
    actualHours: 3,
    priorityScore: null,
    leverageScore: null,
    sequenceReason: null,
  },
  {
    id: 2,
    title: 'Automate reports',
    description: 'Weekly reports',
    category: 'systems_automation',
    status: 'in_progress',
    toComplete: 'Script template',
    client: null,
    deadline: null,
    estimatedHours: 5,
    actualHours: 0,
    priorityScore: null,
    leverageScore: null,
    sequenceReason: null,
  },
]

const samplePhase = {
  id: 1,
  name: 'Scale',
  description: 'Scale the business',
  focusAreas: 'Automation, Hiring',
  isActive: true,
}

const sampleTargets = [
  { category: 'client_delivery', targetPercentage: 40 },
  { category: 'systems_automation', targetPercentage: 30 },
  { category: 'client_growth', targetPercentage: 15 },
  { category: 'team_management', targetPercentage: 10 },
  { category: 'admin', targetPercentage: 5 },
]

describe('AI Score API Route - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAllTasks.mockResolvedValue(sampleTasks)
    mockGetActivePhase.mockResolvedValue(samplePhase)
    mockGetCurrentTargets.mockResolvedValue(sampleTargets)
    setApiKey('sk-ant-valid-key-12345')
  })

  describe('API key validation', () => {
    it('returns 500 when ANTHROPIC_API_KEY is not set', async () => {
      setApiKey(undefined)

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('ANTHROPIC_API_KEY not configured')
    })

    it('returns 500 when ANTHROPIC_API_KEY is empty string', async () => {
      setApiKey('')

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('ANTHROPIC_API_KEY not configured')
    })

    it('returns 500 when ANTHROPIC_API_KEY is "your-key-here"', async () => {
      setApiKey('your-key-here')

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('ANTHROPIC_API_KEY not configured')
    })
  })

  describe('task validation', () => {
    it('returns 400 when no active tasks exist', async () => {
      mockGetAllTasks.mockResolvedValue([
        { id: 1, title: 'Done task', status: 'done' },
      ])

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No active tasks to score')
    })

    it('returns 400 when task list is empty', async () => {
      mockGetAllTasks.mockResolvedValue([])

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No active tasks to score')
    })
  })

  describe('successful scoring flow', () => {
    it('calls the Claude API with correct headers and body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{
            text: JSON.stringify({
              scores: [
                { taskId: 1, priorityScore: 8, leverageScore: 9, sequenceReason: 'High impact' },
                { taskId: 2, priorityScore: 6, leverageScore: 7, sequenceReason: 'Enables automation' },
              ],
            }),
          }],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await POST()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'sk-ant-valid-key-12345',
            'anthropic-version': '2023-06-01',
          }),
        })
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.model).toBe('claude-haiku-4-5-20251001')
      expect(body.max_tokens).toBe(4096)
      expect(body.messages[0].role).toBe('user')
    })

    it('updates each task with scores from the API response', async () => {
      const scores = [
        { taskId: 1, priorityScore: 8, leverageScore: 9, sequenceReason: 'High impact' },
        { taskId: 2, priorityScore: 6, leverageScore: 7, sequenceReason: 'Enables automation' },
      ]

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify({ scores }) }],
        }),
      }))

      const response = await POST()
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.updated).toBe(2)
      expect(mockUpdate).toHaveBeenCalledTimes(2)
      expect(mockUpdate).toHaveBeenCalledWith(tasks)
    })

    it('returns success with updated count', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{
            text: JSON.stringify({
              scores: [
                { taskId: 1, priorityScore: 8, leverageScore: 9, sequenceReason: 'Reason' },
              ],
            }),
          }],
        }),
      }))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, updated: 1 })
    })
  })

  describe('JSON extraction from markdown code blocks', () => {
    it('extracts JSON from text wrapped in markdown code blocks', async () => {
      const jsonWithCodeBlock = '```json\n{"scores": [{"taskId": 1, "priorityScore": 8, "leverageScore": 9, "sequenceReason": "Test"}]}\n```'

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: jsonWithCodeBlock }],
        }),
      }))

      const response = await POST()
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.updated).toBe(1)
    })

    it('extracts JSON with surrounding text', async () => {
      const textWithJson = 'Here are the scores:\n{"scores": [{"taskId": 1, "priorityScore": 5, "leverageScore": 6, "sequenceReason": "Medium"}]}\nDone!'

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: textWithJson }],
        }),
      }))

      const response = await POST()
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.updated).toBe(1)
    })
  })

  describe('error handling', () => {
    it('returns 500 when the Claude API returns a non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      }))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Claude API error: 429')
      expect(data.error).toContain('Rate limited')
    })

    it('returns 500 when the API response has no content text', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [] }),
      }))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('No response from Claude')
    })

    it('returns 500 when the response text contains no JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'I cannot process this request.' }],
        }),
      }))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      // This will either hit "Could not parse" or throw a JSON.parse error
      expect(data.error).toBeDefined()
    })

    it('returns 500 when parsed JSON has no scores array', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '{"result": "something else"}' }],
        }),
      }))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid scores format')
    })

    it('handles null content gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: null }),
      }))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('No response from Claude')
    })
  })
})
