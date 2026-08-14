import { describe, it, expect, vi } from 'vitest'

const generateTextMock = vi.fn()

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => (model: string) => ({ modelId: model }),
}))

import { checkSafeguardingConcern } from './safeguarding'

describe('checkSafeguardingConcern', () => {
  it('returns false when the model responds CLEAR', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'CLEAR' })
    expect(await checkSafeguardingConcern('Great coach, really helped me improve.')).toBe(false)
  })

  it('returns true when the model responds FLAG', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'FLAG' })
    expect(await checkSafeguardingConcern('concerning text')).toBe(true)
  })

  it('is case- and whitespace-insensitive on CLEAR', async () => {
    generateTextMock.mockResolvedValueOnce({ text: '  clear  \n' })
    expect(await checkSafeguardingConcern('fine')).toBe(false)
  })

  it('fails closed (flags) on an unparseable response', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'I cannot determine this.' })
    expect(await checkSafeguardingConcern('ambiguous')).toBe(true)
  })

  it('fails closed (flags) when the model call throws', async () => {
    generateTextMock.mockRejectedValueOnce(new Error('groq down'))
    expect(await checkSafeguardingConcern('anything')).toBe(true)
  })
})
