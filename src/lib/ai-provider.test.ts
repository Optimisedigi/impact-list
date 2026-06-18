import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetKimiCredential = vi.fn()
const mockUpsertKimiCredential = vi.fn()

vi.mock('@/server/actions/ai-credentials', () => ({
  getKimiCredential: () => mockGetKimiCredential(),
  upsertKimiCredential: (credential: unknown) => mockUpsertKimiCredential(credential),
}))

vi.stubGlobal('fetch', vi.fn())

import { chatCompletion, isAIConfigured } from './ai-provider'

describe('ai-provider Kimi OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.AI_PROVIDER
    delete process.env.MINIMAX_API_KEY
    delete process.env.ANTHROPIC_API_KEY
  })

  it('reports unconfigured without a Kimi credential', async () => {
    mockGetKimiCredential.mockResolvedValue(null)
    await expect(isAIConfigured()).resolves.toBe(false)
  })

  it('sends Kimi chat completion requests with OAuth headers', async () => {
    mockGetKimiCredential.mockResolvedValue({
      kind: 'oauth',
      provider: 'kimi-coding',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 60_000,
      clientId: 'client-id',
      scope: 'kimi-code',
      obtainedAt: Date.now(),
      deviceId: 'device-id',
      kimiModelId: 'kimi-for-coding',
    })
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ access_token: 'new-token', refresh_token: 'new-refresh', token_type: 'Bearer', expires_in: 600 })),
        json: () => Promise.resolve({ access_token: 'new-token', refresh_token: 'new-refresh', token_type: 'Bearer', expires_in: 600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [{ id: 'kimi-for-coding', display_name: 'Kimi For Coding', context_length: 128000 }] })),
        json: () => Promise.resolve({ data: [{ id: 'kimi-for-coding', display_name: 'Kimi For Coding', context_length: 128000 }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
        json: () => Promise.resolve({ choices: [{ message: { content: 'hello' } }] }),
      })
    vi.stubGlobal('fetch', mockFetch)

    await expect(chatCompletion('Prompt', 128)).resolves.toBe('hello')

    const chatCall = mockFetch.mock.calls.find((c) => c[0] === 'https://api.kimi.com/coding/v1/chat/completions')
    expect(chatCall).toBeDefined()
    expect(chatCall![1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer new-token',
        'X-Msh-Device-Id': 'device-id',
      }),
    })
    const body = JSON.parse(chatCall![1].body)
    expect(body).toMatchObject({
      model: 'kimi-for-coding',
      max_tokens: 128,
      messages: [{ role: 'user', content: 'Prompt' }],
      thinking: { type: 'disabled' },
      prompt_cache_key: 'impact-list',
    })
  })
})
