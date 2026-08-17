---
name: 18th Man
description: Rugby league coaching platform — drill designer, session planner, AI coach, and community
colors:
  ember-orange: "oklch(0.62 0.2 42)"
  near-black-warm: "oklch(0.13 0.004 260)"
  warm-white: "oklch(0.95 0.005 60)"
  card-surface: "oklch(0.17 0.004 260)"
  muted-surface: "oklch(0.22 0.004 260)"
  muted-foreground: "oklch(0.58 0.005 60)"
  hairline-border: "oklch(1 0 0 / 8%)"
  destructive-red: "oklch(0.704 0.191 22.216)"
  sidebar-surface: "oklch(0.15 0.005 260)"
typography:
  display:
    fontFamily: "Barlow Condensed, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.01em"
    fontFeature: "italic, uppercase"
  body:
    fontFamily: "Geist, Geist Fallback, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "0.875rem"
    lineHeight: 1.5
  label:
    fontFamily: "Geist Mono, Geist Mono Fallback, ui-monospace, monospace"
    fontSize: "0.8rem"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  3xl: "22px"
  4xl: "26px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ember-orange}"
    textColor: "oklch(1 0 0)"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
  button-primary-hover:
    backgroundColor: "{colors.ember-orange}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.lg}"
  card:
    backgroundColor: "{colors.card-surface}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
---

# Design System: 18th Man

## Overview

**Creative North Star: "The Playbook"**

18th Man reads like a coach's tactics board, not a consumer lifestyle app: near-black surfaces, hairline dividers, and monospace-adjacent precision for anything measured (stats, IDs, durations), with a single ember-orange accent used the way a coach marks a whiteboard — sparingly, and only where it means something (primary actions, active states, the one thing that matters on screen). Condensed, heavy, italic uppercase headings (`.app-heading`, Barlow Condensed 800) give the interface a scoreboard/jersey-number energy that a neutral sans-serif heading never would — this is where the "bold and energetic" character lives, concentrated in type and the ember accent rather than spread evenly across every surface.

The landing page (Persuade mode) extends this world outward with a recurring hexagon motif — icon containers, background hex-grid texture — treated as a deliberate 18th Man signature, not incidental decoration. Source Serif 4 appears only on the landing page as an editorial counterweight to the condensed display type; the authenticated app (Operate mode) stays on Geist + Barlow Condensed and does not introduce serif type.

Both dark and light themes are fully implemented (`ThemeProvider`, sidebar toggle, cookie-persisted default). Dark is the deliberate default — this is a tool used quickly, often in low light, pitch-side — but light mode is a first-class mode, not a fallback: the light theme remaps the same zinc/neutral scale rather than inventing a second identity.

**Key Characteristics:**
- Near-black warm-neutral base with a single ember-orange accent, used sparingly and deliberately
- Flat surfaces at rest (ring/hairline border, not shadow); shadows appear only on floating overlays
- Condensed, heavy, italic, uppercase display type for headings — the system's signature voice
- Geist Mono for anything measured or identifying (stats, IDs, durations, code)
- Hexagon motif as a recurring brand signature on marketing/Persuade surfaces

## Colors

The palette is a warm near-black neutral scale with exactly one accent — ember orange — that appears identically in both light and dark themes, so the brand signal never gets diluted by theme.

### Primary
- **Ember Orange** (`oklch(0.62 0.2 42)`, ≈ `#e8560a`): primary buttons, focus rings, active nav states, links, the ember heading color in AI chat markdown. The one color allowed to carry meaning/urgency.

### Neutral
- **Near-Black Warm** (`oklch(0.13 0.004 260)`): app background (dark theme).
- **Warm White** (`oklch(0.95 0.005 60)`): primary text (dark theme).
- **Card Surface** (`oklch(0.17 0.004 260)`): card/popover backgrounds — one step lighter than the page background.
- **Muted Surface** (`oklch(0.22 0.004 260)`): secondary buttons, muted backgrounds, hover surfaces.
- **Muted Foreground** (`oklch(0.58 0.005 60)`): secondary/helper text.
- **Hairline Border** (`oklch(1 0 0 / 8%)`): dividers and card edges — an alpha-white line, not a solid gray, so it stays subtle against any dark surface.
- **Sidebar Surface** (`oklch(0.15 0.005 260)`): app sidebar — one step darker than page background, a distinct "frame" around content.

### Semantic
- **Destructive Red** (`oklch(0.704 0.191 22.216)`): destructive actions and error states only.

### Named Rules
**The One Accent Rule.** Ember orange is the only color allowed to signal "this matters." It never appears as decoration — only on primary actions, focus/active states, and the handful of AI-prose accents that intentionally echo the brand mark.

**The Light Mode Is Not an Afterthought Rule.** Light mode remaps the same neutral scale (see `html:not(.dark)` overrides in `globals.css`) rather than defining a second palette. Any new hardcoded `zinc-*` utility must get a matching light-mode remap in that block, or it will render dark-on-dark in light theme.

## Typography

**Display Font:** Barlow Condensed (with ui-sans-serif, system-ui fallback)
**Body Font:** Geist (with Geist Fallback, ui-sans-serif fallback)
**Label/Mono Font:** Geist Mono (with Geist Mono Fallback, ui-monospace fallback)

