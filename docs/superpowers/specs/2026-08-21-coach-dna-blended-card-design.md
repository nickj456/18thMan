# Coach DNA — Blended Results Card

## Problem

`generateSelfAssessmentSummary` (`web/src/app/(app)/admin/coach-dna/summary-actions.ts`) already blends a coach's self-assessment with cleared player/parent/peer feedback, category by category, via the existing `computeCategoryScore` engine — but that blend only ever runs once, the first time a coach opens their results, and its output (`coach_profiles.ai_summary`, including which categories are self-only vs. blended, via `sourcedCategories`) is cached indefinitely. A coach who already viewed their results before any feedback arrived keeps seeing that stale, self-only picture forever: nothing re-triggers `generateSelfAssessmentSummary` when new feedback later clears the blending threshold.

Separately, once a coach's profile genuinely reflects blended feedback (not just their own self-view), the product wants to mark the occasion: a polished, on-brand, downloadable result card — a "whole outcome" moment — rather than only the existing plain-text `/complete` page.

## Scope

1. **Auto-refresh**: detect, on page view, whether the cached summary is stale relative to what would be computed right now, and silently regenerate (one more AI call) when it is. No new database columns — staleness is re-derived from existing data every time, not tracked via a timestamp.
2. **A new "View my Coach DNA card" button** on the hub page's self-assessment card (`web/src/app/(app)/admin/coach-dna/page.tsx`), shown only once the assessment is complete *and* the (possibly just-refreshed) summary has at least one category blended in from real feedback — not for a self-only result.
3. **A new branded, shareable image** generated server-side via `next/og`'s `ImageResponse`, shown in an on-page modal with a download action.

Out of scope: any change to the assessment flow itself, to `computeCategoryScore`/`fetchBlendInputs`/`archetype.ts` (used as-is), to the `/complete` page's existing text layout beyond calling the same refresh check, or to email/PDF export.

## Part 1: Extract the shared blend computation

`generateSelfAssessmentSummary` currently inlines: load responses + options, `computeSelfOnlyCategoryScores`, `fetchBlendInputs`, loop categories through `computeCategoryScore`, derive `sourcedCategories`, then `deriveArchetype`. The new staleness check needs that exact same output *without* the AI call that follows it, so this step is extracted into a new pure(ish) helper both call:

**New file:** `web/src/lib/coach-dna/blended-archetype.ts`

```ts
export interface BlendedArchetypeResult {
  archetype: ArchetypeResult
  sourcedCategories: Record<string, ScoreSource[]>
}

export async function computeBlendedArchetype(
  supabase: SupabaseClient,       // the caller's already-scoped client, for assessment_responses
  serviceSupabase: ServiceClient, // service role, for assessment_options + fetchBlendInputs (same split summary-actions.ts uses today)
  attemptId: string,
  coachId: string,
  completedAt: string,
): Promise<BlendedArchetypeResult>
```

Body is exactly today's `generateSelfAssessmentSummary` logic up through `deriveArchetype(blendedScores)`, unchanged (including its existing error throws for missing/incomplete responses). `generateSelfAssessmentSummary` is refactored to call this helper, then proceed straight to building the AI prompt from `archetype` as it does today — no behavior change for the existing generate-if-missing path.

Also add two small pure helpers alongside it (or in `summary-shape.ts`, wherever fits best at implementation time):

```ts
/** True once any category has blended in feedback beyond the coach's own self-view. */
export function hasBlendedFeedback(sourcedCategories: Record<string, ScoreSource[]>): boolean {
  return Object.values(sourcedCategories).some(sources => sources.some(s => s !== 'self'))
}

/** Structural equality check (unordered per-category source lists) between the
 *  cached summary's sourcedCategories and a freshly computed one. */
export function sourcedCategoriesEqual(
  cached: Record<string, string[]> | undefined,
  fresh: Record<string, ScoreSource[]>,
): boolean
```

## Part 2: Auto-refresh (`ensureFreshSummary`)

