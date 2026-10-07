import { describe, it, expect } from 'vitest'
import robots from './robots'

describe('robots', () => {
  it('keeps crawlers out of API routes, which answer GET with 400/405', () => {
    const rules = robots().rules
    const rule = Array.isArray(rules) ? rules[0] : rules
    expect(rule.disallow).toContain('/api/')
  })
})