**Character:** A neutral, highly legible UI sans (Geist) carries all body and interface copy, so nothing competes with content — then Barlow Condensed 800 italic uppercase interrupts as the display voice for headings only, giving the system its scoreboard energy without touching readability anywhere else.

### Hierarchy
- **Display** (800, condensed, italic, uppercase, `-0.01em` tracking): page and section headings (`.app-heading`). Used for structure, never for body copy.
- **Body** (400, `0.875rem`, 1.5 line-height): default UI text, descriptions, chat content.
- **Label/Mono** (Geist Mono, `0.8rem`): stats, IDs, durations, code blocks, anything measured or machine-facing — per project convention, never used for prose.

### Named Rules
**The Condensed-For-Structure Rule.** Barlow Condensed only appears in headings and the AI-prose H1–H3 accent color. It never appears in body copy, buttons, or form labels — those stay on Geist.

## Layout

Desktop-first for creation surfaces (drill designer, session planner authoring); tablet-usable for review/consumption. The app shell is a persistent sidebar (`--sidebar`, one step darker than page background) plus a content area on `--background`. Card-based grids are the default composition for browsing (drill library, shop); forms and the designer canvas are single-column/full-width workspaces.

## Elevation & Depth

The system is flat by default: surfaces at rest are separated by the hairline border/ring (`ring-1 ring-foreground/10` on cards) rather than shadow. Shadow is reserved for elements that genuinely float above the page — dropdowns, sheets, popovers, select menus — where it signals detachment, not decoration.

### Named Rules
**The Flat-By-Default Rule.** A resting surface (card, panel, sidebar) is distinguished by a hairline border or a one-step surface-color shift, never a shadow. Shadow appears only on overlay/floating primitives (dropdown, sheet, popover, select).

## Shapes

Rounded corners scale from a `0.625rem` (10px) base radius: `sm` (6px) for compact controls, `md`/`lg` (8–10px) for buttons and inputs, up to `xl`–`4xl` (14–26px) for cards and larger containers. The landing page's signature hexagon (icon badges, background hex-grid) is the one deliberate departure from the rounded-rectangle system — reserved for marketing/Persuade surfaces, not the authenticated app.

## Components

### Buttons
- **Shape:** rounded-lg (10px), consistent across all sizes.
- **Primary:** ember orange background, white text; the only button variant that carries the accent color as fill.
- **Hover / Focus:** primary hovers to 80% opacity; all variants get a 3px `ring-ring/50` focus ring plus a 1px active-state translate-down, giving every interactive control a tactile "pressed" feel.
- **Secondary / Outline / Ghost / Destructive:** secondary uses the muted surface fill; outline is transparent with a border that fills to muted on hover; ghost is text-only until hover; destructive uses a low-opacity red fill rather than a solid red block, keeping errors legible without shouting.

### Cards
- **Corner Style:** rounded-xl (14px).
- **Background:** card surface, one step lighter than page background.
- **Shadow Strategy:** none at rest — see Elevation & Depth. A `ring-1 ring-foreground/10` hairline stands in for a border.
- **Internal Padding:** 16px (`py-4`, `px-4` in header/content), 12px in the `sm` density variant.

### Inputs / Fields
- **Style:** transparent background, `border-input` hairline border, rounded-lg (10px).
- **Focus:** border shifts to `ring` color plus a 3px ring glow — matches the button focus treatment for consistency across all interactive controls.
- **Error / Disabled:** invalid state gets a destructive border and ring; disabled drops to 50% opacity and blocks pointer events.

### Navigation
- Persistent sidebar on `--sidebar` surface (darker than page background), ember-orange active/primary states, theme toggle (sun/moon icon swap) docked in the sidebar footer.

### Hexagon Motif (signature)
A recurring hex-grid background texture (thin ember-orange strokes at low opacity) and hexagonal icon badges (ember fill/stroke at partial opacity) on marketing surfaces. Functions as 18th Man's visual signature the way a team crest would — reserved for Persuade-mode surfaces (landing page, marketing), not reused as a generic app-UI container shape.

**Scoped exception:** The Coach DNA page (`/admin/coach-dna`) hero banner uses the hex/DNA-helix marketing graphic (`coach-dna-hero.png`) as a deliberate one-off brand moment, since Coach DNA is itself a named product feature with its own promotional identity. This is not a precedent — no other in-app surface should reach for the hex motif on the strength of this exception.

## Do's and Don'ts

### Do:
- **Do** keep ember orange to primary actions, focus states, and active/selected states — never as a background fill for large areas.
- **Do** use Barlow Condensed 800 italic uppercase for headings only; keep body copy on Geist.
- **Do** use a hairline `ring`/`border` for resting-surface separation; reserve shadow for genuinely floating overlays.
- **Do** add a light-mode remap in `globals.css`'s `html:not(.dark)` block for any new hardcoded `zinc-*` utility.
- **Do** use Geist Mono for stats, IDs, durations, and code — never for prose.

### Don't:
- **Don't** introduce a second accent color — the system deliberately has exactly one.
- **Don't** add drop shadows to cards, panels, or sidebar at rest.
- **Don't** use the hexagon motif as a generic container shape inside the authenticated app — it's a Persuade-surface signature, not a UI primitive.
- **Don't** use Source Serif 4 (or any serif) inside the authenticated app — it's a landing-page-only editorial accent.
- **Don't** ship a light-mode value that isn't a value already defined in the neutral scale — light mode remaps, it doesn't reinterpret.
