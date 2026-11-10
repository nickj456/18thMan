import { afterEach, describe, expect, it } from 'vitest'
import {
  ANDROID_PACKAGE_NAME,
  ANDROID_START_PATH,
  APP_SHELL_ATTRIBUTE,
  APP_SHELL_BOOTSTRAP_SCRIPT,
  APP_SHELL_STORAGE_KEY,
  isInAndroidApp,
  isTwaLaunch,
} from './app-shell'

const APP_REFERRER = `android-app://${ANDROID_PACKAGE_NAME}/`

// [search, referrer, expected] — shared by the TS helper and the inline script.
const LAUNCH_CASES: Array<[string, string, boolean]> = [
  ['?source=twa', '', true],
  ['?foo=1&source=twa', 'https://www.google.com/', true],
  ['', APP_REFERRER, true],
  ['', `android-app://${ANDROID_PACKAGE_NAME}`, true],
  ['', '', false],
  ['?source=email', '', false],
  ['?source=TWA', '', false],
  ['', 'https://18thman.app/dashboard', false],
  ['', 'android-app://com.google.android.gm/', false],
  // A different package that merely shares our id as a prefix is not us.
  ['', `android-app://${ANDROID_PACKAGE_NAME}.evil/`, false],
]

describe('isTwaLaunch', () => {
  it.each(LAUNCH_CASES)('search=%j referrer=%j → %s', (search, referrer, expected) => {
    expect(isTwaLaunch(search, referrer)).toBe(expected)
  })
})

describe('isInAndroidApp', () => {
  afterEach(() => document.documentElement.removeAttribute(APP_SHELL_ATTRIBUTE))

  it('is false in an ordinary browser tab', () => {
    expect(isInAndroidApp()).toBe(false)
  })

  it('is true once the bootstrap script has marked the page', () => {
    document.documentElement.setAttribute(APP_SHELL_ATTRIBUTE, 'twa')
    expect(isInAndroidApp()).toBe(true)
  })

  it('ignores an unexpected attribute value', () => {
    document.documentElement.setAttribute(APP_SHELL_ATTRIBUTE, 'ios')
    expect(isInAndroidApp()).toBe(false)
  })
})

describe('ANDROID_START_PATH', () => {
  it('is a launch URL the detector recognises', () => {
    const url = new URL(ANDROID_START_PATH, 'https://18thman.app')
    expect(url.pathname).toBe('/dashboard')
    expect(isTwaLaunch(url.search, '')).toBe(true)
  })
})

describe('APP_SHELL_BOOTSTRAP_SCRIPT', () => {
  function run(search: string, referrer: string) {
    window.history.replaceState(null, '', `/${search}`)
    Object.defineProperty(document, 'referrer', { value: referrer, configurable: true })
    new Function(APP_SHELL_BOOTSTRAP_SCRIPT)()
    return document.documentElement.getAttribute(APP_SHELL_ATTRIBUTE)
  }

  afterEach(() => {
    document.documentElement.removeAttribute(APP_SHELL_ATTRIBUTE)
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/')
    Object.defineProperty(document, 'referrer', { value: '', configurable: true })
  })

  it.each(LAUNCH_CASES)('search=%j referrer=%j → marked=%s', (search, referrer, expected) => {
    expect(run(search, referrer)).toBe(expected ? 'twa' : null)
  })

  it('remembers the app session for later navigations in the same tab', () => {
    expect(run('?source=twa', '')).toBe('twa')
    document.documentElement.removeAttribute(APP_SHELL_ATTRIBUTE)
    // Next page: no param, referrer is our own site.
    expect(run('', 'https://18thman.app/dashboard')).toBe('twa')
  })

  it('does not mark an ordinary browser tab', () => {
    expect(run('', 'https://18thman.app/')).toBeNull()
    expect(window.sessionStorage.getItem(APP_SHELL_STORAGE_KEY)).toBeNull()
  })

  it('still marks the launch page when sessionStorage is blocked', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() { throw new DOMException('blocked', 'SecurityError') },
    })
    try {
      expect(run('?source=twa', '')).toBe('twa')
    } finally {
      Object.defineProperty(window, 'sessionStorage', original)
    }
  })
})
