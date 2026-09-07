# Handoff: 18th Man landing page redesign

## Overview
A full rethink of the public landing page at `web/src/app/page.tsx` (Next.js). Goal: look sporty and professional, stand out on first load, and drive both free signups and Coach Pro / Club upgrades. The page keeps all existing copy, pricing and sections but restructures them, consolidates seven feature cards into three pillars, and introduces angled "slash" panels, an orange scoreboard band, a founder panel on orange, and a monthly/yearly pricing toggle.

## About the design files
`Landing - Redesign.dc.html` is a **design reference built in HTML** — it shows intended look and behaviour. It is not production code. Recreate it inside the existing Next.js app, replacing the body of `LandingPage()` in `web/src/app/page.tsx`, reusing the existing `<style>` block approach (or moving styles to CSS modules), `next/font` setup (`Barlow_Condensed`, `Source_Serif_4`), `next/image`, `next/link`, and the existing `DownloadForm`, `ExitIntentPopup`, `MobileMenu` components. Keep the `user` branch logic (signed-in users see "Go to dashboard" instead of signup CTAs).

`Landing - Current.dc.html` is a recreation of today's page, included for side-by-side comparison only.

## Fidelity
**High-fidelity.** Colours, type, spacing and copy are final. Match them exactly; use the `.dc.html` file as the source of truth for any value not listed here (open it in a browser and inspect).

## Page structure (top to bottom)

