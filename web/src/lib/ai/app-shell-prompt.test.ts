import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ANDROID_APP_PROMPT_RULE, isAndroidAppRequest, promptForShell, stripPlanBlocks } from './app-shell-prompt'

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8')

// The prompts an AI assistant sees. Anything that sells must sit inside a plans
// block, or the Android app's assistant would quote it (lib/app-shell.ts).
const PROMPT_SOURCES = {
  'coaching chat (app/api/chat/route.ts)': read('app/api/chat/route.ts'),
  'help guide (lib/help/platform-guide.md)': read('lib/help/platform-guide.md'),
}

describe('isAndroidAppRequest', () => {
  it.each([
    [{ appShell: 'twa' }, true],
    [{ appShell: 'TWA' }, false],
    [{ appShell: true }, false],
    [{}, false],
    [null, false],
    ['twa', false],
    [undefined, false],
  ])('%j → %s', (body, expected) => {
    expect(isAndroidAppRequest(body)).toBe(expected)
  })
})

describe('stripPlanBlocks', () => {
  it('removes every plans block and keeps the rest', () => {
    const md = 'a\n<!-- plans:start -->\n£1\n<!-- plans:end -->\nb\n<!-- plans:start -->\n£2\n<!-- plans:end -->\nc'
    expect(stripPlanBlocks(md)).toBe('a\nb\nc')
  })

  it('leaves text without blocks alone', () => {
    expect(stripPlanBlocks('no plans here')).toBe('no plans here')
  })
})

describe('promptForShell', () => {
  const prompt = 'Coach stuff.\n<!-- plans:start -->\nClub £24.99, see /pricing\n<!-- plans:end -->\nMore coach stuff.'

  it('returns the prompt unchanged on the website', () => {
    expect(promptForShell(prompt, false)).toBe(prompt)
  })

  it('drops prices and adds the no-selling rule in the Android app', () => {
    const app = promptForShell(prompt, true)
    expect(app).not.toContain('£')
    expect(app).not.toContain('/pricing')
    expect(app).toContain('More coach stuff.')
    expect(app).toContain(ANDROID_APP_PROMPT_RULE)
  })
})

describe.each(Object.entries(PROMPT_SOURCES))('%s', (_name, source) => {
  it('has prices and upgrade directions in plans blocks', () => {
    expect(source).toMatch(/<!-- plans:start -->[\s\S]*£[\s\S]*<!-- plans:end -->/)
  })

  it('has no price or /pricing link outside a plans block', () => {
    const outside = stripPlanBlocks(source)
    expect(outside).not.toMatch(/£\s?\d/)
    expect(outside).not.toContain('/pricing')
  })
})