**New export in `summary-actions.ts`** (same file, so it can call the existing `generateSelfAssessmentSummary` and reuse its auth/ownership/completed-at guards rather than duplicating them):

```ts
export async function ensureFreshSummary(attemptId: string, coachId: string): Promise<SelfAssessmentSummary>
```

`ensureFreshSummary` does **not** perform its own auth/role redirect — every caller (hub page, `/complete` page, the new image route) already runs its own auth+role check before touching any Coach DNA data, matching this codebase's existing convention on every Coach DNA file, and passes in the already-validated `coachId` (`user.id`) as a plain argument. `ensureFreshSummary` uses it only for the data-level ownership check, throwing a plain `Error` (not `redirect()`) on failure — this matters because its call path is reachable from a Route Handler (Part 4), where `redirect()` from `next/navigation` does not behave correctly (it throws a signal meant for the page-rendering machinery, not a raw request handler backing an `<img>` fetch).

Behavior:
1. Loads the `assessment_attempts` row for `attemptId`; throws if it doesn't exist, `coach_id !== coachId`, or `completed_at` is null (the data-ownership check described above).
2. Reads the cached `coach_profiles.ai_summary` for `coachId`.
3. Calls `computeBlendedArchetype(..., attemptId, coachId, attempt.completed_at)` (cheap: no AI call) to get the current `sourcedCategories`.
4. If no cached summary exists, or its shape is stale (`isCurrentSummaryShape` fails), or `sourcedCategoriesEqual` is false against the fresh computation → calls `generateSelfAssessmentSummary(attemptId)` (the real AI call, which re-derives everything itself including its own ownership check) and returns its result.
5. Otherwise returns the cached summary unchanged — no AI call, no write.

