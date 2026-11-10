import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServiceWorkerRegister } from './ServiceWorkerRegister'

function stubServiceWorker(register: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true })
}

describe('ServiceWorkerRegister', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    // @ts-expect-error -- removing the test stub
    delete navigator.serviceWorker
  })

  it('registers /sw.js at the root scope in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const register = vi.fn().mockResolvedValue({})
    stubServiceWorker(register)
    render(<ServiceWorkerRegister />)
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('does nothing in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const register = vi.fn().mockResolvedValue({})
    stubServiceWorker(register)
    render(<ServiceWorkerRegister />)
    expect(register).not.toHaveBeenCalled()
  })

  it('does nothing when the browser has no service worker support', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow()
  })

  it('swallows a failed registration with a warning', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubServiceWorker(vi.fn().mockRejectedValue(new Error('nope')))
    render(<ServiceWorkerRegister />)
    await vi.waitFor(() => expect(warn).toHaveBeenCalled())
  })
})
