# Drill Ratings Visibility

**Date:** 2026-06-02
**Status:** Approved

## Problem

Coaches can leave star ratings and comments on drills, but the ratings don't surface properly in two places:

1. **Detail page** — ratings are fetched and rendered, but reviewer names and avatars are always null because the query uses the wrong Supabase foreign-key hint (`drills_author_id_fkey` instead of `drill_ratings_user_id_fkey`). Reviewers appear as "Coach" with a blank avatar.
2. **Library page** — ratings are not fetched at all. `DrillCard` accepts an `avgRating` prop but receives nothing, so no star rating appears on any card.

## Goal

- Reviewer identity (name + avatar) shows correctly on the drill detail page.
- Drill library cards show ⭐ avg rating and comment count when ratings exist.
- Club drills (collapsed section) get the same treatment.
- Cards with no ratings are unchanged — no empty stars, no "0 comments".

## Approach

**Option A — nested select (chosen).** Add `drill_ratings(rating, comment)` to the existing drills queries; compute aggregates in the page component. No migration, no new DB objects.

## Changes

### 1. Bug fix — detail page reviewer identity

**File:** `web/src/app/(discover)/drills/[id]/page.tsx`

Change the ratings query from:
```ts
.select(`*, author:profiles!drills_author_id_fkey(id, username, display_name, avatar_url)`)
```
to:
```ts
.select(`*, rater:profiles!drill_ratings_user_id_fkey(id, username, display_name, avatar_url)`)
```

Update the `RatingCard` call to read from `r.rater` instead of `r.author`. The `userRating` lookup already uses `r.user_id` so it is unaffected.

### 2. Type update — DrillWithRelations

**File:** `web/src/lib/supabase/types.ts`

Add `drill_ratings` to `DrillWithRelations`:
```ts
export interface DrillWithRelations extends Drill {
  category: DrillCategory | null
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
  drill_ratings?: { rating: number | null; comment: string | null }[]
}
```

### 3. Library query — add nested ratings

**File:** `web/src/app/(discover)/drills/page.tsx`

In `buildDrillQuery`, append to the select string:
```
drill_ratings!drill_ratings_drill_id_fkey ( rating, comment )
```

Apply the same addition to the club drills query (the second item in `Promise.all`).

### 4. Page aggregation — compute avgRating and commentCount

**File:** `web/src/app/(discover)/drills/page.tsx`

After fetching drills, compute per-drill stats before rendering:

```ts
function drillStats(drill: DrillWithRelations) {
  const ratingRows = drill.drill_ratings ?? []
  const scored = ratingRows.filter(r => r.rating != null)
  const avgRating = scored.length
    ? scored.reduce((s, r) => s + r.rating!, 0) / scored.length
    : undefined
  const commentCount = ratingRows.filter(r => r.comment?.trim()).length
  return { avgRating, commentCount }
}
```

Pass the result into each `DrillCard` call.

### 5. DrillCard — add commentCount prop

**File:** `web/src/components/drills/DrillCard.tsx`

Add `commentCount?: number` to `DrillCardProps`. In the footer, extend the existing rating display:

```tsx
{(avgRating !== undefined || (commentCount ?? 0) > 0) && (
  <span className="flex items-center gap-1">
    <Star className="size-3 fill-amber-400 text-amber-400" />
    {avgRating?.toFixed(1) ?? '—'}
    {commentCount ? <span className="text-muted-foreground">· {commentCount}</span> : null}
  </span>
)}
```

### 6. CollapsiblePrivateDrills — pass props through

**File:** `web/src/components/drills/CollapsiblePrivateDrills.tsx`

This component renders `DrillCard` for club drills. Update it to accept and forward `avgRating` and `commentCount` computed from each drill's `drill_ratings` array, using the same `drillStats` helper.

## Data flow

```
Supabase → drills + drill_ratings[]
  → page computes { avgRating, commentCount } per drill
    → DrillCard renders ⭐ 4.8 · 3 in footer
```

## Out of scope

- Sorting the library by rating (already handled by `min_rating` filter + `drill_ids_above_rating` RPC).
- Showing comment text on library cards (user chose score + count only).
- Paginating ratings on the detail page.
- Any migration or new DB objects.
