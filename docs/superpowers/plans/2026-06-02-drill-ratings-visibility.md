# Drill Ratings Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix reviewer identity on the drill detail page and show avg star rating + comment count on drill library cards.

**Architecture:** Nested Supabase select fetches `drill_ratings(rating, comment)` alongside each drill; a shared pure helper `drillStats` computes avg and count from that array; `DrillCard` renders the result in its footer. One FK hint fix unblocks reviewer name/avatar on the detail page.

**Tech Stack:** Next.js App Router, Supabase JS v2, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.

---

## File map

| File | Action | Purpose |
|------|--------|---------|
| `web/src/lib/supabase/types.ts` | Modify | Add `drill_ratings` field to `DrillWithRelations` |
| `web/src/lib/drills.ts` | Create | `drillStats` pure helper |
| `web/src/app/(discover)/drills/[id]/page.tsx` | Modify | Fix FK hint; read from `r.rater` |
| `web/src/app/(discover)/drills/page.tsx` | Modify | Add ratings to both drill queries; pass stats to DrillCard |
| `web/src/components/drills/DrillCard.tsx` | Modify | Accept + render `commentCount` |
| `web/src/components/drills/CollapsiblePrivateDrills.tsx` | Modify | Compute + pass stats to DrillCard |

---

## Task 1: Add drill_ratings to DrillWithRelations type

**Files:**
- Modify: `web/src/lib/supabase/types.ts:324-327`

- [ ] **Step 1: Update the type**

Open `web/src/lib/supabase/types.ts`. Find the `DrillWithRelations` interface (around line 324) and add the `drill_ratings` field:

```ts
export interface DrillWithRelations extends Drill {
  category: DrillCategory | null
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
  drill_ratings?: { rating: number | null; comment: string | null }[]
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors (there may be pre-existing ones; they should not increase).

- [ ] **Step 3: Commit**

```bash
cd web && git add src/lib/supabase/types.ts
git commit -m "feat: add drill_ratings to DrillWithRelations type"
```

---

## Task 2: Create drillStats helper

**Files:**
- Create: `web/src/lib/drills.ts`

- [ ] **Step 1: Create the file**

Create `web/src/lib/drills.ts` with this exact content:

```ts
import type { DrillWithRelations } from '@/lib/supabase/types'

