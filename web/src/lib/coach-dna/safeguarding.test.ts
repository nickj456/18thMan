import { describe, it, expect, vi } from 'vitest'

const generateTextMock = vi.fn()

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => (model: string) => ({ modelId: model }),
}))

import { checkSafeguardingConcern } from './safeguarding'
import { GROQ_SAFEGUARD, DECOMMISSIONED_GROQ_MODELS } from '@/lib/ai/groq-models'

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

  it('screens with the safety-tuned model, never a decommissioned one', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'CLEAR' })
    await checkSafeguardingConcern('fine')

    const call = generateTextMock.mock.calls.at(-1)?.[0]
    expect(call.model.modelId).toBe(GROQ_SAFEGUARD)
    expect(DECOMMISSIONED_GROQ_MODELS as readonly string[]).not.toContain(call.model.modelId)
  })

  it('pins reasoningFormat so the verdict never arrives with analysis inlined', async () => {
    // The screen fails closed on anything but an exact 'CLEAR'. If Groq's
    // default for gpt-oss ever flips to 'raw', reasoning lands in `text` and
    // every comment gets flagged. Pinning it is the only thing preventing that.
    generateTextMock.mockResolvedValueOnce({ text: 'CLEAR' })
    await checkSafeguardingConcern('fine')

    const call = generateTextMock.mock.calls.at(-1)?.[0]
    expect(call.providerOptions?.groq?.reasoningFormat).toBe('parsed')
  })

  it('fails closed when the provider returns no text at all', async () => {
    generateTextMock.mockResolvedValueOnce({ text: undefined })
    expect(await checkSafeguardingConcern('anything')).toBe(true)

    generateTextMock.mockResolvedValueOnce({})
    expect(await checkSafeguardingConcern('anything')).toBe(true)
  })
})