1. **Nav** — sticky, 68px, `rgba(5,6,8,0.86)` + `backdrop-filter: blur(12px)`, 1px bottom hairline `rgba(255,255,255,0.06)`. Logo (38px) + "18TH MAN" (Barlow 800 italic 1.3rem). Links: Platform (#features), How it works (#how), Pricing (#pricing), Coaching Eye (#services) — Barlow 700 0.9rem, letter-spacing 0.1em, uppercase, `#a8a6a1` → `#f4f4f2` on hover. Right: "Sign in" text link + "Start free" primary button (small variant). Keep `MobileMenu` for <640px.

2. **Hero** — `min-height: calc(100vh - 68px)`, background `#050608`, hex-grid SVG texture at 7% opacity (same generator as current `HexGridBg`). Decorative: full-height ember slash `background:#e8560a; width:46vw; right:-12vw; transform:skewX(-12deg)` plus a second lighter slash (`rgba(232,86,10,0.16)`, offset `translateX(-2.2vw)`), and a radial glow `rgba(232,86,10,0.18)` top-right. Two-column grid (`repeat(auto-fit, minmax(min(100%,460px),1fr))`, gap 3rem).
   - Left: kicker (skewed 28×3px ember bar + "The coaching platform for rugby league", Barlow 700 0.85rem, 0.22em tracking, ember). H1: three lines "Better sessions. / Better players. / Better coaches." — Barlow 800 italic, `clamp(3.4rem, 8.5vw, 7.6rem)`, line-height 0.86, letter-spacing -0.015em, uppercase; lines 1–2 `#f4f4f2`, line 3 `#e8560a`. Subhead: existing hero copy verbatim, Source Serif 4 300, `clamp(1.05rem,1.6vw,1.25rem)`, 1.6 lh, `#c9c6bf`, max-width 500px. CTAs: primary "Create free account →" + ghost "See Coach Pro" (→ #pricing). Trust line in Geist 0.8rem `#a8a6a1`: "Free forever plan ◆ No credit card ◆ Set up in 2 minutes" (diamonds ember).
   - Right: drill-designer mock card rotated -2deg, `#0f1219`, 1px `rgba(255,255,255,0.1)` border, shadow `0 40px 90px rgba(0,0,0,0.7)`, square corners. Header bar 40px `#050608` with title "Line Speed — Attack vs Defence" and Geist Mono "12 min · U16". Canvas `#0a2b14`, 16:10, SVG drill (reuse existing hero SVG, scaled to 480×300; main attack arrow uses `stroke-dasharray: 8 4` animated `stroke-dashoffset` 0 → -40 over 1.6s linear infinite). Overlay bottom-left "AI coaching points" panel: `rgba(5,6,8,0.8)`, blur 8px, 3px ember left border. Footer bar 38px: "Session 3 · Attack block" / "Saved to club library ✓". Floating tag top-left: "Drill Designer" — `#050608` bg, 1.5px ember border, angled clip-path.
   - Entrance: text fades up (0.8s, `cubic-bezier(.22,.6,.36,1)`, 0.15s delay), card 0.4s delay, slash slides in from the right (0.9s).

3. **Scoreboard band** — full-bleed `#e8560a`, white text. Grid `repeat(auto-fit, minmax(170px,1fr))`, padding 1.5rem. Four stats: `{coachCount}` coaches signed up · `{drillCount}` drills in the library · `{sessionCount}` sessions planned · `£0` to get started. Numbers Barlow 800 italic `clamp(2.4rem,4vw,3.4rem)`; labels Barlow 700 0.95rem uppercase 0.12em, two lines. **The three counts are placeholders (500+, 1,200+, 3,000+) — replace with real figures from the database, or drop the band if none are publishable. Do not ship fabricated numbers.**

4. **Marquee** — `#0a0b0f`, existing eight feature phrases, Barlow 700 italic 0.9rem uppercase `#a8a6a1`, ember ◆ separators, 30s linear loop, pause on hover.

5. **Three pillars** (`#features`) — header row: kicker "What 18th Man gives you", H2 "Whiteboard to training ground, one workflow." (last line ember), intro paragraph right-aligned max 400px. Grid of 3 cards, 2px gap, each `#050608` with `outline:1px solid rgba(255,255,255,0.06)`, padding 2.25rem 2rem 2rem, hover bg `#0a0b0f`. Large watermark number (01/02/03, Barlow 800 italic 7rem, `rgba(232,86,10,0.1)`) top-right. Kicker (Draw it / Plan it / Share it), title Barlow 800 italic 2.1rem uppercase, body Source Serif 300 1rem, then 4 "→" bullet points in Geist 0.85rem `#d6d3cc` above a hairline. Copy per card is in the DC file (`pillars` array).
   Below: 4 compact cards (`#0a0b0f`, `minmax(240px,1fr)`) — Weekly Focus, Player Wellbeing, Match Analyst, PDF Session Export — title Barlow 800 1.2rem uppercase, body 0.9rem.

6. **AI section** — `#0a0b0f` band with faint left slash (`rgba(232,86,10,0.05)`). Left: chat mock card (user bubble ember with one clipped corner; AI reply `#050608` with Setup / Key coaching points / Progression lines and two outlined action chips "Save as drill", "Add to session 3"). Right: kicker "Three AI coaches, one platform", H2 "Ask a coaching question. / Get a coaching answer." (line 2 ember), paragraph, then 3-cell strip Coaching / S&C / GameSense.

7. **How it works** (`#how`) — H2 "Up and coaching / in minutes." Four columns (`minmax(240px,1fr)`), each with a 3px ember top border, step number Barlow 800 italic 3.6rem ember, title Barlow 800 1.35rem uppercase, body 0.98rem. Copy = existing four steps.

8. **Founder** — full-bleed `#e8560a`, white hex-grid at 12%. Left: hexagon photo slot 112×128 (`clip-path: polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)`) — needs a real photo of Nick — plus name (Barlow 800 italic 1.6rem), credentials (Geist 0.9rem), "Creator of 18th Man" label. Right: quote verbatim, Source Serif 4 italic `clamp(1.3rem,2.4vw,1.9rem)`, lh 1.4.

9. **Pricing** (`#pricing`) — header with H2 "Start free. / Upgrade when ready." and a Monthly / Yearly (−26%) segmented toggle (state: `yearly: boolean`; active segment ember bg white text, inactive `#0a0b0f` / `#a8a6a1`). Three cards, `#0a0b0f`, square corners, coloured header bar: Free (`#0f1219` header), Coach Pro (ember header, white text, "Most popular" outlined badge, 1px ember border), Club (`#0f1219` header with ember text, "Best value" badge, `rgba(232,86,10,0.4)` border). Prices: Free £0 forever; Coach Pro £9.99/month or £89/year; Club £24.99/month or £219/year. Price Barlow 800 italic 3.6rem. Feature lists as today (Coach Pro list adds "Match Analyst desktop app"). CTA full-width angled button: Free = ghost, Pro = primary, Club = ghost with ember border. Footnote in Geist 0.8rem.

10. **Coaching Eye** (`#services`) — `#0a0b0f` band. Left: kicker "Coaching Eye · Analysis service", H2 "I see what / coaches miss.", merged intro paragraph (PDF report + Zoom line), member discount line. Right: two stacked rows (`#050608`) — Individual Player Analysis (£50 std 72hrs / £80 express 24hrs) and Pre-Match Opponent Analysis (£75 / £110), each with short body, "Request →" underlined link, prices right-aligned (express in ember). The "How to share your footage" instructions were removed from the landing page — keep them on `/analysis`.

11. **Lead magnet** — bordered panel (`1px solid rgba(232,86,10,0.4)`) with faint right slash. Existing copy; reuse `DownloadForm`, restyled: square inputs `#0f1219` with `rgba(255,255,255,0.14)` border, ember focus border, angled ember submit "Send me the plan →".

12. **Final CTA** — centred, H2 "Ready to coach / smarter?" at `clamp(3.4rem,9vw,7.6rem)`. Decorative ember slashes on both sides sized `width: max(0px, calc(50% - 470px))` so they only appear outside the 940px content column (never behind text). Radial ember glow at top. CTAs: primary "Create free account →" + ghost "Compare plans" (→ #pricing).

13. **Footer** — `#0a0b0f`, logo + wordmark, links (Drill Library, Community, Analyst, Contact, Terms, Privacy, Sign In), © line.

## Buttons
- **Primary**: `#e8560a` bg, white, Barlow 800 italic, uppercase, 0.08em tracking, padding 16px 34px (hero) / 11px 20px (nav) / 18px 40px (final CTA), **angled ends** via `clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)`, hover `opacity: 0.85`, hero CTA has the existing `pulseGlow` animation.
- **Ghost**: transparent, `1.5px solid rgba(244,244,242,0.28)` border, same clip-path, Barlow 700, hover border `#f4f4f2` + `rgba(255,255,255,0.05)` fill.
- All controls: `active:translate-y-px` per DESIGN.md.

## Interactions & behaviour
- Pricing toggle: `useState(false)` for yearly; swaps price, `/month`↔`/year`, sub-line text.
- Entrance animations in hero only (fadeUp / slideIn keyframes above); marquee loop; drill arrow dash animation. Respect `prefers-reduced-motion` (disable all, as today).
- Hover: nav links lighten; pillar cards bg → `#0a0b0f`; buttons per above.
- Signed-in state: hero primary → "Go to dashboard", hide "Sign in"/"See Coach Pro"; hide lead magnet and exit-intent as today.
- Responsive: every grid uses `repeat(auto-fit, minmax(min(100%, Npx), 1fr))`; hero slash overflows are clipped by `overflow: hidden` on the section and `overflow-x: clip` on the page root. Below ~640px hide nav links (MobileMenu), reduce section padding to 3.5rem 1rem.

## Design tokens
Colours: page `#050608`; band/surface `#0a0b0f`; card `#0f1219`; ember `#e8560a`; text `#f4f4f2`; body-secondary `#c9c6bf`; muted `#a8a6a1`; list text `#d6d3cc`; steel `#62666d`; hairline `rgba(255,255,255,0.06)`; border `rgba(255,255,255,0.1)`; pitch green `#0a2b14`; cone yellow `#eab308`.
Type: Barlow Condensed 800 italic uppercase (display), 700 (labels/nav); Source Serif 4 300/400 (body, quotes); Geist 400/600 (UI text, lists, forms, footnotes); Geist Mono (durations).
Section padding: `clamp(5rem, 9vw, 8rem)` vertical, `clamp(1rem, 3vw, 2rem)` horizontal; container max-width 1240px.
Radii: 0 on the landing page (angled clip-paths replace rounded corners). Shadows only on the two floating mock cards.
Skew: all decorative slashes `skewX(-12deg)`; small kicker bars `skewX(-20deg)`.

## Assets
- `assets/logo.png` — from `web/public/logo.png`.
- Hex-grid texture — generated SVG (reuse `HexGridBg`, R=45, stroke 0.8).
- Drill SVG — adapted from the current hero canvas SVG in `page.tsx`.
- Founder photo — not supplied; needed.

## Files
- `Landing - Redesign.dc.html` — the design (open in a browser; styles are inline).
- `Landing - Current.dc.html` — recreation of the live page for comparison.
- `image-slot.js`, `support.js`, `_ds/` — runtime for the HTML previews; not needed in the app.