export function drillStats(drill: Pick<DrillWithRelations, 'drill_ratings'>) {
  const rows = drill.drill_ratings ?? []
  const scored = rows.filter(r => r.rating != null)
  const avgRating = scored.length
    ? scored.reduce((s, r) => s + r.rating!, 0) / scored.length
    : undefined
  const commentCount = rows.filter(r => r.comment?.trim()).length
  return { avgRating, commentCount }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd web && git add src/lib/drills.ts
git commit -m "feat: add drillStats helper"
```

---

## Task 3: Fix reviewer identity on drill detail page

The ratings query currently uses `profiles!drills_author_id_fkey` — the FK that points from the `drills` table to `profiles`. That FK doesn't exist on `drill_ratings`, so the join silently returns null and every reviewer shows as "Coach". The correct FK is `drill_ratings_user_id_fkey`.

**Files:**
- Modify: `web/src/app/(discover)/drills/[id]/page.tsx:83-85`

- [ ] **Step 1: Fix the FK hint in the ratings query**

Find the `ratingsResult` query (inside `Promise.all`, around line 83):

```ts
// BEFORE
supabase
  .from('drill_ratings')
  .select(`*, author:profiles!drills_author_id_fkey(id, username, display_name, avatar_url)`)
  .eq('drill_id', id)
  .order('created_at', { ascending: false }),
```

Change it to:

```ts
// AFTER
supabase
  .from('drill_ratings')
  .select(`*, rater:profiles!drill_ratings_user_id_fkey(id, username, display_name, avatar_url)`)
  .eq('drill_id', id)
  .order('created_at', { ascending: false }),
```

- [ ] **Step 2: Update RatingCard calls to use `r.rater`**

Find the section that renders `RatingCard` components (around line 350). The current code reads from `r.author`; change every reference to `r.rater`:

```tsx
// BEFORE
{ratings.map(r => (
  <RatingCard
    key={r.id}
    displayName={r.author?.display_name ?? null}
    username={r.author?.username ?? null}
    avatarUrl={r.author?.avatar_url ?? null}
    rating={r.rating ?? null}
    comment={r.comment ?? null}
  />
))}

// AFTER
{ratings.map(r => (
  <RatingCard
    key={r.id}
    displayName={(r.rater as { display_name?: string } | null)?.display_name ?? null}
    username={(r.rater as { username?: string } | null)?.username ?? null}
    avatarUrl={(r.rater as { avatar_url?: string } | null)?.avatar_url ?? null}
    rating={r.rating ?? null}
    comment={r.comment ?? null}
  />
))}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd web && git add src/app/\(discover\)/drills/\[id\]/page.tsx
git commit -m "fix: use correct FK hint for drill ratings author join"
```

---

## Task 4: Add ratings to the library queries

**Files:**
- Modify: `web/src/app/(discover)/drills/page.tsx`

- [ ] **Step 1: Add ratings to the public drills query**

In `buildDrillQuery` (bottom of the file), find the `.select(...)` call. Add `drill_ratings!drill_ratings_drill_id_fkey ( rating, comment )` as the last field:

```ts
async function buildDrillQuery(supabase: Awaited<ReturnType<typeof createClient>>, filters: DrillFiltersType) {
  let query = supabase
    .from('drills')
    .select(`
      id,
      title,
      description,
      difficulty,
      age_group,
      player_count,
      preview_image_url,
      youtube_url,
      is_public,
      created_at,
      category_id,
      author_id,
      approval_status,
      category:drill_categories ( id, name, slug ),
      author:profiles!drills_author_id_fkey ( id, username, display_name, avatar_url ),
      drill_ratings!drill_ratings_drill_id_fkey ( rating, comment )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  // ... rest of function unchanged
```

- [ ] **Step 2: Add ratings to the club drills query**

Find the club drills query inside `Promise.all` (the second item). Add `drill_ratings!drill_ratings_drill_id_fkey ( rating, comment )` to its select:

```ts
supabase
  .from('drills')
  .select(`
    id, title, description, difficulty, age_group, player_count,
    preview_image_url, canvas_preview_url, youtube_url, tiktok_url,
    facebook_url, is_public, club_id, created_at, canvas_json,
    category_id, author_id, ai_guide, updated_at, approval_status,
    category:drill_categories ( id, name, slug ),
    author:profiles!drills_author_id_fkey ( id, username, display_name, avatar_url ),
    drill_ratings!drill_ratings_drill_id_fkey ( rating, comment )
  `)
  .eq('club_id', userClubId)
  .order('created_at', { ascending: false })
```

- [ ] **Step 3: Pass avgRating and commentCount to public DrillCards**

In the JSX that renders public drills (the grid around line 130), import `drillStats` and use it:

At the top of the file add the import:
```ts
import { drillStats } from '@/lib/drills'
```

Then update the grid:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
  {drills.map(drill => {
    const { avgRating, commentCount } = drillStats(drill)
    return (
      <DrillCard
        key={drill.id}
        drill={drill}
        avgRating={avgRating}
        commentCount={commentCount}
      />
    )
  })}
</div>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
cd web && git add src/app/\(discover\)/drills/page.tsx
git commit -m "feat: add drill_ratings to library queries and pass stats to DrillCard"
```

---

## Task 5: Update DrillCard to accept and render commentCount

**Files:**
- Modify: `web/src/components/drills/DrillCard.tsx`

- [ ] **Step 1: Add commentCount to DrillCardProps**

Find the `DrillCardProps` interface (around line 27):

```ts
// BEFORE
interface DrillCardProps {
  drill: DrillWithRelations
  avgRating?: number
  showClubBadge?: boolean
}

// AFTER
interface DrillCardProps {
  drill: DrillWithRelations
  avgRating?: number
  commentCount?: number
  showClubBadge?: boolean
}
```

- [ ] **Step 2: Destructure commentCount in the component**

Find the function signature (line 33):

```ts
// BEFORE
export function DrillCard({ drill, avgRating, showClubBadge }: DrillCardProps) {

// AFTER
export function DrillCard({ drill, avgRating, commentCount, showClubBadge }: DrillCardProps) {
```

- [ ] **Step 3: Update the footer rating display**

Find the footer section (around line 125). Replace the existing rating snippet:

```tsx
// BEFORE
{avgRating !== undefined && (
  <span className="flex items-center gap-1">
    <Star className="size-3 fill-amber-400 text-amber-400" />
    {avgRating.toFixed(1)}
  </span>
)}

// AFTER
{(avgRating !== undefined || (commentCount ?? 0) > 0) && (
  <span className="flex items-center gap-1">
    <Star className="size-3 fill-amber-400 text-amber-400" />
    {avgRating !== undefined ? avgRating.toFixed(1) : '—'}
    {(commentCount ?? 0) > 0 && (
      <span className="text-muted-foreground">· {commentCount}</span>
    )}
  </span>
)}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
cd web && git add src/components/drills/DrillCard.tsx
git commit -m "feat: DrillCard shows comment count alongside avg rating"
```

---

## Task 6: Update CollapsiblePrivateDrills to pass stats

**Files:**
- Modify: `web/src/components/drills/CollapsiblePrivateDrills.tsx`

- [ ] **Step 1: Import drillStats**

At the top of `web/src/components/drills/CollapsiblePrivateDrills.tsx`, add:

```ts
import { drillStats } from '@/lib/drills'
```

- [ ] **Step 2: Compute and pass stats per drill**

Find the `drills.map` in the grid (around line 33). Update it to compute stats and pass them:

```tsx
// BEFORE
{drills.map(drill => (
  <DrillCard key={drill.id} drill={drill} showClubBadge />
))}

// AFTER
{drills.map(drill => {
  const { avgRating, commentCount } = drillStats(drill)
  return (
    <DrillCard
      key={drill.id}
      drill={drill}
      avgRating={avgRating}
      commentCount={commentCount}
      showClubBadge
    />
  )
})}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd web && git add src/components/drills/CollapsiblePrivateDrills.tsx
git commit -m "feat: CollapsiblePrivateDrills passes avg rating and comment count to DrillCard"
```

---

## Task 7: Verify end-to-end in the browser

- [ ] **Step 1: Start the dev server**

```bash
cd web && npm run dev
```

- [ ] **Step 2: Check the drill detail page**

Navigate to a drill that has ratings (e.g., search for "Carry" or any drill Nick Johnson rated). Open the Ratings & Comments section and verify:
- Each rating card shows the reviewer's actual name and avatar (not "Coach" with blank avatar)
- Star rating and comment are still visible

- [ ] **Step 3: Check the drill library**

Navigate to `/drills`. Verify:
- Drills that have at least one rating show ⭐ avg · N in the card footer
- Drills with no ratings show no star widget at all (footer just shows player count + author)
- Drills with ratings but no comments show ⭐ avg with no comment count

- [ ] **Step 4: Check club drills section (if applicable)**

If you belong to a club, expand the club drills section and verify cards show ratings the same way.

- [ ] **Step 5: Final commit (if any last-minute fixes were needed)**

```bash
cd web && git add -p && git commit -m "fix: drill ratings visibility final tweaks"
```

Only needed if you made changes during browser verification. Skip if everything worked first time.
