# Changelog

All notable changes to 18th Man are documented here.

## [1.8.0.0] - 2026-06-04

### Added
- **5 new equipment icons in the drill designer**: Tackle Bag, Tackle Shield, Flag/Pole, Marker Disc, and Agility Ladder — all selectable from the toolbar and placeable on the canvas.
- **Agility Ladder is resizable**: drag any corner handle to stretch the ladder to match your real equipment layout. Rungs recount automatically as you resize.
- **Fullscreen mode**: a Fullscreen button in the timeline bar expands the canvas to fill the entire browser window, hiding the form sidebar. Save is still accessible via a floating button in fullscreen.
- **Persistent player icon size**: set icon size (S/M/L) once — all subsequent player placements use that size. Changing size also resizes the currently selected player.
- **Admin user notes**: admins can attach a private text note to any user from the Users admin page.

### Changed
- **Removed 3D perspective mode** from the drill designer — the effect was not useful in practice. The toolbar is cleaner as a result.
- Player size controls are now always visible in the toolbar (not only when a player is selected), making it easier to set your preferred size before placing any icons.

### Fixed
- Agility ladder resize handles no longer drift progressively — Konva node positions are reset after each drag.
- Flag/pole icon now has a larger hit area (12px stroke width) making it reliably clickable.
- Landing page redesigned with hex geometry, brand cohesion, and updated feature sections.

## [0.1.4] - 2026-05-29

### Changed
- **Drill rejection now deletes**: rejecting a drill in the admin approval queue permanently deletes it instead of setting a rejected status.
- **Admin drill management**: the drill approval page now lists all drills (up to 100, newest first) with approval status badges and a per-row Delete button.
- **Delete from drill detail**: admins see a Delete button on any drill's detail page; clicking it removes the drill and redirects to the library.

### Fixed
- Admin delete server action on the drill detail page now enforces server-side admin check via `requireAdmin()`.

## [0.1.1] - 2026-04-15

### Added
- **AI Session Generator**: coaches can now generate full session plans from any AI chat response that looks like a session plan. A "Save as session" button appears on matching AI responses and creates a real session_plans row with one click.
- **Generate with AI CTAs**: new entry points on the Sessions page (banner + empty state buttons) and Dashboard (first-session prompt) that pre-seed the AI chat with a timed run-sheet prompt.
- **Pre-filled AI chat via URL**: `/chat/ai?prompt=...` now accepts a `prompt` query param and pre-fills the input, enabling deep-linking into AI with context.
- Loading and error boundaries for `/sessions` and `/sessions/[id]` routes.
- `getEffectiveTierCached` in `lib/subscription.ts` — React `cache()` wrapper to avoid redundant DB calls across Server Components in the same render tree.

### Changed
- Sessions empty state now offers two options: "Build from scratch" and "Generate with AI".
- Link-preview API endpoint now requires authentication (prevents unauthenticated SSRF abuse) and sets `Cache-Control: private`.
- `SessionBuilder` group/schedule inputs now have `id` attributes wired to their labels for accessibility.

### Fixed
- **Security — SSRF**: link-preview route blocks requests to private/loopback IP ranges and validates URL length.
- **Security — query injection**: drill search and DM profile search now strip non-alphanumeric characters before building `ilike` queries.
- **Security — email enumeration**: signup no longer reveals whether an email is already registered; generic error message returned.
- **Security — input limits**: signup, profile update, and club name fields now enforce server-side length limits.
- `AiChat` drill suggestion fetch now uses `AbortController` to cancel in-flight requests when the effect re-runs.
- TypeScript: replaced all `any` casts with typed `unknown as` patterns across admin, community, clubs, dashboard, drills, and profile pages.

## [0.1.0] - initial release
