import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { APP_SHELL_ATTRIBUTE } from '@/lib/app-shell'
import { UpgradePrompt, DEFAULT_APP_UPGRADE_DESCRIPTION } from '@/components/ui/UpgradePrompt'
import { AndroidAppNotice, ANDROID_APP_PURCHASE_NOTICE } from '@/components/AndroidAppNotice'
import { CheckoutButton } from '@/components/pricing/CheckoutButton'
import { ClubCheckoutButton } from '@/components/pricing/ClubCheckoutButton'
import { ManageSubscriptionButton } from '@/components/pricing/ManageSubscriptionButton'
import { BuyButton } from '@/components/shop/BuyButton'

/**
 * The Android app is consumption-only (lib/app-shell.ts): purchase UI must be
 * invisible when <html data-app-shell="twa">, and untouched on the website.
 * These tests load the real app-shell rules from globals.css into jsdom.
 */
const GLOBALS = readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8')
const MARKER = '/* ── Android app (Trusted Web Activity)'
const APP_SHELL_CSS = GLOBALS.slice(GLOBALS.indexOf(MARKER))

let style: HTMLStyleElement
beforeAll(() => {
  expect(GLOBALS.includes(MARKER)).toBe(true)
  style = document.createElement('style')
  style.textContent = APP_SHELL_CSS
  document.head.appendChild(style)
})
afterAll(() => style.remove())
afterEach(() => document.documentElement.removeAttribute(APP_SHELL_ATTRIBUTE))

function inApp() {
  document.documentElement.setAttribute(APP_SHELL_ATTRIBUTE, 'twa')
}
const hidden = (el: Element) => getComputedStyle(el).display === 'none'

describe('app-shell CSS', () => {
  it.each([
    '/pricing', '/pricing/', '/pricing?plan=coach', '/pricing#club', '#pricing',
    'https://18thman.app/pricing', 'https://18thman.app/pricing?plan=club', '#services',
  ])('hides links to %s only in the app', (href) => {
    render(<a href={href}>plans</a>)
    const link = screen.getByText('plans')
    expect(hidden(link)).toBe(false)
    inApp()
    expect(hidden(link)).toBe(true)
  })

  it('leaves look-alike links alone', () => {
    inApp()
    // Raw <a> on purpose: the rules under test match on the rendered href.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    render(<><a href="/pricing-faq">faq</a><a href="/shop/library">library</a></>)
    expect(hidden(screen.getByText('faq'))).toBe(false)
    expect(hidden(screen.getByText('library'))).toBe(false)
  })

  it.each(['pricing', 'services'])('hides the landing page #%s section in the app', (id) => {
    render(<section id={id}>tiers</section>)
    expect(hidden(screen.getByText('tiers'))).toBe(false)
    inApp()
    expect(hidden(screen.getByText('tiers'))).toBe(true)
  })

  it('leaves other site links alone', () => {
    inApp()
    render(<a href="https://18thman.app/pricing-guide">guide</a>)
    expect(hidden(screen.getByText('guide'))).toBe(false)
  })

  it('swaps .hide-in-app and .only-in-app', () => {
    render(<><p className="hide-in-app">web</p><p className="only-in-app">app</p></>)
    expect(hidden(screen.getByText('web'))).toBe(false)
    expect(hidden(screen.getByText('app'))).toBe(true)
    inApp()
    expect(hidden(screen.getByText('web'))).toBe(true)
    expect(hidden(screen.getByText('app'))).toBe(false)
  })
})

describe('purchase buttons hide themselves in the app', () => {
  it.each([
    ['CheckoutButton', <CheckoutButton key="a" plan="coach_monthly" label="Buy pro" variant="primary" />],
    ['ClubCheckoutButton', <ClubCheckoutButton key="b" plan="club_monthly" label="Buy pro" variant="amber" />],
    ['ManageSubscriptionButton', <ManageSubscriptionButton key="c" />],
    ['BuyButton', <BuyButton key="d" productId="p1" priceLabel="£5" />],
  ])('%s', (_name, element) => {
    render(element)
    const button = screen.getByRole('button')
    expect(button).toBeVisible()
    inApp()
    expect(button).not.toBeVisible()
  })
})

describe('UpgradePrompt', () => {
  it('shows the sales wording and plans link on the website', () => {
    render(<UpgradePrompt feature="Coaching groups" description="Upgrade to collaborate." />)
    expect(screen.getByText('Coaching groups is a club feature')).toBeVisible()
    expect(screen.getByText('Upgrade to collaborate.')).toBeVisible()
    expect(screen.getByRole('link', { name: /see club plans/i })).toBeVisible()
    expect(screen.getByText(DEFAULT_APP_UPGRADE_DESCRIPTION)).not.toBeVisible()
  })

  it('in the app, explains the limit with no sales copy or link', () => {
    inApp()
    render(<UpgradePrompt feature="Coaching groups" description="Upgrade to collaborate." />)
    expect(screen.getByText('Coaching groups isn’t on your current plan')).toBeVisible()
    expect(screen.getByText(DEFAULT_APP_UPGRADE_DESCRIPTION)).toBeVisible()
    expect(screen.getByText('Coaching groups is a club feature')).not.toBeVisible()
    expect(screen.getByText('Upgrade to collaborate.')).not.toBeVisible()
    // A display:none link has no accessible name, so find it by text.
    expect(screen.getByText('See club plans').closest('a')).not.toBeVisible()
  })

  it('uses a caller-supplied appDescription in the app', () => {
    inApp()
    render(<UpgradePrompt feature="AI chat" description="Upgrade!" appDescription="Resets tomorrow." />)
    expect(screen.getByText('Resets tomorrow.')).toBeVisible()
  })

  it('keeps a caller-supplied heading in both shells', () => {
    render(<UpgradePrompt feature="Saving drills" heading="Saving drills requires an active subscription" />)
    expect(screen.getByText('Saving drills requires an active subscription')).toBeVisible()
    inApp()
    expect(screen.getByText('Saving drills requires an active subscription')).toBeVisible()
  })
})

describe('AndroidAppNotice', () => {
  it('is invisible on the website and visible in the app', () => {
    render(<AndroidAppNotice />)
    const notice = screen.getByText(ANDROID_APP_PURCHASE_NOTICE)
    expect(notice).not.toBeVisible()
    inApp()
    expect(notice).toBeVisible()
  })

  it('renders custom content', () => {
    inApp()
    render(<AndroidAppNotice>Shop is closed here.</AndroidAppNotice>)
    expect(screen.getByText('Shop is closed here.')).toBeVisible()
  })
})
