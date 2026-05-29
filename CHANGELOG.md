# Changelog

All notable changes to 18th Man are documented here.

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
