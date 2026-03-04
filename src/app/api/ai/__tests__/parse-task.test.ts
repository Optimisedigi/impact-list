import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetAllClients = vi.fn()

vi.mock('@/server/actions/clients', () => ({
  getAllClients: () => mockGetAllClients(),
}))

// Stub global fetch
vi.stubGlobal('fetch', vi.fn())

import { POST } from '@/app/api/ai/parse-task/route'

// Helper to set env var
function setApiKey(key: string | undefined) {
  if (key === undefined) {
    delete process.env.ANTHROPIC_API_KEY
  } else {
    process.env.ANTHROPIC_API_KEY = key
  }
}

// Helper to create a Request with JSON body
function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/ai/parse-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('AI Parse-Task API Route - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAllClients.mockResolvedValue([
      { id: 1, name: 'Acme Corp' },
      { id: 2, name: 'Globex' },
    ])
    setApiKey('sk-ant-valid-key-12345')
  })

  describe('API key validation', () => {
    it('returns 500 when ANTHROPIC_API_KEY is not set', async () => {
      setApiKey(undefined)

      const response = await POST(makeRequest({ text: 'some task' }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('ANTHROPIC_API_KEY not configured')
    })

    it('returns 500 when ANTHROPIC_API_KEY is "your-key-here"', async () => {
      setApiKey('your-key-here')

      const response = await POST(makeRequest({ text: 'some task' }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('ANTHROPIC_API_KEY not configured')
    })
  })

  describe('input validation', () => {
    it('returns 400 when text is missing', async () => {
      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No text provided')
    })

    it('returns 400 when text is empty string', async () => {
      const response = await POST(makeRequest({ text: '' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No text provided')
    })

    it('returns 400 when text is not a string', async () => {
      const response = await POST(makeRequest({ text: 123 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No text provided')
    })
  })

  describe('successful parsing', () => {
    it('calls the Claude API with correct headers and model', async () => {
      const parsedTask = {
        title: 'Prepare quarterly report',
        category: 'client_delivery',
        client: 'Acme Corp',
        deadline: '2026-03-10',
        estimatedHours: 4,
        status: 'not_started',
        toComplete: 'this_week',
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(parsedTask) }],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const response = await POST(makeRequest({ text: 'Prepare quarterly report for Acme by Friday' }))
      const data = await response.json()

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
      expect(body.max_tokens).toBe(256)
    })

    it('returns parsed task fields from Claude response', async () => {
      const parsedTask = {
        title: 'Send invoice',
        category: 'admin',
        client: null,
        deadline: null,
        estimatedHours: 1,
        status: 'not_started',
        toComplete: 'today',
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(parsedTask) }],
        }),
      }))

      const response = await POST(makeRequest({ text: 'Send invoice today, should take about an hour' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(parsedTask)
    })

    it('includes known client names in the prompt', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '{"title":"Task","category":"admin","client":null,"deadline":null,"estimatedHours":null,"status":"not_started","toComplete":null}' }],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await POST(makeRequest({ text: 'Do something' }))

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      const promptContent = body.messages[0].content
      expect(promptContent).toContain('Acme Corp')
      expect(promptContent).toContain('Globex')
    })
  })

  describe('error handling', () => {
    it('returns 500 when the Claude API returns a non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      }))

      const response = await POST(makeRequest({ text: 'Create a task' }))
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

      const response = await POST(makeRequest({ text: 'Create a task' }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('No response from Claude')
    })

    it('returns 500 when the response text contains no valid JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'I cannot process this request, sorry.' }],
        }),
      }))

      const response = await POST(makeRequest({ text: 'Create a task' }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Could not parse response')
    })

    it('handles null content gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: null }),
      }))

      const response = await POST(makeRequest({ text: 'Create a task' }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('No response from Claude')
    })
  })
})