`generateSelfAssessmentSummary` itself keeps its existing `redirect()`-based auth checks unchanged (it's still called directly today by `RetryGenerateButton`'s action, outside this feature's scope to touch). Those checks are unreachable in practice down this path — the Route Handler in Part 4 already validated the identical user/ownership/completed-at conditions immediately before calling `ensureFreshSummary` — but "unreachable in practice" is not a guarantee worth trusting blindly inside a Route Handler. Part 4's handler wraps its whole `ensureFreshSummary` call in a `try/catch` and maps any thrown error (a genuine data error, or in the theoretical case a stray redirect-digest error) to a plain `500 Response` — the modal treats a failed image load as an error state, never an unhandled crash.

**Callers, both replacing their current "generate only if missing" logic with a call to `ensureFreshSummary`:**
- `web/src/app/(app)/admin/coach-dna/page.tsx` (the hub page) — needed here specifically to decide whether to show the new button. This makes the hub page's self-assessment section conditionally do real work (a cheap recompute always; an AI call only on the — expected to be rare — occasions a category just tipped over its blending threshold since last view). This is an intentional, explicit trade-off the hub page did not previously make (it was deliberately read-only before this feature).
- `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx` — currently calls `generateSelfAssessmentSummary` only when nothing valid is cached; switches to `ensureFreshSummary` so this page is never stale either, independent of whether the coach visited the hub first.

**Failure handling on the hub page:** the hub page previously made zero calls into generation specifically to stay fast and error-free. `ensureFreshSummary` can throw (e.g. `computeBlendedArchetype`'s existing "no responses found" / "started before current format" guards, or a Groq failure inside the delegated `generateSelfAssessmentSummary` call). The hub page wraps the call and, on any throw, falls back to rendering exactly what it renders today when no valid cached summary exists (the plain "View your results" button) rather than letting the page fail — the coach can still reach `/complete`, which surfaces the real error via its own existing `generationFailed` UI and `RetryGenerateButton`. The hub page itself never shows an error state for this — it just quietly doesn't upgrade to the richer card that visit.

## Part 3: Hub page button

In `page.tsx`, once `completed` exists and `ensureFreshSummary` has run, the self-assessment card renders the existing condensed snapshot as today, plus (only when `hasBlendedFeedback(summary.sourcedCategories)`) a new button: **"View my Coach DNA card"**. Clicking it opens a modal (shadcn `Dialog`, already in `components/ui/dialog.tsx`) containing:
- `<img src={`/api/coach-dna/card-image/${completed.id}`} alt="Your Coach DNA card" />`
- A "Download" action (`<a href={...} download>` — same-origin image, plain download works)

A self-only result keeps today's plain "View full breakdown" link only — no button, no card.

## Part 4: Card image generation

**New Route Handler:** `web/src/app/api/coach-dna/card-image/[attemptId]/route.ts`

Route Handlers are normally reserved for public APIs/webhooks per this project's conventions, but `ImageResponse` requires one — Server Components/Actions cannot return an image `Response`. This is the sanctioned exception.

```ts
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> })
```

1. Same checks as every other Coach DNA route (`getUser()`, role must be `admin` or `coach`), but expressed as plain `Response` status codes rather than `redirect()` — this route is fetched by an `<img>` tag, not navigated to, so a Next.js redirect has nowhere useful to go. Missing user or wrong role → `401`.
2. Load `assessment_attempts` by `attemptId`; verify `coach_id === user.id` and `completed_at` is set — `404` otherwise. Never trust the client's decision to show the button; this is the real access control.
3. Call `ensureFreshSummary(attemptId, user.id)` inside a `try/catch`, mapping any thrown error to a `500 Response` (see Part 2's failure-handling note) — the image is generated from the same, guaranteed-current, data the hub page and `/complete` page show.
4. If `!hasBlendedFeedback(summary.sourcedCategories)`, return 404 — this endpoint only ever serves a blended result, matching the button's own gating, re-checked server-side.
5. Build and return the `ImageResponse` (1200×630, matching standard social-card dimensions, also a sensible modal size):
   - Coaching type badge (`labelFor(primaryType)` / secondary), top strength, a clearly headlined "Development focus" section (top `cons` entry) — the same three facts the hub's condensed snapshot leads with, so the card and the page agree.
   - Brand mark and hex/DNA motif, recreated as lightweight typographic/vector elements (Satori renders `<svg>` children directly) rather than embedding the existing `coach-dna-hero.png` (2.3MB) or the existing `LOGO_DATA_URI` PNG (~230KB base64) as-is — both blow well past `ImageResponse`'s 500KB total bundle budget (JSX + CSS + fonts + images combined) once the brand font is added too. Reuse the sidebar's own simple flat "18" badge + "18TH MAN / RUGBY LEAGUE" wordmark treatment as the model — it's already mostly typographic.
   - Real Barlow Condensed for the headline, per `DESIGN.md`'s display-type rule: a vendored local `.ttf` (extra-bold italic, the weight/style this project already loads via `next/font/google`) read with `fs.readFile` and passed via `ImageResponse`'s `fonts` option — the pattern this Next.js version's own docs show, and lighter/more reliable than fetching Google's CSS at request time. Implementer must place the font file under the repo (e.g. `web/assets/fonts/`) and confirm the combined asset+font size clears the 500KB budget before considering this part done.

## Security

- The image route re-derives everything server-side from `attemptId` alone (ownership, completion, blended status) — it does not trust any client-supplied flag. A coach cannot reach another coach's card by guessing an ID (ownership check, same as every other Coach DNA route) or view a premature card via a stale client button (blended-status re-check).
- No new data is exposed by the image that isn't already visible to the coach on the hub/`/complete` pages.

## Out of scope

- Any change to `computeCategoryScore`, `fetchBlendInputs`, `archetype.ts`, or the scoring weights/thresholds themselves.
- Sharing the card image outside the app (social meta tags, public share links) — this is a personal download only, reachable solely by the authenticated coach who owns it.
- Any change to the `/complete` page's visual layout beyond calling `ensureFreshSummary` instead of today's generate-if-missing check.
- Retroactively backfilling or notifying coaches whose cached summary is already stale before this ships — the first visit after deploy naturally refreshes it.
