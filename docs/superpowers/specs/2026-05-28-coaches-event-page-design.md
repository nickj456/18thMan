---
name: coaches-event-page
description: Event landing page at /coaches for presenting 18th Man to a coaching group, plus demo script
metadata:
  type: project
---

# Event Page + Demo Script Design

## Context

User is presenting 18th Man to a wide group of coaches tonight. Needs:
1. A `/coaches` page to project at the end of the presentation as a "scan to sign up" closer
2. A structured demo script with a clear narrative arc

## Event Page (`/coaches`)

**URL:** `https://18thman.app/coaches`

**Purpose:** Shown on projector at the end of the demo. Coaches scan the QR code on their phones to go directly to `/signup`. Also a usable link to share later.

**Layout (single viewport, projection-friendly):**
- Top: 18th Man logo + "Rugby League's Coaching Platform"
- Centre: Large QR code (generated server-side via `qrcode` package, pointing to `https://18thman.app/signup`)
- Below QR: URL spelled out — `18thman.app/signup`
- 2×2 feature grid: AI Session Planning / Coaching Blocks / Game Stats / Drill Designer
- Bottom: "Free to join · Sign up in 2 minutes" + big CTA button
- No pricing — coaches are joining free on the club plan

**Design constraints:**
- Dark background (#07080d), large type — readable from back of room
- Minimal scroll — ideally single viewport at 1080p
- QR code must be large enough to scan from 3–4m away

**Implementation:**
- Server component at `web/src/app/coaches/page.tsx`
- QR code generated server-side using `qrcode` npm package → data URL → `<img>`
- No auth check (public page)
- Reuses landing page font variables (Barlow Condensed + Source Serif 4)

## Demo Script

See `docs/superpowers/specs/2026-05-28-demo-script.md`

## Self-Review

- No placeholders or TBDs
- Page is scoped to exactly what's needed: one public page, no DB, no auth
- Demo script covers 5 beats with timing and talking points
