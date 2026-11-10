import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Runs public/sw.js against a fake ServiceWorkerGlobalScope. The worker's whole
 * contract: only navigations are intercepted, the network always wins, and the
 * cached /offline page is the fallback when the network fails.
 */
const SOURCE = readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8')

type Listener = (event: Record<string, unknown>) => void

function loadWorker({ fetchImpl }: { fetchImpl: () => Promise<Response> }) {
  const listeners: Record<string, Listener> = {}
  const offlinePage = new Response('offline page')
  const cache = { add: vi.fn().mockResolvedValue(undefined) }
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(['18m-offline-v0', '18m-offline-v1']),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue(offlinePage),
  }
  const self = {
    addEventListener: (type: string, fn: Listener) => { listeners[type] = fn },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    registration: { navigationPreload: { enable: vi.fn() } },
  }
  const fetch = vi.fn(fetchImpl)
  // In a real worker, relative URLs resolve against the worker's origin; Node needs it spelled out.
  const WorkerRequest = class extends Request {
    constructor(input: string, init?: RequestInit) { super(new URL(input, 'https://18thman.app'), init) }
  }
  new Function('self', 'caches', 'fetch', 'Request', 'Response', SOURCE)(self, caches, fetch, WorkerRequest, Response)

  return { listeners, caches, cache, self, fetch, offlinePage }
}

function fetchEvent(mode: string, preload?: Response) {
  let responded: Promise<Response> | undefined
  const event = {
    // A plain object: a constructed Request can never have mode 'navigate'.
    request: { mode, url: 'https://18thman.app/dashboard' },
    preloadResponse: Promise.resolve(preload),
    respondWith: (p: Promise<Response>) => { responded = p },
  }
  return { event, responded: () => responded }
}

describe('public/sw.js', () => {
  let online: Response
  beforeEach(() => { online = new Response('live page') })

  it('caches the offline page on install', async () => {
    const w = loadWorker({ fetchImpl: async () => online })
    let done: Promise<unknown> = Promise.resolve()
    w.listeners.install({ waitUntil: (p: Promise<unknown>) => { done = p } })
    await done
    expect(w.cache.add).toHaveBeenCalledTimes(1)
    expect((w.cache.add.mock.calls[0][0] as Request).url).toMatch(/\/offline$/)
    expect(w.self.skipWaiting).toHaveBeenCalled()
  })

  it('drops old caches and enables navigation preload on activate', async () => {
    const w = loadWorker({ fetchImpl: async () => online })
    let done: Promise<unknown> = Promise.resolve()
    w.listeners.activate({ waitUntil: (p: Promise<unknown>) => { done = p } })
    await done
    expect(w.caches.delete).toHaveBeenCalledWith('18m-offline-v0')
    expect(w.caches.delete).not.toHaveBeenCalledWith('18m-offline-v1')
    expect(w.self.registration.navigationPreload.enable).toHaveBeenCalled()
    expect(w.self.clients.claim).toHaveBeenCalled()
  })

  it.each(['cors', 'no-cors', 'same-origin'])('ignores non-navigation (%s) requests', (mode) => {
    const w = loadWorker({ fetchImpl: async () => online })
    const { event, responded } = fetchEvent(mode)
    w.listeners.fetch(event)
    expect(responded()).toBeUndefined()
    expect(w.fetch).not.toHaveBeenCalled()
  })

  it('serves the live page when online', async () => {
    const w = loadWorker({ fetchImpl: async () => online })
    const { event, responded } = fetchEvent('navigate')
    w.listeners.fetch(event)
    expect(await responded()).toBe(online)
  })

  it('uses the navigation preload response when there is one', async () => {
    const preloaded = new Response('preloaded')
    const w = loadWorker({ fetchImpl: async () => online })
    const { event, responded } = fetchEvent('navigate', preloaded)
    w.listeners.fetch(event)
    expect(await responded()).toBe(preloaded)
    expect(w.fetch).not.toHaveBeenCalled()
  })

  it('falls back to the cached offline page when the network fails', async () => {
    const w = loadWorker({ fetchImpl: async () => { throw new TypeError('Failed to fetch') } })
    const { event, responded } = fetchEvent('navigate')
    w.listeners.fetch(event)
    expect(await responded()).toBe(w.offlinePage)
    expect(w.caches.match).toHaveBeenCalledWith('/offline')
  })
})
