# Coach DNA — Full Breakdown & Professional Reporting

## Problem

The Coach DNA self-assessment scores all 8 coaching categories (Teacher, Technician, Motivator, Developer, Game Manager, Communicator, Organiser, Culture Builder), but only the top 3 ("Strengths") and bottom 3 ("Focus areas") ever reach a coach — on the hub page, the `/complete` page, or the outcome PDF. The middle 2 categories and every numeric score are silently discarded in `deriveArchetype`. The feedback-summary PDF is worse: it shows a bare category name and an "X.X/5" number with no interpretation at all.

None of this reads as a "full breakdown," and the feedback numbers in particular read as a gimmick rather than something a coach can act on. Resource links are already clickable on the `/complete` page but are plain text in the outcome PDF. Both PDFs are portrait, plain Helvetica, and visually thin next to the rest of the app's branding. There is no guidance connecting a coach's actual outcome to what to do next inside the app. The "Get Your Report" trigger (pulsing glow, sparkle icon) is flashier than the professional tone the report itself should have.

## Scope

1. Extend the archetype/summary data model so every category (all 8, not 6) carries a score, a tier (`strength` / `solid` / `focus`), and AI-written text.
2. Extend the self-assessment AI prompt to write tier-aware prose for all 8 categories in one call — same architecture as today, larger response.
3. Add AI-written per-category interpretation to the feedback summary (Player/Parent Voice and Peer Observation), with its own cache — a new migration, since this is genuinely new persisted content, not a reshaped existing column.
4. A new on-screen feedback-breakdown page, mirroring the feedback PDF, linked from the hub.
5. Update the hub page and `/complete` page to show the full 8-category picture, kept in sync with the PDFs.
6. A new guidance module: state-conditional next-steps (request feedback → request more feedback → drill library / session planner / AI chat, depending on how complete the coach's feedback picture is).
7. Restrained trigger copy/styling — a confident CTA, not a "reveal."
8. Both PDFs: landscape orientation, embedded brand fonts (Barlow Condensed for headings, Geist for body), genuinely clickable resource links, a 2-column category grid for the self-assessment PDF.

**Out of scope:** any change to the underlying scoring math (`computeCategoryScore`, `computeSelfOnlyCategoryScores`, `getCategoryWeights`, `getSourceThresholds`) — this feature changes what's *surfaced*, not how scores are computed. No drill-category mapping (the drill-library guidance link is generic, not filtered — Coach DNA categories and `drill_categories` are separate taxonomies with no existing mapping between them). No changes to community/DM messaging, session-plan content, or the drill designer itself.

## Part 1: Data model — all 8 categories, tiered

**Modify:** `web/src/lib/coach-dna/archetype.ts`

```ts
export type CategoryTier = 'strength' | 'solid' | 'focus'

export interface CategoryBreakdownEntry {
  categorySlug: string
  score: number
  tier: CategoryTier
}

export interface ArchetypeResult {
  primaryType: string
  secondaryType: string | null
  categories: CategoryBreakdownEntry[] // all 8, ordered by score descending
}
```

`deriveArchetype` ranks all 8 by score (existing tie-break by `CATEGORY_ORDER`), keeps the existing `primaryType`/`secondaryType` logic unchanged, and assigns tiers by rank: index 0-2 → `strength`, index 3-4 → `solid`, index 5-7 → `focus`. `pros`/`cons` are removed entirely — every caller moves to `categories` (there is no back-compat shim; this is one feature build touching every consumer, not a public API).

**Modify:** `web/src/lib/coach-dna/blended-archetype.ts` — no interface change needed; it already just forwards `deriveArchetype`'s result through `BlendedArchetypeResult.archetype`.

**Modify:** `web/src/lib/supabase/types.ts` — `SelfAssessmentSummary` becomes:

```ts
export interface SelfAssessmentSummary {
  primaryType: string
  secondaryType: string | null
  narrative: string
  categories: {
    categorySlug: string
    score: number
    tier: 'strength' | 'solid' | 'focus'
    text: string
    resources: { title: string; description: string; url: string | null }[] // only non-empty for tier === 'focus'
  }[]
  sourcedCategories?: Record<string, string[]>
}
```

`isCurrentSummaryShape`/`isValidSummaryShape` (in `summary-shape.ts` and `summary-actions.ts`) update their checks from `pros`/`cons` to `categories` (8 entries, each with `categorySlug`/`score`/`tier`/`text`/`resources`). A cached `coach_profiles.ai_summary` row in the old `pros`/`cons` shape fails this check and is treated as stale — the existing `ensureFreshSummary` → `generateSelfAssessmentSummary` fallback regenerates it automatically. No SQL migration needed for this reshape; it's the same mechanism that already handles summary-shape evolution.

## Part 2: Self-assessment AI prompt — tier-aware, all 8 categories

**Modify:** `web/src/app/(app)/admin/coach-dna/summary-actions.ts`

The prompt sends all 8 categories with their code-computed score and tier (the AI never decides tier — that's deterministic from the ranking) and asks for text per category, voiced by tier:

```ts
const prompt = `You are writing a self-assessment summary for a rugby league coach, based on their own self-reported scores across 8 coaching categories. Write in a direct, professional coaching voice — confident and specific, not hype, not generic praise. No em dashes. No fluff.

Their primary coaching type: ${labelFor(archetype.primaryType)}
${archetype.secondaryType ? `Their secondary type: ${labelFor(archetype.secondaryType)}` : ''}

For each of the 8 categories below, write text in the voice appropriate to its tier:
- "strength": one confident sentence naming what this strength looks like in practice.
- "solid": one plain sentence on what steady performance in this category looks like for them — not a strength to lead with, not a gap, just solid ground.
- "focus": 2-3 sentences — what the gap looks like in practice, and one concrete thing to try.

Categories, in this exact order (write one entry per category, same order, referencing the tier given):
${archetype.categories.map(c => `${labelFor(c.categorySlug)} (tier: ${c.tier}, score: ${c.score}/100)`).join('\n')}

Vary sentence structure and opening across categories of the same tier — do not open every "focus" entry with the same phrase. Each should read like it was written fresh.

Do not invent scores or claim data you were not given. Do not mention "self-assessment only" or any caveats about data sources - that framing is handled elsewhere in the UI, not by you.

Respond with ONLY a valid JSON object, no markdown fences, no explanation. "categories" must contain exactly 8 entries, in the same order as the list above. Shape:
{"narrative":"one paragraph, 2-4 sentences summarizing the overall picture","categories":[{"categorySlug":"...","text":"..."}]}`
```

`isValidSummaryShape` (local to this file) validates `narrative` (non-empty string) and `categories` (array of `{categorySlug, text}`, both strings). After parsing, the code cross-checks `parsed.categories.length === archetype.categories.length` (still 8) and rebuilds each entry from the archetype's own `categorySlug`/`score`/`tier` plus the model's `text` — the model's `categorySlug` field, if present, is ignored; slugs and order always come from `archetype.categories`, matching the existing "the model only writes prose" invariant. `resourcesFor(categorySlug)` is attached only where `tier === 'focus'`.

## Part 3: Feedback summary — AI interpretation + new migration

**Migration:** `web/supabase/migrations/123_coach_profiles_ai_feedback_summary.sql`

```sql
-- coach_profiles.ai_summary already caches the self-assessment AI write-up;
-- this adds the equivalent cache for the feedback-summary AI write-up (Coach
-- DNA outcome PDFs feature, phase 2) so viewing the on-screen feedback
-- breakdown or downloading the feedback PDF doesn't trigger a fresh Groq
-- call on every request.
alter table public.coach_profiles
  add column ai_feedback_summary jsonb,
  add column ai_feedback_summary_generated_at timestamptz;
```

No RLS change needed — `coach_profiles` already has row-level policies scoping reads/writes to the owning user (and admins), and a new nullable JSONB/timestamptz column inherits the existing table-level policy automatically.

**Modify:** `web/src/lib/coach-dna/feedback-summary.ts`

```ts
export interface FeedbackCategorySummary {
  categorySlug: string
  averageRating: number
  responseCount: number
  text: string // AI-written interpretation, set by generateFeedbackSummaryText (Part 3b)
  resources: { title: string; description: string; url: string | null }[] // non-empty when averageRating < 3.5
}
```

`computeFeedbackSummary` (unchanged aggregation logic) now also sets `resources: averageRating < 3.5 ? resourcesFor(categorySlug) : []` on each category it builds — `text` is left as `''` here; it's filled in by the new AI layer below, which wraps this pure aggregation function.

Feedback categories have no `tier` (they aren't ranked against each other the way the fixed 8 self-assessment categories are — a section might clear the anonymity threshold for one category and not another). A separate two-band label uses the same 3.5 cutoff already governing resources: `feedbackBandLabel(averageRating: number): string` (new export in `feedback-summary.ts`) returns `'Strong'` for `averageRating >= 3.5`, `'Focus area'` otherwise — used everywhere Part 5's feedback page and Part 7's `FeedbackSummaryPDF` show a band next to a rating.

**New file:** `web/src/lib/coach-dna/feedback-summary-actions.ts` (a Server Action module, mirroring `summary-actions.ts`'s shape)

```ts
'use server'

export async function ensureFreshFeedbackSummary(coachId: string): Promise<FeedbackSummaryData>
```

Behavior, mirroring `ensureFreshSummary`/`generateSelfAssessmentSummary`:
1. Compute the current aggregation via `computeFeedbackSummary(serviceSupabase, coachId)` (cheap, no AI).
2. Load `coach_profiles.ai_feedback_summary`/`ai_feedback_summary_generated_at`.
3. Staleness check: cached summary is fresh if, for every category present in the freshly-computed aggregation, the cached entry has the same `categorySlug`, `averageRating` (compared with a small epsilon, e.g. `Math.abs(cached - fresh) < 0.05`, since floating-point re-aggregation of the same underlying data should match near-exactly), and `responseCount` — and vice versa (no cached category is missing from fresh, no fresh category is missing from cached). If fresh, return the cached value (already carries `text`).
4. If stale (or no cache): for each category across both sections that has `responseCount > 0`, call one Groq prompt (single call covering every category in both sections, same "one call, tier-implicit voice" pattern as Part 2) asking for a short interpretation paragraph per category, given its label, average rating (1-5), and response count. Categories below 3.5 get a slightly more direct "here's what this suggests, here's what to try" framing in the prompt; categories at or above get an affirming "this is landing well" framing. Attach `resourcesFor(categorySlug)` where `averageRating < 3.5`.
5. Upsert the result into `coach_profiles.ai_feedback_summary`/`ai_feedback_summary_generated_at`, return it.

If a section has zero categories with `responseCount > 0` (not `ready`), it's returned unchanged (no AI call for an empty section) with `categories: []`, matching today's "not ready" behavior.

Prompt (single call, both sections' categories combined into one request — same rationale as Part 2's single-call self-assessment prompt: fewer round trips, one consistent voice, matches the existing architecture):

```ts
const prompt = `You are writing short interpretations of player, parent, and peer feedback for a rugby league coach. Write in a direct, professional coaching voice — confident and specific, not hype. No em dashes. No fluff. This is feedback FROM other people, not the coach's own self-assessment — write about what others observed, not what the coach believes about themselves.

For each category below, write 1-2 sentences interpreting what this rating suggests, given the category and the number of responses it's based on. A rating at or above 3.5/5 should read as an affirming, specific observation. A rating below 3.5/5 should name what the gap likely looks like in practice and gesture at what to try, without being harsh.

Categories, in this exact order:
${categories.map(c => `${labelFor(c.categorySlug)}: ${c.averageRating.toFixed(1)}/5 (${c.responseCount} responses)`).join('\n')}

Respond with ONLY a valid JSON object, no markdown fences, no explanation. "categories" must contain exactly ${categories.length} entries, in the same order as the list above. Shape:
{"categories":[{"categorySlug":"...","text":"..."}]}`
```

Same cross-check discipline as Part 2: the model's `categorySlug` is ignored; slugs, ratings, and response counts always come from the aggregation, never the model.

## Part 4: Guidance module

**New file:** `web/src/lib/coach-dna/guidance.ts`

```ts
export interface GuidanceStep {
  heading: string
  body: string
  href: string | null
  linkLabel: string | null
}

export function buildGuidance(params: {
  hasAnyFeedbackRequest: boolean
  activeRequestsBelowThreshold: boolean
  hasBlendedFeedback: boolean
  focusCategories: string[] // categorySlugs currently tier === 'focus'
}): GuidanceStep[]
```

Rules, in priority order (returns the single most relevant step — one clear next action, not a checklist, per the "not a gimmick" direction):
1. `!params.hasAnyFeedbackRequest` → one step: "Request feedback from your players, parents, or a fellow coach to see how your self-view compares." → links to `/admin/coach-dna/feedback` ("Request feedback").
2. `params.activeRequestsBelowThreshold && !params.hasBlendedFeedback` → "You're close — a few more responses will unlock your full blended picture." → same link ("View feedback requests").
3. `params.hasBlendedFeedback` → if `focusCategories` is non-empty, exactly three steps, each naming the coach's top focus category (`focusCategories[0]`) so "this area" always has a clear referent: "Build a session that targets `${labelFor(focusCategories[0])}`" → `/sessions/new` ("Plan a session"); "Browse drills to develop your `${labelFor(focusCategories[0])}` skills" → `/drills` ("Browse drills"); "Talk `${labelFor(focusCategories[0])}` through with the AI coaching assistant" → `/chat/ai` ("Open AI chat"). All three link generically (no drill-category filter, per Scope) — only the copy references the category, not the URL. If `focusCategories` is empty (a coach who is `solid`/`strength` everywhere), returns a single affirming step with no link: "Every category is holding steady or better — keep the habits that got you here."
4. Fallback (blended feedback exists but somehow none of the above matched — defensive, should not occur given 1-3 are exhaustive over the boolean space): a single generic step pointing at `/admin/coach-dna` ("Back to Coach DNA").

No test-writing detail here (belongs in the plan) — this module is pure and synchronous, easy to unit test exhaustively over the boolean/array input space.

## Part 5: On-screen pages

**Modify:** `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`

Replaces the "Strengths" / "Focus areas" two-list layout with three labeled sections in tier order (Strengths → Solid ground → Focus areas), each rendering `summary.categories.filter(c => c.tier === X)`. Each category row shows: label, qualitative band + score (e.g. "Strong · 82/100" — band labels: `strength` → "Strong", `solid` → "Developing", `focus` → "Focus area", via a new `tierLabel(tier: CategoryTier): string` helper in a new `web/src/lib/coach-dna/tier-label.ts`, alongside the existing small single-purpose files like `source-label.ts`), the AI text, the existing `sourceTagFor` chip, and (focus tier only) the existing clickable resource list. Adds the `GuidanceStep` (Part 4) as a card below the category sections, using the coach's own `hasBlendedFeedback(summary.sourcedCategories)` and active-feedback-request state (fetched the same way the hub page already does).

**New file + directory:** `web/src/app/(app)/admin/coach-dna/feedback/summary/page.tsx`

Mirrors `/complete`'s structure for feedback: calls `ensureFreshFeedbackSummary(user.id)` (Part 3), renders "Player / Parent Voice" and "Peer Observation" as two sections, each listing its categories (label, `feedbackBandLabel` + rating, AI text, resources where attached) or a "not enough responses yet" state matching the PDF's copy. Same auth/role gate as every other Coach DNA page (`getUser()` → redirect `/login`; role admin/coach → redirect `/dashboard`).

**Modify:** `web/src/app/(app)/admin/coach-dna/page.tsx` (hub)

The condensed snapshot's strength/focus tiles switch from `summary.pros[0]`/`summary.cons[0]` to `summary.categories.find(c => c.tier === 'strength')`/`summary.categories.find(c => c.tier === 'focus')` (first of each in ranked order — same visual slot, just reading from the new shape). Adds a "View feedback breakdown" link (visible once `hasBlendedFeedback`) pointing at the new `/admin/coach-dna/feedback/summary` page, alongside the existing "View full breakdown" link and the `CoachDnaOutcomeReveal` trigger.

## Part 6: Trigger restyle

**Modify:** `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.tsx`

Drops the `animate-pulse`, the glow `shadow-[...]`, and the `Sparkles` icon. Copy changes from "Your outcome is ready" / "Get Your Report" to something calmer and specific, e.g. eyebrow "Coach DNA report" and button "Download your Coach DNA report" with just the `ArrowDown` icon retained as a simple affordance. Still ember-branded (background color, border) and still a clear, confident call-to-action — restrained, not stripped of identity.

## Part 7: Both PDFs — landscape, brand fonts, clickable links, layout

**Modify:** `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`

- `<Page size="A4" orientation="landscape" style={s.page}>`.
- Replace the "STRENGTHS" / "FOCUS AREAS" two-group layout with three tier groups (Strengths, Solid Ground, Focus Areas), each category shown as a card in a 2-column CSS-grid-like flex layout (`@react-pdf/renderer` doesn't have real CSS grid, so this is `flexDirection: 'row', flexWrap: 'wrap'` with each card at `width: '48%'`) — landscape width comfortably fits 2 columns without cramming.
- Each category card shows: label, qualitative band + score (via the same `tierLabel` helper from Part 5), the AI text, the existing source tag, and (focus tier only) resources.
- Resources render as real clickable PDF links: `@react-pdf/renderer` exports a `Link` component (`import { Link } from '@react-pdf/renderer'`) — `<Link src={resource.url} style={s.resourceTitle}>{resource.title}</Link>` in place of the current plain `<Text>`. A `null` `url` (none exist in `CATEGORY_RESOURCES` today, but the type allows it) falls back to plain `<Text>`, matching the on-screen page's existing `resource.url ?` conditional.
- Fonts: `Font.register({ family: 'Barlow Condensed', fonts: [{ src: <bold-italic TTF bytes> }] })` and `Font.register({ family: 'Geist', fonts: [{ src: <400 TTF bytes> }, { src: <700 TTF bytes>, fontWeight: 700 }] })`, called once at module load (registration is idempotent/cheap; `@react-pdf/renderer`'s `Font` is a global registry, not per-render). Font bytes are fetched the same way the deleted `google-font.ts` fetched them for `next/og` (Google Fonts CSS2 endpoint → parse `url(...)` → fetch the binary) — a **new**, small `web/src/lib/coach-dna/pdf-font.ts` module with a `loadPdfFont(query: string): Promise<Buffer>` helper (react-pdf's `Font.register` wants a `Buffer`/local path, not the raw `ArrayBuffer` `next/og` wanted, so this is a fresh implementation, not a revival of the deleted file). Both new PDF route handlers (`report-pdf`, `feedback-summary-pdf`) call `registerPdfFonts()` (a small wrapper in `pdf-font.ts` that does both `Font.register` calls, awaited, with a try/catch that logs and falls through to Helvetica on failure — matching the old card-image route's graceful degradation) before rendering.
- `s.page`/most text styles switch `fontFamily: 'Helvetica'` → `'Geist'`; headline-weight text (the coach-type title, group headings) switches to `'Barlow Condensed'` where the on-screen app also uses it, `'Helvetica-Bold'`/`'Geist'` at `fontWeight: 700` elsewhere.

**Modify:** `web/src/app/(app)/admin/coach-dna/FeedbackSummaryPDF.tsx`

- Same `orientation="landscape"` change.
- Same font registration (shared `registerPdfFonts()` from `pdf-font.ts`).
- Each section's categories render as cards (single column is fine here — typically far fewer categories per section than the self-assessment's fixed 8, so a 2-column grid isn't necessary, but the wider landscape page gives the AI text room to breathe without wrapping awkwardly) showing: label, `feedbackBandLabel` + rating, response count, the AI `text`, and resources (where attached) as real `Link`s.

**Modify:** both Route Handlers (`report-pdf/[attemptId]/route.tsx`, `feedback-summary-pdf/[attemptId]/route.tsx`)

Call `registerPdfFonts()` before `renderToBuffer`. `feedback-summary-pdf`'s route also switches from calling `computeFeedbackSummary` directly to calling `ensureFreshFeedbackSummary(user.id)` (Part 3), so the PDF and the new on-screen feedback page always agree.

## Security

- The new migration only adds nullable columns to an existing, already-RLS-protected table — no new attack surface.
- `ensureFreshFeedbackSummary` takes `coachId` from the same server-derived `user.id` every other Coach DNA entry point uses — never trusts a client-supplied id, consistent with `ensureFreshSummary`.
- The AI prompts (both) never receive or echo back anything user-authored (no free-text coach input goes into either prompt) — same low-injection-risk shape as the existing self-assessment prompt.
- Font fetching happens server-side against a fixed, hardcoded Google Fonts query string (not user input) — same trust boundary as the deleted `google-font.ts` had.

## Out of scope

- Any change to `computeCategoryScore`, `computeSelfOnlyCategoryScores`, `getCategoryWeights`, `getSourceThresholds`, or the live blended-score math.
- A real Coach-DNA-category → drill-category mapping (drill/session/chat guidance links are generic, not filtered).
- Any change to how feedback requests are created, moderated, or disputed.
- Retroactive regeneration for coaches who already have a cached summary in the old shape — they regenerate automatically, on-demand, the next time they view or download, via the existing staleness mechanism.
