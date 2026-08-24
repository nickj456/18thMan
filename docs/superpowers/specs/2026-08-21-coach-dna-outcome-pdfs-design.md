# Coach DNA — Outcome PDFs & Spectacle Reveal

## Problem

The Coach DNA hub page currently offers a "View my Coach DNA card" button (once feedback has genuinely blended into a coach's profile) that opens a modal showing a single branded PNG image — a coaching type badge, narrative, and strength/focus-area lists, generated server-side via `next/og`'s `ImageResponse`.

The owner wants something bigger: once a coach's outcome is ready, a "spectacle" moment on the hub page leading to **two downloadable PDFs** — the full self-assessment/blended outcome, and a separate summary of what their players, parents, and peers actually said. The single-image card is being retired in favor of this.

## Scope

1. **A new feedback-summary aggregation function** — per-category average ratings from cleared player/parent/peer feedback, split by feedback type, gated by the same anonymity thresholds the live scoring engine already uses.
2. **A new PDF template** for that summary, visually matching the existing `CoachDnaSummaryPDF`.
3. **Two new download Route Handlers**, matching this codebase's existing PDF-route convention (`web/src/app/api/sessions/[id]/pdf/route.tsx` et al.).
4. **A redesigned trigger** on the hub page: a full-width "your outcome is ready" moment that reveals two download buttons in place (not a modal).
5. **Removal** of the single-image card feature entirely (Route Handler, `card-data.ts`, `google-font.ts`, `card-logo.ts`, and their tests) — fully superseded.

Out of scope: any change to `computeCategoryScore`, `fetchBlendInputs`, the live blended score itself, or the existing `CoachDnaSummaryPDF` template's content (reused as-is for PDF 1). No change to email delivery (`emailSelfAssessmentSummaryPDF` keeps working exactly as it does today, independent of this feature).

## Part 1: Feedback summary aggregation

**New file:** `web/src/lib/coach-dna/feedback-summary.ts`

```ts
export interface FeedbackCategorySummary {
  categorySlug: string
  averageRating: number // 1-5, simple mean — not the recency-weighted/outlier-capped blend used for live scoring
  responseCount: number
}

export interface FeedbackTypeSummary {
  ready: boolean // true once at least one category cleared its threshold
  responseCount: number // distinct cleared responses of this type (for the "(N responses)" line)
  categories: FeedbackCategorySummary[] // only categories that individually cleared their threshold
}

export interface FeedbackSummaryData {
  playerParentVoice: FeedbackTypeSummary
  peerObservation: FeedbackTypeSummary
}

export async function computeFeedbackSummary(
  serviceSupabase: ServiceClient, // same service-role client fetchBlendInputs already uses
  coachId: string,
): Promise<FeedbackSummaryData>
```

**Prerequisite (small, in `blend-inputs.ts`):** export the existing `RESPONDENT_TO_SOURCE` constant (currently module-private) so this new file can reuse the identical `player`→`player_voice`/`parent`→`parent_voice`/`peer_coach`→`peer_observation` mapping instead of duplicating it — a one-line export change, no behavior change to `fetchBlendInputs` itself.

Behavior:
1. Load the coach's `feedback_requests` (id, feedback_type), then their cleared `feedback_responses` (id, respondent_type, feedback_request_id) — `held_for_review = false`, matching the exact RLS-backed pattern `fetchBlendInputs` already uses.
2. Load `feedback_answers` for those response ids where `numeric_value is not null`, joined to `assessment_questions!inner(dna_categories!inner(slug))` — the identical join `fetchBlendInputs` already uses to resolve a question to its category slug.
3. Group answers by `(categorySlug, source)` where `source` is `player`→`player_voice`, `parent`→`parent_voice`, `peer_coach`→`peer_observation` (same mapping table `blend-inputs.ts` already defines — reuse `RESPONDENT_TO_SOURCE` by exporting it from `blend-inputs.ts` rather than duplicating it).
4. For **Player / Parent Voice**: for each category, combine `player_voice` + `parent_voice` answers for that category. The category clears its threshold once the combined count `>= getSourceThresholds(categorySlug).player_voice` (config.ts currently sets `player_voice` and `parent_voice` both to `3` for every category, so this combined check is correct today; if a future override ever splits them, this combined-section approach would need revisiting — noted inline in the code, not a blocker now). `ready` is true once at least one category clears.
5. For **Peer Observation**: same shape, single source (`peer_observation`, threshold `1` by default — clears almost immediately).
6. `averageRating` is a plain arithmetic mean of `numeric_value` (1-5) for that category+section — deliberately simpler than `computeCategoryScore`'s recency-weighting/outlier-capping, since this is a readable summary snapshot, not the precise blended score.
7. `responseCount` on `FeedbackTypeSummary` is the distinct cleared response count for that feedback_type (for the section's "(N responses)" line) — independent of any single category's count.

**New test:** `web/src/lib/coach-dna/feedback-summary.test.ts` — covers: no responses (both sections `ready: false`), a category below threshold excluded while others clear, player+parent combined correctly, peer_observation clearing at 1 response, averages computed correctly.

## Part 2: `FeedbackSummaryPDF` template

**New file:** `web/src/app/(app)/admin/coach-dna/FeedbackSummaryPDF.tsx`

Same `@react-pdf/renderer` approach, same visual language as `CoachDnaSummaryPDF.tsx` (ember header, logo badge, `sectionLabel`/`groupHeading` styles) — reuse that file's `StyleSheet` constants rather than redefining them; export the shared `s`/color constants from `CoachDnaSummaryPDF.tsx` or a small shared `coach-dna-pdf-styles.ts` if that's cleaner once actually written.

Layout: header ("Feedback Summary" instead of the coach's type), then two sections — "Player / Parent Voice" and "Peer Observation" — each either:
- **Ready:** response count line, then one row per category (`labelFor(categorySlug)` + `averageRating.toFixed(1)}/5`).
- **Not ready:** a single muted line, e.g. "Not enough responses yet — check back once more feedback comes in."

Props: `{ data: FeedbackSummaryData, coachName?: string | null, clubName?: string | null, logoSrc?: string }` — same optional coach/club/logo props `CoachDnaSummaryPDF` already takes, for consistency.

## Part 3: Two download Route Handlers

Both follow the exact pattern already established in `web/src/app/api/sessions/[id]/pdf/route.tsx`: `getUser()` → 401, ownership/role check → 403/404, `renderToBuffer`, `Content-Type: application/pdf`, `Content-Disposition: inline; filename="..."`, top-level try/catch → 500.

**New file:** `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.tsx`
- Auth (401) → role admin/coach (403) → attempt ownership/completion (404) → `ensureFreshSummary(attemptId, user.id)` → `hasBlendedFeedback` (404 if not) → `renderToBuffer(<CoachDnaSummaryPDF data={summary} completedAt={...} logoSrc={LOGO_DATA_URI} coachName={...} clubName={...} />)` — reuses the **existing, unmodified** `CoachDnaSummaryPDF` and the **existing** `LOGO_DATA_URI` from `@/lib/pdf-logo` (full-resolution logo is fine here — PDFs don't share `ImageResponse`'s 500KB bundle constraint).
- `Content-Disposition: inline; filename="coach-dna-outcome.pdf"`.

**New file:** `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.tsx`
- Same auth/ownership/blended gate (the `attemptId` here is only used for the ownership/completion/blended check, matching the existing card-image route's pattern — the feedback summary itself is keyed off `coachId`, not the attempt, since feedback isn't tied to one specific assessment attempt).
- `computeFeedbackSummary(serviceSupabase, user.id)` → `renderToBuffer(<FeedbackSummaryPDF data={...} coachName={...} clubName={...} logoSrc={LOGO_DATA_URI} />)`.
- `Content-Disposition: inline; filename="coach-dna-feedback-summary.pdf"`.

## Part 4: Redesigned trigger — `CoachDnaCardDialog` → `CoachDnaOutcomeReveal`

Renamed (its role changed from "open a modal showing an image" to "reveal two download links inline") and rewritten. **Removed:** `CoachDnaCardDialog.tsx`/`.test.tsx`. **New:** `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.tsx` + test.

- Renders a full-width, visually distinct block (ember-glow border/pulse, condensed-bold "YOUR OUTCOME IS READY" label) containing one button, styled boldly per the reference image (large, high-contrast, arrow/chevron accent) — not the small text-link style used elsewhere on this page.
- Click sets local `revealed` state to `true` (no async work at this step — the actual PDF generation happens per-download-link-click, same as any normal file-download `<a>`, so there's nothing to await here). A brief CSS transition (fade/slide) plays as the button gives way to the two download links, giving the moment weight without a fake loading spinner over real work.
- Once revealed: two `<a href=".../report-pdf/{attemptId}" download>` / `<a href=".../feedback-summary-pdf/{attemptId}" download>` styled buttons, labelled "Your Coach DNA Report" and "Feedback Summary".
- Same `attemptId: string` prop as before.

Hub page (`page.tsx`) change: swap the import/usage from `CoachDnaCardDialog` to `CoachDnaOutcomeReveal`, rendered in its own full-width block below "View full breakdown" rather than inline with it (per the approved "dedicated full-width moment" design) — still gated identically on `hasBlendedFeedback(summary.sourcedCategories)`.

## Part 5: Removal

Delete entirely (fully superseded, no longer reachable from anywhere): `web/src/app/api/coach-dna/card-image/[attemptId]/route.tsx` + `.test.ts`, `web/src/lib/coach-dna/card-data.ts` + `.test.ts`, `web/src/lib/coach-dna/google-font.ts` + `.test.ts`, `web/src/lib/coach-dna/card-logo.ts`. `buildCardData`'s `narrativeSnippet`/strength-list logic isn't needed elsewhere — confirm no other import references any of these before deleting (a plan-implementation step, not a design concern).

## Security

- Both new Route Handlers replicate the exact ownership/role/blended-status gating the card-image route already established — re-derived server-side from `attemptId`/`user.id` alone, never trusting a client flag.
- The feedback-summary PDF never includes respondent-identifying data (no comments, no per-response detail) and withholds any category below its anonymity threshold — the same protection the live blended score already provides, applied here for the same reason.

## Out of scope

- Any change to comment/safeguarding handling, live scoring math, or the existing `/complete` page.
- Retroactive backfill or notification for coaches who already saw the old single-image card.
- Any new database migration — this reads existing tables only.
