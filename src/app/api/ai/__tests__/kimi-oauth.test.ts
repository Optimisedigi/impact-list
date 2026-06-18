import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockBeginKimiDeviceLogin = vi.fn()
const mockPollKimiDeviceToken = vi.fn()
const mockUpsertKimiCredential = vi.fn()

vi.mock('@/lib/kimi-oauth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kimi-oauth')>('@/lib/kimi-oauth')
  return {
    ...actual,
    beginKimiDeviceLogin: () => mockBeginKimiDeviceLogin(),
    pollKimiDeviceToken: (deviceCode: string, deviceId: string) => mockPollKimiDeviceToken(deviceCode, deviceId),
  }
})

vi.mock('@/server/actions/ai-credentials', () => ({
  upsertKimiCredential: (credential: unknown) => mockUpsertKimiCredential(credential),
}))

import { POST as beginPOST } from '@/app/api/ai/kimi/begin/route'
import { POST as pollPOST } from '@/app/api/ai/kimi/poll/route'

describe('Kimi OAuth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('begin sets device cookies and returns verification info', async () => {
    mockBeginKimiDeviceLogin.mockResolvedValue({
      deviceCode: 'device-code',
      deviceId: 'device-id',
      userCode: 'ABCD-EFGH',
      verificationUri: 'https://auth.kimi.com/activate',
      expiresIn: 600,
      interval: 5,
    })

    const response = await beginPOST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      userCode: 'ABCD-EFGH',
      verificationUri: 'https://auth.kimi.com/activate',
      expiresIn: 600,
      interval: 5,
    })
    expect(response.headers.get('set-cookie')).toContain('kimi-device-code=device-code')
    expect(response.headers.get('set-cookie')).toContain('kimi-device-id=device-id')
  })

  it('poll stores credentials and clears cookies when connected', async () => {
    const credential = {
      kind: 'oauth',
      provider: 'kimi-coding',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 60_000,
      clientId: 'client-id',
      scope: 'kimi-code',
      obtainedAt: Date.now(),
      deviceId: 'device-id',
    }
    mockPollKimiDeviceToken.mockResolvedValue({ status: 'connected', credential })

    const request = {
      cookies: {
        get: (name: string) => {
          if (name === 'kimi-device-code') return { value: 'device-code' }
          if (name === 'kimi-device-id') return { value: 'device-id' }
          return undefined
        },
      },
    } as unknown as import('next/server').NextRequest
    const response = await pollPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ status: 'connected' })
    expect(mockPollKimiDeviceToken).toHaveBeenCalledWith('device-code', 'device-id')
    expect(mockUpsertKimiCredential).toHaveBeenCalledWith(credential)
    expect(response.headers.get('set-cookie')).toContain('kimi-device-code=')
    expect(response.headers.get('set-cookie')).toContain('kimi-device-id=')
  })
})
