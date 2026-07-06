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

## Completed
