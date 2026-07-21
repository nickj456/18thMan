# TODOS

## Ship

**Set up Playwright E2E coverage for browser-only flows**
**Priority:** P2
Coverage audit on 2026-07-06 (v1.8.0.3) found 9 code paths that need a real
browser to test meaningfully: drill designer canvas interactions (equipment
placement, resize, fullscreen save), the Stripe checkout/portal auth+payment
journey, and the admin content-engine/users-table UI. Vitest + Testing
Library now covers everything unit-testable (SSRF guard, Stripe route
authorization, admin actions, mobile nav, lead-magnet form — 62 tests). This
item tracks adding Playwright for the remaining browser-dependent flows.

**Add `sizes` prop to `next/image fill` usages across drill/session cards**
**Priority:** P3
`/qa` on 2026-07-12 (health score 83→99) found that `DrillCard` and related
drill-preview/YouTube-thumbnail images use `fill` without a `sizes` prop
(Next.js performance warning — forces loading the largest possible image
regardless of render size), plus a recurring `/logo.png` aspect-ratio CSS
warning. No functional impact; deferred as low severity. See
`.gstack/qa-reports/qa-report-18thman-2026-07-12.md` (ISSUE-004).

## Completed

**Nested `<a>` tags in DrillCard broke HTML validity on every drill-grid page**
Fixed by `/qa` on 2026-07-12, `feat/landing-page-redesign` (commit 185f340).
`DrillCard`'s author-profile and YouTube-channel links were nested inside
the card's outer drill-detail `Link`, causing a React hydration error on
/drills, /sessions, /chat/ai, /clubs, /groups, /weekly-focus, /podcasts,
and /wellbeing, and an undefined real click target for the author link
(browsers silently reparent invalid nested anchors). Both inner links are
now non-anchor elements that navigate imperatively via `router.push`.

**Base UI `nativeButton` console warning on `Button render={<Link/>}`**
Fixed by `/qa` on 2026-07-12, `feat/landing-page-redesign` (commit 80590e9).
The shared `Button` component now defaults `nativeButton={false}` whenever
a `render` target is supplied, matching the documented `render={<Link/>}`
pattern in CLAUDE.md. Confirmed fixed on /podcasts and /wellbeing.

**Invalid regex on signup username `pattern` attribute**
Fixed by `/qa` on 2026-07-12, `feat/landing-page-redesign` (commit c2e2ee4).
Escaped the trailing hyphen in `[a-z0-9_-]+` → `[a-z0-9_\-]+`, which
Chromium's stricter `pattern`-attribute validation was rejecting, silently
disabling native client-side validation on the signup form.
