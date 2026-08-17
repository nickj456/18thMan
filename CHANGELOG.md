# Changelog

All notable changes to 18th Man are documented here.

## [1.11.0.0] - 2026-08-17

### Added
- **Coach DNA hero banner.** The Coach DNA page now opens with a branded hero image, and the page is wider on desktop with the self-assessment and feedback-requests cards laid out side by side instead of stacked.
- **Grouped, collapsible sidebar navigation.** The sidebar's flat list of links is now organized into collapsible sections (Coaching Tools, Analysis & Development, Community, Admin) so it scales without becoming a wall of links. The section containing your current page opens automatically, including when you navigate there from a link outside the sidebar (a dashboard quick action, for example) rather than only on first load. Coach DNA also gained a direct sidebar entry for admins.

## [1.10.1.0] - 2026-08-13

### Added
- **Terms and Privacy links in the landing page footer.** Both legal pages already existed but weren't reachable from the homepage — they're now linked alongside the other footer links.

### Changed
- Drafted the content plan for an upcoming player communication hub (SEE IT / SAY IT / SOLVE IT framework) — planning only, not yet built or user-visible.

## [1.10.0.0] - 2026-08-06

### Added
- **Coach DNA self-assessment (admin preview).** A new 24-question scenario-based self-assessment under `/admin/coach-dna` — start, answer questions with a progress bar and back-navigation, save and resume anytime, and see a completion screen when done. Coach DNA scoring (Phase 2) already existed; this adds the first way to actually feed it self-reported data. Gated to admin accounts for now while the feature is previewed.

### Fixed
- Coach DNA self-assessment: the "Back" button could show a stale, unhighlighted state for a question you'd already answered earlier in the session (a Next.js client-cache quirk) — it now always reflects your saved answer.
- Coach DNA self-assessment: answers are now validated server-side to belong to the question they're submitted for, already-completed assessments can no longer be silently overwritten, and a database error mid-save can no longer be mistaken for "assessment complete."
- Closed a pre-existing gap where any authenticated coach could read the hidden scoring weights behind each self-assessment answer directly via the Supabase client.

## [1.9.1.0] - 2026-07-21

### Added
- **Upload button for shop product preview images.** Admins can now upload an image directly in `/admin/shop` instead of hand-hosting one and pasting a URL — it goes to a new public `shop-previews` storage bucket and shows a live thumbnail. The URL field stays as a manual fallback.
- **Human-readable shop product URLs.** `/shop/<id>` is now `/shop/<slug>` (e.g. `/shop/season-one-rugby-league-coaching-guide`), generated from the title and stable for the life of the product.

### Fixed
- Submitting the shop product form right after choosing a preview image no longer races ahead of the upload and saves the product with no image.

## [1.9.0.0] - 2026-07-20

### Added
- **Shop: a public storefront for official coaching PDFs, videos, and plans.** Sell content one-time, unlock it via subscription tier, or both — a product can require a price, a minimum tier, or accept either. The catalog and product pages are public, so a social media link can send a stranger straight to a purchase with no account required; a "Buy" button sits right on the catalog cards, not just the detail page.
- **Guest checkout.** Buyers without an account pay via Stripe and get their download emailed directly (a 7-day signed link) — no login needed to receive their purchase. Logged-in members download instantly from a new "My Library" page.
- **Admin product management** at `/admin/shop` — create, edit, publish/unpublish, and delete products, with file upload for PDFs and videos.
- Post-purchase messaging explains what happens next (email vs. instant library access) and shows a real success state when returning from checkout, instead of silently re-showing the Buy button.
- Refunding a shop purchase in Stripe now revokes the buyer's access instead of leaving it permanently unlocked.

### Fixed
- Product catalog/detail/library pages no longer expose internal storage paths, Stripe price IDs, or the uploading admin's profile ID to visitors — they now select an explicit column list instead of `*`.
- Stripe webhook retries for a completed purchase no longer re-send the confirmation email or re-mint a guest's download link on every redelivery.
- Fixed a nested `<a>` tag in drill cards causing hydration errors across every page that renders a `DrillCard` (drills library, sessions, chat, clubs, groups, weekly focus, podcasts, wellbeing).
- Base UI `Button` no longer defaults to a native `<button>` when a custom `render` element is supplied.
- Username validation no longer mishandles a hyphen in the allowed character pattern.

## [1.8.0.3] - 2026-07-06

### Changed
- **Landing page redesign polish.** Mobile visitors now get a real navigation menu (hamburger with all section links and Sign In) — previously the nav collapsed to just the logo and Get Started button on phones. The free training-block signup form has visible field labels, a dark-themed dropdown instead of the browser's default light one, and an always-active submit button. Pricing cards now highlight a single "Most Popular" plan instead of two competing filled buttons. Animations respect "reduce motion" system settings, and body text contrast was raised to meet accessibility guidelines.
- **Stripe billing routes now enforce club-admin authorization**, closing a gap where any signed-in user could start or manage a subscription for a club they don't administer.
- **Session-plan link previews are protected against server-side request forgery (SSRF).** Fetching a linked URL for a preview now validates the target — and every redirect it follows — against private and internal IP ranges, including IPv4-mapped IPv6 and NAT64 address forms that could otherwise reach cloud metadata endpoints.
- Session builder assigns each new drill a stable unique key instead of a timestamp, preventing duplicate-key glitches when drills are added in quick succession.
- Voice input availability is now detected in a way that's safe during server-side rendering.

### Added
- **Automated test suite** (Vitest + Testing Library) covering the SSRF guard, Stripe authorization checks, admin note-taking, the new mobile menu, and the lead-magnet form — with tests running automatically on every push and pull request.

### Fixed
- Clubs' Stripe billing identifiers are no longer readable by any signed-in user or the public — only club admins and the server can see them.
- The admin content tool's AI-generation flow correctly redirects non-admins instead of silently failing, and rejects malformed AI responses instead of crashing.
- Subscription checkout no longer 500s on an unrecognized or missing plan — it now returns a clear error.

## [1.8.0.2] - 2026-06-05

### Changed
- **SEO improvements across the site.** Every public page now has full Open Graph and Twitter Card metadata (title, description, image, og:type, og:url), canonical URLs, and expanded keyword lists — so links shared on social media and in messaging apps show rich previews instead of bare URLs.
- **Structured data (JSON-LD) added for better search visibility.** The site now emits `WebSite` + `Organization` schema on every page, `Person` schema on coach profile pages, and `BreadcrumbList` + `HowTo` schema on drill detail pages — giving Google the context it needs to generate rich results.
- **Fixed broken social preview image.** The OG/Twitter image reference was pointing to a missing static file; it now correctly uses the dynamic Open Graph image generator already in place.
- **Hardened JSON-LD output against injection.** User-generated content in structured data (coach bios, drill titles, club names) is now fully escaped before rendering.

## [1.8.0.1] - 2026-06-05

### Fixed
- **Group Admin can now invite and remove members from their group.** Added RLS policies (via a `security definer` helper to avoid self-referential recursion) so users with `group_role = 'admin'` on `group_invitations` can insert, update, delete, and read invitations for groups they administer — without requiring `club_role = 'admin'`.
- **Session page no longer throws if `drills_order` is unexpectedly non-array.** Added a defensive `Array.isArray` guard before calling `.filter()` on the session's drills list.

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
