# 18th Man — Design System

18th Man is a rugby league coaching platform: a drill designer, session planner, rugby-league-specific AI coaching assistant, and a coach community, built by coaches for coaches. Free to start at [18thMan.app](https://18thman.app). Tagline: **"Better sessions. Better players. Better coaches."**

Two products share one brand:
- **Marketing website** ("Persuade mode") — the public landing page and signup funnel.
- **Authenticated app** ("Operate mode") — the dashboard, drill designer, session planner, AI chat, and community, used by coaches day to day.

## Sources

- Attached local codebase: `18th Man/` (Next.js app in `18th Man/web/`), read via `local_ls`/`local_read`. Key files referenced: `web/src/app/globals.css`, `web/src/app/layout.tsx`, `web/src/app/page.tsx` (landing page), `web/src/components/ui/*` (shadcn/base-ui component primitives), `web/src/components/app-sidebar.tsx`, `web/src/components/drills/DrillCard.tsx`, `web/src/app/(app)/dashboard/page.tsx`, `PRODUCT.md`.
- Uploaded files: `DESIGN.md` (shipped design-system spec — colors, type, radii, component rules), `inter-900.woff2` (a supplied weight-900 Inter font file — not referenced anywhere in the shipped codebase; kept available as `--font-heavy-alt` but not used in the default type system), app icon set (`apple-touch-icon.png`, `favicon-32.png`, `icon-192.png`, `icon-512.png`), `feature-announcement.html` (a shipped HTML email template — informed the CONTENT FUNDAMENTALS section and confirms DM Sans/DM Serif Display as the email-only type pairing).
- Colour/role notes pasted directly by the user (hex values for Orange, Deep Charcoal, Black, Off White, Steel Grey, Dark Grey) — cross-checked against `globals.css` and found to match the shipped `oklch()` values almost exactly.

No Figma file or link was provided — all visual decisions are sourced from the live codebase and the shipped `DESIGN.md`.

## Index

- `styles.css` — root stylesheet, imports everything in `tokens/`.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `fonts.css`.
- `assets/` — `logo.png` (hexagon "18" crest), `icons/` (favicons + PWA icons), `fonts/inter-900.woff2`, `illustrations/` (hero/drill imagery from the shipped app).
- `components/` — reusable primitives, grouped by concern:
  - `forms/` — Button, Input, Textarea, Label, Checkbox, Switch, Select
  - `data-display/` — Card (+ Header/Title/Description/Content/Footer), Badge, Avatar, Separator, Skeleton
  - `navigation/` — Tabs
  - `overlays/` — Tooltip, Dialog
- `ui_kits/marketing-website/` — landing page recreation (`MarketingHome.jsx`).
- `ui_kits/app-dashboard/` — authenticated app shell recreation: sidebar, dashboard, drill library (`AppShell.jsx`).
- `guidelines/` — foundation specimen cards (colors, type, spacing, elevation, iconography, hexagon motif, button states).
- `SKILL.md` — portable skill file for use in Claude Code or other agent contexts.

## Intentional additions

None. Every component built here (Button, Input, Textarea, Label, Checkbox, Switch, Select, Card, Badge, Avatar, Separator, Skeleton, Tabs, Tooltip, Dialog) has a direct counterpart in `web/src/components/ui/`.

## Components not yet built

The shipped `ui/` folder also defines: AlertDialog, ButtonGroup, Chart, Collapsible, DropdownMenu, NavigationMenu, Sheet, Sidebar (as a standalone primitive — a simplified sidebar is composed directly inside the App Dashboard UI kit instead), Sonner/Toast, UpgradePrompt. These were not ported in this pass — flagged below under Caveats.

---

## CONTENT FUNDAMENTALS

**Voice:** direct, practical, coach-to-coach. Copy talks about what a coach *does* — sessions, drills, whiteboards, training grounds — never abstract SaaS language. "Stop winging it on the whiteboard" (hero subhead) is the clearest example: it names the actual pain (unplanned, improvised sessions) rather than a vague benefit.

**Person:** second person to the coach ("18th Man gives *you*..."), first person plural when the app is the subject ("*We* built this for coaches"). The founder quote uses first person singular ("I built 18th Man because I was coaching at the grassroots level...") — the one place the copy speaks as an individual, not the brand.

**Casing:** sentence case for body copy and buttons ("Start Coaching Better", "Go to your dashboard"); headings in the app use Title Case; the landing page's display headings are set in uppercase via CSS transform, not typed in caps in source — the underlying strings are normal sentence case ("Better sessions. Better players.").

**Emoji:** not used in the product UI or landing page. The one exception found is the shipped marketing/announcement email (`feature-announcement.html`), which uses emoji as inline glyphs in feature-tile icons (⭐ 💬 🏉 🎯 🤖 🎨 📋 🏟️ 👥 🎙️ 💚 ⚙️) — an email-specific convention (no icon font/SVG support in most mail clients), not a brand-wide pattern. Do not carry emoji into the web app or landing page.

**Numbers/stats:** the product has no fabricated metrics. The landing page's stat row deliberately uses words instead of invented numbers — "Free / to join", "AI / coaching assistant", "∞ / drills to share", "Club / team collaboration" — because there are no real usage numbers to cite yet (confirmed in `PRODUCT.md`: "No testimonials, published user counts, or case studies exist yet — do not fabricate them"). Follow this rule in any new design work.

**Rugby league specificity:** copy always uses the sport's own vocabulary — "line speed," "ruck," "completions," "GameSense," "S&C" — never generic "sports" or "training" language. This specificity is explicitly the product's differentiator (`PRODUCT.md`: "a rugby-league-specific platform").

**Example passage (verbatim, hero subhead):**
> Stop winging it on the whiteboard. 18th Man gives rugby league coaches ready-made drills, AI-planned session blocks, and a community sharing what actually works at training.

---

## VISUAL FOUNDATIONS

**Colour:** a warm near-black neutral scale with exactly one accent, ember orange (`#E8560A` / `oklch(0.62 0.2 42)`), used identically in both themes. The One Accent Rule: orange never decorates — it appears only on primary buttons, focus rings, active/selected nav states, links, and the AI-chat heading accent. Dark is the deliberate default (a tool used pitch-side, often in low light); light mode remaps the same neutral scale rather than inventing a second palette.

**Type:** two-family system in the app — Geist (body/UI, 400 weight, 0.875rem/1.5) for everything read at length, and Barlow Condensed 800 italic uppercase for headings/structure only ("scoreboard energy," never body copy). Geist Mono handles anything measured or machine-facing (stats, IDs, durations, code) and is never used for prose. The landing page adds Source Serif 4 as an editorial voice (body copy, quotes) — explicitly landing-only; the authenticated app never uses serif type.

**Spacing:** a plain 8/16/24px scale (`sm`/`md`/`lg`) layered on a 4px rhythm elsewhere in the shipped app (gaps, paddings). Card internal padding is 16px (12px in the compact `sm` density variant).

**Backgrounds:** flat solid colour is the default everywhere in the app (no gradients, no photography, no texture). The one deliberate exception is the landing page, which layers: a faint rugby-pitch line diagram (SVG, ~12% opacity) behind the hero, a repeating hexagon-grid texture (thin ember strokes, ~8–9% opacity) as a marketing-only signature, and two soft radial glows (ember top-right, a whisper of green bottom-left) — all confined to Persuade-mode surfaces. One scoped exception: the Coach DNA admin page hero uses a hex/DNA-helix illustration (`coach-dna-hero.png`) as a named-feature promotional moment — not a precedent for other in-app surfaces.

**Animation:** landing page only — fade-up reveals on scroll-in staggered ~150ms apart (`cubic-bezier(.22,.6,.36,1)`, ~0.8s), an infinite horizontal marquee (28s linear, pauses on hover), a subtle pulsing glow on the primary CTA, and a line-grow accent under section labels. The authenticated app has no scroll/entrance animation — only functional transitions (hover/press states, ~150ms ease).

**Hover states:** primary buttons dim to 80% opacity; outline/ghost buttons fill to the muted surface colour; links underline. Nothing brightens or changes hue on hover — opacity and surface-fill only.

**Press states:** every interactive control (button, input, select) translates down 1px on press (`active:translate-y-px`) — a deliberate "tactile pressed" feel described explicitly in the shipped design spec.

**Borders / elevation:** flat-by-default. A resting surface (card, panel, sidebar) is separated from its background by a hairline ring (`ring-1 ring-foreground/10`, an alpha-white line, not a solid grey) — never a shadow. Shadow is reserved exclusively for things that genuinely float above the page: dropdowns, sheets, popovers, dialogs, select menus, and the landing page's floating drill-canvas mockup card.

**Corner radii:** scale from a 10px base — 6px (sm, compact controls) → 8px (md) → 10px (lg, buttons/inputs — the whole button system uses one consistent radius) → 14px (xl, cards) → up to 26px (4xl, large containers). The landing page's hexagon icon badges are the one deliberate break from the rounded-rectangle system.

**Transparency / blur:** the landing nav uses `backdrop-filter: blur(12px)` over `rgba(7,8,13,0.88)` when sticky-scrolled. Floating overlays (AI coaching-points callout on the landing hero mockup) use `blur(8px)` over a dark scrim. Not used elsewhere.

**Imagery:** minimal — the shipped app has almost no photography. What exists (`landing-hero.png`, `coach-dna-hero.png`, drill preview thumbnails, the promotional "Hol" sketch series) is warm-toned, pitch/training-ground photography or dark-mode product screenshots — no black-and-white treatment, no heavy grain.

**Layout:** desktop-first for creation surfaces (drill designer, session/block planning) — these are full-width, single-column workspaces. Browsing surfaces (drill library, shop) use responsive card grids. The app shell is a fixed persistent sidebar (darker than the page background, a "frame" around content) plus a scrolling content area.

---

## ICONOGRAPHY

The shipped app uses **Lucide** (`lucide-react`) exclusively for UI iconography — no icon font, no custom SVG icon set, no emoji in the product UI. Icons are outline-style, ~1.5–2px stroke weight, sized via Tailwind `size-*` utilities (most commonly `size-4`, 16px). This design system links Lucide from CDN (`unpkg.com/lucide`) in component/UI-kit cards rather than copying the full icon set locally.

Emoji appear in exactly one place: the marketing/announcement HTML email template, as a cross-client-safe substitute for icons (see CONTENT FUNDAMENTALS). Do not use emoji as icons in the web app.

The one hand-drawn-SVG exception in the whole product is the landing page's hexagon icon badges and pitch-line diagram — both bespoke, brand-specific illustrations (not a generalizable icon system), reproduced in `guidelines/hexagon-motif.card.html`.

---

## Caveats & where to help next

- **Font substitution:** none needed — Geist, Geist Mono, Barlow Condensed, and Source Serif 4 are all real Google Fonts and are linked directly in `tokens/fonts.css`. The one unresolved item is `inter-900.woff2`, which you uploaded but which doesn't appear anywhere in the shipped codebase or `DESIGN.md` — I've wired it up as an available `--font-heavy-alt` token but haven't used it anywhere, since I don't know its intended role. Let me know if it should replace Barlow Condensed somewhere, or if it's for a surface I haven't seen yet.
- **Components not ported:** AlertDialog, ButtonGroup, Chart, Collapsible, DropdownMenu, NavigationMenu, Sheet, a standalone Sidebar primitive, Sonner/Toast, and UpgradePrompt exist in the shipped `ui/` folder but aren't built here yet — say the word and I'll do a follow-up pass.
- **UI kit coverage:** two kits exist (marketing site, app dashboard/drill library) as first-pass recreations of the highest-traffic screens. The real app has dozens more screens (session planner, drill designer canvas, AI chat, community, admin, settings, shop) — tell me which ones matter most and I'll build them next.
- **Logo:** only a single hexagon "18" crest PNG (`logo.png`) was found — no wordmark lockup, no favicon-specific vector, no light/dark variants beyond what's visible against different backgrounds. If a vector (SVG) source or alternate lockups exist, send them over.

I'd love your read on all of the above — tell me what's off and I'll iterate.
