# Admin App Performance Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only `/admin/performance` page inside the existing 18th Man app showing sign-up growth, product activity, revenue, and page-view traffic, plus the first-party page-view tracking that feeds the traffic section.

**Architecture:** A new admin sub-route following the exact structure of existing ones (`/admin/users`, `/admin/wellbeing`), reading through the app's existing service-role client so admin-only aggregate queries aren't limited by per-user RLS. Page-view tracking is a new table + a fire-and-forget client beacon + a route handler, all gated by RLS on insert (own row only) and select (admin only).

**Tech Stack:** Next.js App Router (Server Components), Supabase (service-role client for reads, RLS-gated table for writes), Recharts (already a project dependency), Vitest.

## Global Constraints

- Follow the existing admin sub-page auth-gate pattern exactly: fetch user via `createClient()` (`@/lib/supabase/server`), `redirect('/login')` if absent, fetch `profiles.role`, `redirect('/dashboard')` if not `'admin'`.
- All data queries on `/admin/performance` use the service-role client (`createServiceClient` from `@/lib/supabase/service`), not the per-request authenticated client — see the design spec's rationale (RLS gaps on `messages`).
- Every row-listing Supabase query is paginated past the default 1000-row PostgREST cap using a shared helper — never a bare unbounded `select()`.
- Every section of the page renders independently (its own `try`/`catch`, its own `<Suspense>` boundary with a skeleton fallback) — one failing query must never blank the rest of the page. JSX is constructed and returned *after* the `try`/`catch`, never inside it (matches this project's ESLint rules on that pattern).
- Revenue is formatted in GBP via `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })` — 18th Man charges in GBP.
- `clubs` and `products` are queried with explicit column lists, never `select('*')` (existing project security convention, upheld here even though the service-role client bypasses RLS/grants).
- Dark theme, zinc/orange (`#e8560a`) visual language matching the existing `/admin` pages — no shadcn Card primitives needed here, match the raw-div Tailwind style already used in `web/src/app/(app)/admin/page.tsx`.
- TypeScript strict mode (already project-wide), no `any` types.
- Pure aggregation/formatting functions are unit-tested with fixture data; page-level Server Components are not unit-tested (consistent with the rest of `/admin`).
- All commands below run from `web/` (the Next.js app root), e.g. `cd "c:/Users/nickj/18th Man/web"`.

---

### Task 1: `page_views` table migration

**Files:**
- Create: `web/supabase/migrations/082_page_views.sql`

**Interfaces:**
- Produces: `public.page_views(id uuid, path text, user_id uuid, created_at timestamptz)`, RLS policies `page_views_insert_own` (insert, own row only) and `page_views_select_admin` (select, admin only).

- [ ] **Step 1: Write the migration**

```sql
-- ── Page view tracking ────────────────────────────────────────────────────
-- First-party, lightweight page-view log for the admin performance section.
-- Write-once (insert only, own row), admin-read-only. See
-- docs/superpowers/specs/2026-08-02-admin-performance-dashboard-design.md.

create table public.page_views (
  id         uuid primary key default gen_random_uuid(),
  path       text not null,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index page_views_created_at_idx on public.page_views (created_at desc);
create index page_views_path_idx on public.page_views (path);

alter table public.page_views enable row level security;

create policy "page_views_insert_own"
  on public.page_views for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "page_views_select_admin"
  on public.page_views for select
  to authenticated
  using (public.is_admin());
```

- [ ] **Step 2: Apply the migration locally and confirm it runs cleanly**

```bash
cd "c:/Users/nickj/18th Man/web"
supabase db reset
```

Expected: migration `082_page_views.sql` applies with no errors (check the command output for `082_page_views.sql` in the applied-migrations list).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/082_page_views.sql
git commit -m "feat(db): add page_views table for admin traffic tracking"
```

---

### Task 2: Shared pagination helper

**Files:**
- Create: `web/src/lib/supabase/pagination.ts`
- Test: `web/src/lib/supabase/pagination.test.ts`

**Interfaces:**
- Produces: `fetchAllRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]>`

This is the fix for a bug found (and fixed) in an earlier, related standalone build: an unbounded `select()` against Supabase silently truncates at PostgREST's default 1000-row cap, with no error. Every row-listing fetcher in this plan uses this helper instead.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/lib/supabase/pagination.test.ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { fetchAllRows } from './pagination'

describe('fetchAllRows', () => {
  it('returns all rows from a single short page', async () => {
    const query = vi.fn(async (from: number, to: number) => {
      if (from > 0) return { data: [], error: null }
      return { data: [{ id: 1 }, { id: 2 }], error: null }
    })
    const rows = await fetchAllRows(query)
    expect(rows).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('pages through multiple full pages until a short page ends the loop', async () => {
    const page0 = Array.from({ length: 1000 }, (_, i) => ({ id: i }))
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: 1000 + i }))
    const page2 = [{ id: 2000 }]
    const query = vi.fn(async (from: number) => {
      if (from === 0) return { data: page0, error: null }
      if (from === 1000) return { data: page1, error: null }
      if (from === 2000) return { data: page2, error: null }
      return { data: [], error: null }
    })
    const rows = await fetchAllRows(query)
    expect(rows).toHaveLength(2001)
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('terminates cleanly when total rows is an exact multiple of the page size', async () => {
    const page0 = Array.from({ length: 1000 }, (_, i) => ({ id: i }))
    const query = vi.fn(async (from: number) => {
      if (from === 0) return { data: page0, error: null }
      return { data: [], error: null }
    })
    const rows = await fetchAllRows(query)
    expect(rows).toHaveLength(1000)
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('returns an empty array when there are no rows', async () => {
    const query = vi.fn(async () => ({ data: [], error: null }))
    const rows = await fetchAllRows(query)
    expect(rows).toEqual([])
  })

  it('treats a null data page as empty rather than throwing', async () => {
    const query = vi.fn(async () => ({ data: null, error: null }))
    const rows = await fetchAllRows(query)
    expect(rows).toEqual([])
  })

  it('throws with the underlying error message when a page errors', async () => {
    const query = vi.fn(async () => ({ data: null, error: { message: 'connection reset' } }))
    await expect(fetchAllRows(query)).rejects.toThrow('connection reset')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/supabase/pagination.test.ts
```

Expected: FAIL — `pagination.ts` does not exist yet.

- [ ] **Step 3: Implement**

```ts
// web/src/lib/supabase/pagination.ts
import 'server-only'

const PAGE_SIZE = 1000

type RangeQuery<T> = (
  from: number,
  to: number
) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>

export async function fetchAllRows<T>(query: RangeQuery<T>): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await query(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/supabase/pagination.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/pagination.ts src/lib/supabase/pagination.test.ts
git commit -m "feat: add fetchAllRows pagination helper"
```

---

### Task 3: Growth metrics — pure aggregation functions

**Files:**
- Create: `web/src/lib/metrics/growth.ts`
- Test: `web/src/lib/metrics/growth.test.ts`

**Interfaces:**
- Produces:
  - `type SignupRow = { created_at: string; role: 'admin' | 'coach' | 'viewer' }`
  - `aggregateSignupsByDay(rows: SignupRow[]): { date: string; count: number }[]`
  - `aggregateCumulativeUsers(rows: SignupRow[]): { date: string; total: number }[]`
  - `aggregateRoleBreakdown(rows: SignupRow[]): { role: string; count: number }[]`

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/metrics/growth.test.ts
import { describe, it, expect } from 'vitest'
import {
  aggregateSignupsByDay,
  aggregateCumulativeUsers,
  aggregateRoleBreakdown,
  type SignupRow,
} from './growth'

const rows: SignupRow[] = [
  { created_at: '2026-07-01T10:00:00Z', role: 'coach' },
  { created_at: '2026-07-01T14:00:00Z', role: 'viewer' },
  { created_at: '2026-07-02T09:00:00Z', role: 'coach' },
  { created_at: '2026-07-03T09:00:00Z', role: 'admin' },
]

describe('aggregateSignupsByDay', () => {
  it('groups sign-ups by calendar day, sorted ascending', () => {
    expect(aggregateSignupsByDay(rows)).toEqual([
      { date: '2026-07-01', count: 2 },
      { date: '2026-07-02', count: 1 },
      { date: '2026-07-03', count: 1 },
    ])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateSignupsByDay([])).toEqual([])
  })
})

describe('aggregateCumulativeUsers', () => {
  it('produces a running total by day', () => {
    expect(aggregateCumulativeUsers(rows)).toEqual([
      { date: '2026-07-01', total: 2 },
      { date: '2026-07-02', total: 3 },
      { date: '2026-07-03', total: 4 },
    ])
  })
})

describe('aggregateRoleBreakdown', () => {
  it('counts users per role', () => {
    expect(aggregateRoleBreakdown(rows)).toEqual([
      { role: 'admin', count: 1 },
      { role: 'coach', count: 2 },
      { role: 'viewer', count: 1 },
    ])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateRoleBreakdown([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/metrics/growth.test.ts
```

Expected: FAIL — `growth.ts` does not exist yet.

- [ ] **Step 3: Implement**

```ts
// web/src/lib/metrics/growth.ts
export type SignupRow = {
  created_at: string
  role: 'admin' | 'coach' | 'viewer'
}

function dayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

export function aggregateSignupsByDay(rows: SignupRow[]): { date: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = dayKey(row.created_at)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export function aggregateCumulativeUsers(rows: SignupRow[]): { date: string; total: number }[] {
  const byDay = aggregateSignupsByDay(rows)
  let running = 0
  return byDay.map(({ date, count }) => {
    running += count
    return { date, total: running }
  })
}

export function aggregateRoleBreakdown(rows: SignupRow[]): { role: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.role, (counts.get(row.role) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([role, count]) => ({ role, count }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/metrics/growth.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/metrics/growth.ts src/lib/metrics/growth.test.ts
git commit -m "feat: add growth metrics aggregation functions"
```

---

### Task 4: Activity metrics — pure aggregation function

**Files:**
- Create: `web/src/lib/metrics/activity.ts`
- Test: `web/src/lib/metrics/activity.test.ts`

**Interfaces:**
- Produces:
  - `type TimestampedRow = { created_at: string }`
  - `aggregateCountByDay(rows: TimestampedRow[]): { date: string; count: number }[]` — generic, reused for drills/session-plans/messages/page-views

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/metrics/activity.test.ts
import { describe, it, expect } from 'vitest'
import { aggregateCountByDay, type TimestampedRow } from './activity'

describe('aggregateCountByDay', () => {
  it('groups arbitrary timestamped rows by calendar day', () => {
    const rows: TimestampedRow[] = [
      { created_at: '2026-07-01T08:00:00Z' },
      { created_at: '2026-07-01T20:00:00Z' },
      { created_at: '2026-07-02T08:00:00Z' },
    ]
    expect(aggregateCountByDay(rows)).toEqual([
      { date: '2026-07-01', count: 2 },
      { date: '2026-07-02', count: 1 },
    ])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateCountByDay([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/metrics/activity.test.ts
```

Expected: FAIL — `activity.ts` does not exist yet.

- [ ] **Step 3: Implement**

```ts
// web/src/lib/metrics/activity.ts
export type TimestampedRow = { created_at: string }

function dayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

export function aggregateCountByDay(rows: TimestampedRow[]): { date: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = dayKey(row.created_at)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/metrics/activity.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/metrics/activity.ts src/lib/metrics/activity.test.ts
git commit -m "feat: add activity metrics aggregation function"
```

---

### Task 5: Revenue metrics — pure aggregation functions

**Files:**
- Create: `web/src/lib/metrics/revenue.ts`
- Test: `web/src/lib/metrics/revenue.test.ts`

**Interfaces:**
- Produces:
  - `type SubscriptionTier = 'free' | 'club' | 'coach'`
  - `type PurchaseRow = { created_at: string; amount_paid_cents: number; status: 'completed' | 'refunded'; product_id: string }`
  - `type ProductRow = { id: string; title: string }`
  - `type ClubRow = { subscription_tier: SubscriptionTier }`
  - `type ProfileSubscriptionRow = { subscription_tier: SubscriptionTier }`
  - `aggregateRevenueByDay(purchases: PurchaseRow[]): { date: string; cents: number }[]` — completed purchases only
  - `aggregateRevenueByProduct(purchases: PurchaseRow[], products: ProductRow[]): { productTitle: string; cents: number }[]` — completed purchases only, sorted by revenue descending
  - `countActiveClubSubscriptions(clubs: ClubRow[]): number` — counts `subscription_tier === 'club'`
  - `countActiveCoachSubscriptions(profiles: ProfileSubscriptionRow[]): number` — counts `subscription_tier === 'coach'`

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/metrics/revenue.test.ts
import { describe, it, expect } from 'vitest'
import {
  aggregateRevenueByDay,
  aggregateRevenueByProduct,
  countActiveClubSubscriptions,
  countActiveCoachSubscriptions,
  type PurchaseRow,
  type ProductRow,
  type ClubRow,
  type ProfileSubscriptionRow,
} from './revenue'

const purchases: PurchaseRow[] = [
  { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 500, status: 'completed', product_id: 'p1' },
  { created_at: '2026-07-01T12:00:00Z', amount_paid_cents: 1000, status: 'completed', product_id: 'p2' },
  { created_at: '2026-07-02T10:00:00Z', amount_paid_cents: 700, status: 'refunded', product_id: 'p1' },
]

const products: ProductRow[] = [
  { id: 'p1', title: 'Attack Shape Pack' },
  { id: 'p2', title: 'Defensive Drills Bundle' },
]

describe('aggregateRevenueByDay', () => {
  it('sums completed purchases by day, excluding refunds', () => {
    expect(aggregateRevenueByDay(purchases)).toEqual([{ date: '2026-07-01', cents: 1500 }])
  })

  it('returns an empty array when there are no completed purchases', () => {
    const onlyRefunded: PurchaseRow[] = [
      { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 500, status: 'refunded', product_id: 'p1' },
    ]
    expect(aggregateRevenueByDay(onlyRefunded)).toEqual([])
  })
})

describe('aggregateRevenueByProduct', () => {
  it('sums completed purchase revenue per product title, sorted by revenue descending', () => {
    expect(aggregateRevenueByProduct(purchases, products)).toEqual([
      { productTitle: 'Defensive Drills Bundle', cents: 1000 },
      { productTitle: 'Attack Shape Pack', cents: 500 },
    ])
  })

  it('breaks ties alphabetically by product title', () => {
    const tied: PurchaseRow[] = [
      { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 500, status: 'completed', product_id: 'p2' },
      { created_at: '2026-07-01T11:00:00Z', amount_paid_cents: 500, status: 'completed', product_id: 'p1' },
    ]
    expect(aggregateRevenueByProduct(tied, products)).toEqual([
      { productTitle: 'Attack Shape Pack', cents: 500 },
      { productTitle: 'Defensive Drills Bundle', cents: 500 },
    ])
  })

  it('falls back to the product id when no matching product is found', () => {
    const orphaned: PurchaseRow[] = [
      { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 300, status: 'completed', product_id: 'missing' },
    ]
    expect(aggregateRevenueByProduct(orphaned, products)).toEqual([
      { productTitle: 'missing', cents: 300 },
    ])
  })
})

describe('countActiveClubSubscriptions', () => {
  it('counts clubs on the club tier', () => {
    const clubs: ClubRow[] = [
      { subscription_tier: 'club' },
      { subscription_tier: 'free' },
      { subscription_tier: 'club' },
    ]
    expect(countActiveClubSubscriptions(clubs)).toBe(2)
  })

  it('returns 0 for no clubs', () => {
    expect(countActiveClubSubscriptions([])).toBe(0)
  })
})

describe('countActiveCoachSubscriptions', () => {
  it('counts profiles on the coach tier', () => {
    const profiles: ProfileSubscriptionRow[] = [
      { subscription_tier: 'coach' },
      { subscription_tier: 'free' },
      { subscription_tier: 'club' },
      { subscription_tier: 'coach' },
    ]
    expect(countActiveCoachSubscriptions(profiles)).toBe(2)
  })

  it('returns 0 for no profiles', () => {
    expect(countActiveCoachSubscriptions([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/metrics/revenue.test.ts
```

Expected: FAIL — `revenue.ts` does not exist yet.

- [ ] **Step 3: Implement**

```ts
// web/src/lib/metrics/revenue.ts
export type SubscriptionTier = 'free' | 'club' | 'coach'

export type PurchaseRow = {
  created_at: string
  amount_paid_cents: number
  status: 'completed' | 'refunded'
  product_id: string
}

export type ProductRow = { id: string; title: string }
export type ClubRow = { subscription_tier: SubscriptionTier }
export type ProfileSubscriptionRow = { subscription_tier: SubscriptionTier }

function dayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

export function aggregateRevenueByDay(purchases: PurchaseRow[]): { date: string; cents: number }[] {
  const totals = new Map<string, number>()
  for (const purchase of purchases) {
    if (purchase.status !== 'completed') continue
    const key = dayKey(purchase.created_at)
    totals.set(key, (totals.get(key) ?? 0) + purchase.amount_paid_cents)
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cents]) => ({ date, cents }))
}

export function aggregateRevenueByProduct(
  purchases: PurchaseRow[],
  products: ProductRow[]
): { productTitle: string; cents: number }[] {
  const titleById = new Map(products.map((p) => [p.id, p.title]))
  const totals = new Map<string, number>()
  for (const purchase of purchases) {
    if (purchase.status !== 'completed') continue
    const title = titleById.get(purchase.product_id) ?? purchase.product_id
    totals.set(title, (totals.get(title) ?? 0) + purchase.amount_paid_cents)
  }
  return [...totals.entries()]
    .sort(([aTitle, aCents], [bTitle, bCents]) => bCents - aCents || aTitle.localeCompare(bTitle))
    .map(([productTitle, cents]) => ({ productTitle, cents }))
}

export function countActiveClubSubscriptions(clubs: ClubRow[]): number {
  return clubs.filter((c) => c.subscription_tier === 'club').length
}

export function countActiveCoachSubscriptions(profiles: ProfileSubscriptionRow[]): number {
  return profiles.filter((p) => p.subscription_tier === 'coach').length
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/metrics/revenue.test.ts
```

Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/metrics/revenue.ts src/lib/metrics/revenue.test.ts
git commit -m "feat: add revenue metrics aggregation functions"
```

---

### Task 6: Page-view metrics, and shared currency formatting

**Files:**
- Create: `web/src/lib/metrics/pageviews.ts`
- Test: `web/src/lib/metrics/pageviews.test.ts`
- Create: `web/src/lib/format.ts`
- Test: `web/src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `type PageViewRow = { path: string; created_at: string }`
  - `aggregateTopPages(rows: PageViewRow[], limit?: number): { path: string; count: number }[]` — sorted by view count descending, default `limit = 10`
  - `formatCents(cents: number): string` — GBP-formatted, e.g. `formatCents(150000) === '£1,500.00'`

Note: day-bucketing of page views reuses `aggregateCountByDay` from `@/lib/metrics/activity` (Task 4) directly — `PageViewRow` has a `created_at` field, so it satisfies `TimestampedRow` structurally. No new day-bucketing function needed here.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/metrics/pageviews.test.ts
import { describe, it, expect } from 'vitest'
import { aggregateTopPages, type PageViewRow } from './pageviews'

const rows: PageViewRow[] = [
  { path: '/drills', created_at: '2026-07-01T10:00:00Z' },
  { path: '/drills', created_at: '2026-07-01T11:00:00Z' },
  { path: '/dashboard', created_at: '2026-07-01T12:00:00Z' },
  { path: '/drills', created_at: '2026-07-02T09:00:00Z' },
  { path: '/sessions', created_at: '2026-07-02T09:00:00Z' },
]

describe('aggregateTopPages', () => {
  it('ranks pages by view count, descending', () => {
    expect(aggregateTopPages(rows)).toEqual([
      { path: '/drills', count: 3 },
      { path: '/dashboard', count: 1 },
      { path: '/sessions', count: 1 },
    ])
  })

  it('respects the limit parameter', () => {
    expect(aggregateTopPages(rows, 1)).toEqual([{ path: '/drills', count: 3 }])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateTopPages([])).toEqual([])
  })
})
```

```ts
// web/src/lib/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatCents } from './format'

describe('formatCents', () => {
  it('formats whole pounds', () => {
    expect(formatCents(150000)).toBe('£1,500.00')
  })

  it('formats pence correctly', () => {
    expect(formatCents(1050)).toBe('£10.50')
  })

  it('formats zero', () => {
    expect(formatCents(0)).toBe('£0.00')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/metrics/pageviews.test.ts src/lib/format.test.ts
```

Expected: FAIL — neither file exists yet.

- [ ] **Step 3: Implement**

```ts
// web/src/lib/metrics/pageviews.ts
export type PageViewRow = { path: string; created_at: string }

export function aggregateTopPages(
  rows: PageViewRow[],
  limit: number = 10
): { path: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.path, (counts.get(row.path) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([path, count]) => ({ path, count }))
}
```

```ts
// web/src/lib/format.ts
const GBP_FORMATTER = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export function formatCents(cents: number): string {
  return GBP_FORMATTER.format(cents / 100)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/metrics/pageviews.test.ts src/lib/format.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/metrics/pageviews.ts src/lib/metrics/pageviews.test.ts src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add page-view aggregation and GBP currency formatting"
```

---

### Task 7: Admin-performance data fetchers

**Files:**
- Create: `web/src/app/(app)/admin/performance/data.ts`

**Interfaces:**
- Consumes: `createServiceClient` (`@/lib/supabase/service`, already exists), `fetchAllRows` (Task 2), `SignupRow` (Task 3), `TimestampedRow` (Task 4), `PurchaseRow`/`ProductRow`/`ClubRow`/`ProfileSubscriptionRow` (Task 5), `PageViewRow` (Task 6)
- Produces:
  - `getSignups(): Promise<SignupRow[]>`
  - `getDrillsCreated(): Promise<TimestampedRow[]>`
  - `getSessionPlansCreated(): Promise<TimestampedRow[]>`
  - `getMessagesSent(): Promise<TimestampedRow[]>`
  - `getPodcastPlayTotal(): Promise<number>`
  - `getPurchases(): Promise<PurchaseRow[]>`
  - `getProducts(): Promise<ProductRow[]>`
  - `getClubs(): Promise<ClubRow[]>`
  - `getProfileSubscriptions(): Promise<ProfileSubscriptionRow[]>`
  - `getPageViews(sinceDays?: number): Promise<PageViewRow[]>` — default `sinceDays = 30`

All fetchers order by `id` ascending for stable OFFSET pagination (a unique column — `created_at` alone isn't guaranteed unique and would let OFFSET pagination skip or duplicate rows across pages).

- [ ] **Step 1: Implement**

```ts
// web/src/app/(app)/admin/performance/data.ts
import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/supabase/pagination'
import type { SignupRow } from '@/lib/metrics/growth'
import type { TimestampedRow } from '@/lib/metrics/activity'
import type { PurchaseRow, ProductRow, ClubRow, ProfileSubscriptionRow } from '@/lib/metrics/revenue'
import type { PageViewRow } from '@/lib/metrics/pageviews'

export async function getSignups(): Promise<SignupRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<SignupRow>((from, to) =>
    supabase.from('profiles').select('created_at, role').order('id', { ascending: true }).range(from, to)
  )
}

export async function getDrillsCreated(): Promise<TimestampedRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase.from('drills').select('created_at').order('id', { ascending: true }).range(from, to)
  )
}

export async function getSessionPlansCreated(): Promise<TimestampedRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase.from('session_plans').select('created_at').order('id', { ascending: true }).range(from, to)
  )
}

export async function getMessagesSent(): Promise<TimestampedRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase.from('messages').select('created_at').order('id', { ascending: true }).range(from, to)
  )
}

export async function getPodcastPlayTotal(): Promise<number> {
  const supabase = createServiceClient()
  const rows = await fetchAllRows<{ play_count: number }>((from, to) =>
    supabase.from('podcasts').select('play_count').order('id', { ascending: true }).range(from, to)
  )
  return rows.reduce((sum, row) => sum + row.play_count, 0)
}

export async function getPurchases(): Promise<PurchaseRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<PurchaseRow>((from, to) =>
    supabase
      .from('purchases')
      .select('created_at, amount_paid_cents, status, product_id')
      .order('id', { ascending: true })
      .range(from, to)
  )
}

export async function getProducts(): Promise<ProductRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<ProductRow>((from, to) =>
    supabase.from('products').select('id, title').order('id', { ascending: true }).range(from, to)
  )
}

export async function getClubs(): Promise<ClubRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<ClubRow>((from, to) =>
    supabase.from('clubs').select('subscription_tier').order('id', { ascending: true }).range(from, to)
  )
}

export async function getProfileSubscriptions(): Promise<ProfileSubscriptionRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<ProfileSubscriptionRow>((from, to) =>
    supabase.from('profiles').select('subscription_tier').order('id', { ascending: true }).range(from, to)
  )
}

export async function getPageViews(sinceDays: number = 30): Promise<PageViewRow[]> {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
  return fetchAllRows<PageViewRow>((from, to) =>
    supabase
      .from('page_views')
      .select('path, created_at')
      .gte('created_at', since)
      .order('id', { ascending: true })
      .range(from, to)
  )
}
```

- [ ] **Step 2: Verify the app still builds**

```bash
npx tsc --noEmit
```

Expected: no new type errors (this file has no callers yet, so this only checks the file itself is well-typed).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/admin/performance/data.ts"
git commit -m "feat: add admin-performance data fetchers"
```

---

### Task 8: Shared UI components for the performance page

**Files:**
- Create: `web/src/app/(app)/admin/performance/components.tsx`

**Interfaces:**
- Produces:
  - `<StatTile label={string} value={string | number} />`
  - `<TimeSeriesChart data={{ date: string; value: number }[]} label={string} />`
  - `<TileSkeleton />`
  - `<ChartSkeleton />`
  - `<ErrorNote label={string} message={string} />`

Styling matches the existing `/admin` visual language (`web/src/app/(app)/admin/page.tsx`'s "Platform Stats" tiles) and the existing Recharts dark-theme conventions already used in `web/src/app/(app)/analyst/progression/components/PlayerDossier.tsx` (tick fill `#52525b`, tooltip background `#111113` / border `#27272a`, accent `#e8560a`) — reused verbatim rather than inventing new values.

- [ ] **Step 1: Implement**

```tsx
// web/src/app/(app)/admin/performance/components.tsx
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-2">{label}</p>
    </div>
  )
}

export function TileSkeleton() {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-[92px] animate-pulse" />
}

export function ChartSkeleton() {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-[280px] animate-pulse" />
}

export function ErrorNote({ label, message }: { label: string; message: string }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
      <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-red-400/80">{message}</p>
    </div>
  )
}

type Point = { date: string; value: number }

export function TimeSeriesChart({ data, label }: { data: Point[]; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">{label}</p>
      {data.length === 0 ? (
        <p className="text-sm text-zinc-600">No data yet for this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#52525b' }} />
            <YAxis tick={{ fontSize: 9, fill: '#52525b' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#111113',
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Line type="monotone" dataKey="value" stroke="#e8560a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the app still builds**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/admin/performance/components.tsx"
git commit -m "feat: add shared stat tile, chart, and skeleton components for admin performance page"
```

---

### Task 9: Growth and Activity sections

**Files:**
- Create: `web/src/app/(app)/admin/performance/GrowthSection.tsx`
- Create: `web/src/app/(app)/admin/performance/ActivitySection.tsx`

**Interfaces:**
- Consumes: `getSignups`, `getDrillsCreated`, `getSessionPlansCreated`, `getMessagesSent`, `getPodcastPlayTotal` (Task 7); `aggregateSignupsByDay`, `aggregateCumulativeUsers`, `aggregateRoleBreakdown` (Task 3); `aggregateCountByDay` (Task 4); `StatTile`, `TimeSeriesChart` (Task 8)
- Produces (each an independent `async` Server Component, so a later task can wrap each individually in its own `<Suspense>`):
  - From `GrowthSection.tsx`: `<RoleTiles />`, `<SignupsChart />`, `<CumulativeChart />`
  - From `ActivitySection.tsx`: `<DrillsChart />`, `<SessionPlansChart />`, `<MessagesChart />`, `<PodcastPlaysTile />`

Each component fetches its own data, catches its own errors, and builds/returns JSX only after its `try`/`catch` completes (not inside it) — this satisfies this project's ESLint rule against constructing JSX inside a `try` block, and is what makes per-section error isolation actually work.

- [ ] **Step 1: Implement `GrowthSection.tsx`**

```tsx
// web/src/app/(app)/admin/performance/GrowthSection.tsx
import { getSignups } from './data'
import { aggregateSignupsByDay, aggregateCumulativeUsers, aggregateRoleBreakdown } from '@/lib/metrics/growth'
import { StatTile, TimeSeriesChart, ErrorNote } from './components'

export async function RoleTiles() {
  let breakdown: { role: string; count: number }[] = []
  let errorMessage: string | null = null

  try {
    const signups = await getSignups()
    breakdown = aggregateRoleBreakdown(signups)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load sign-ups'
  }

  if (errorMessage) {
    return <ErrorNote label="Users by role" message={errorMessage} />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {breakdown.map((r) => (
        <StatTile key={r.role} label={`${r.role} accounts`} value={r.count} />
      ))}
    </div>
  )
}

export async function SignupsChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const signups = await getSignups()
    data = aggregateSignupsByDay(signups).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load sign-ups'
  }

  if (errorMessage) {
    return <ErrorNote label="Sign-ups per day" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Sign-ups per day" />
}

export async function CumulativeChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const signups = await getSignups()
    data = aggregateCumulativeUsers(signups).map((d) => ({ date: d.date, value: d.total }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load sign-ups'
  }

  if (errorMessage) {
    return <ErrorNote label="Cumulative users" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Cumulative users" />
}
```

- [ ] **Step 2: Implement `ActivitySection.tsx`**

```tsx
// web/src/app/(app)/admin/performance/ActivitySection.tsx
import { getDrillsCreated, getSessionPlansCreated, getMessagesSent, getPodcastPlayTotal } from './data'
import { aggregateCountByDay } from '@/lib/metrics/activity'
import { StatTile, TimeSeriesChart, ErrorNote } from './components'

export async function DrillsChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const rows = await getDrillsCreated()
    data = aggregateCountByDay(rows).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load drills'
  }

  if (errorMessage) {
    return <ErrorNote label="Drills created per day" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Drills created per day" />
}

export async function SessionPlansChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const rows = await getSessionPlansCreated()
    data = aggregateCountByDay(rows).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load session plans'
  }

  if (errorMessage) {
    return <ErrorNote label="Session plans created per day" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Session plans created per day" />
}

export async function MessagesChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const rows = await getMessagesSent()
    data = aggregateCountByDay(rows).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load messages'
  }

  if (errorMessage) {
    return <ErrorNote label="Messages (all types) per day" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Messages (all types) per day" />
}

export async function PodcastPlaysTile() {
  let total = 0
  let errorMessage: string | null = null

  try {
    total = await getPodcastPlayTotal()
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load podcast plays'
  }

  if (errorMessage) {
    return <ErrorNote label="Total podcast plays" message={errorMessage} />
  }

  return <StatTile label="Total podcast plays" value={total} />
}
```

- [ ] **Step 3: Verify the app still builds**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/admin/performance/GrowthSection.tsx" "src/app/(app)/admin/performance/ActivitySection.tsx"
git commit -m "feat: add Growth and Activity sections for admin performance page"
```

---

### Task 10: Revenue and Page Views sections

**Files:**
- Create: `web/src/app/(app)/admin/performance/RevenueSection.tsx`
- Create: `web/src/app/(app)/admin/performance/PageViewsSection.tsx`

**Interfaces:**
- Consumes: `getPurchases`, `getProducts`, `getClubs`, `getProfileSubscriptions`, `getPageViews` (Task 7); `aggregateRevenueByDay`, `aggregateRevenueByProduct`, `countActiveClubSubscriptions`, `countActiveCoachSubscriptions` (Task 5); `aggregateCountByDay` (Task 4); `aggregateTopPages` (Task 6); `formatCents` (Task 6); `StatTile`, `TimeSeriesChart`, `ErrorNote` (Task 8)
- Produces:
  - From `RevenueSection.tsx`: `<TotalRevenueTile />`, `<ActiveClubSubsTile />`, `<ActiveCoachSubsTile />`, `<RevenueByDayChart />`, `<RevenueByProductList />`
  - From `PageViewsSection.tsx`: `<PageViewsChart />`, `<TopPagesList />`

Each fetch is independent per component (matching Task 9's pattern) — `getPurchases()` is called by both `TotalRevenueTile` and `RevenueByDayChart`/`RevenueByProductList` independently rather than shared, since each component must be able to fail on its own without depending on a shared fetch outside its own `try`/`catch`.

- [ ] **Step 1: Implement `RevenueSection.tsx`**

```tsx
// web/src/app/(app)/admin/performance/RevenueSection.tsx
import { getPurchases, getProducts, getClubs, getProfileSubscriptions } from './data'
import {
  aggregateRevenueByDay,
  aggregateRevenueByProduct,
  countActiveClubSubscriptions,
  countActiveCoachSubscriptions,
} from '@/lib/metrics/revenue'
import { formatCents } from '@/lib/format'
import { StatTile, TimeSeriesChart, ErrorNote } from './components'

export async function TotalRevenueTile() {
  let total = 0
  let errorMessage: string | null = null

  try {
    const purchases = await getPurchases()
    total = purchases
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount_paid_cents, 0)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load purchases'
  }

  if (errorMessage) {
    return <ErrorNote label="Total revenue" message={errorMessage} />
  }

  return <StatTile label="Total revenue" value={formatCents(total)} />
}

export async function ActiveClubSubsTile() {
  let count = 0
  let errorMessage: string | null = null

  try {
    const clubs = await getClubs()
    count = countActiveClubSubscriptions(clubs)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load clubs'
  }

  if (errorMessage) {
    return <ErrorNote label="Active club subscriptions" message={errorMessage} />
  }

  return <StatTile label="Active club subscriptions" value={count} />
}

export async function ActiveCoachSubsTile() {
  let count = 0
  let errorMessage: string | null = null

  try {
    const profiles = await getProfileSubscriptions()
    count = countActiveCoachSubscriptions(profiles)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load coach subscriptions'
  }

  if (errorMessage) {
    return <ErrorNote label="Active Coach Pro subscriptions" message={errorMessage} />
  }

  return <StatTile label="Active Coach Pro subscriptions" value={count} />
}

export async function RevenueByDayChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const purchases = await getPurchases()
    data = aggregateRevenueByDay(purchases).map((d) => ({ date: d.date, value: d.cents / 100 }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load purchases'
  }

  if (errorMessage) {
    return <ErrorNote label="Revenue per day (£)" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Revenue per day (£)" />
}

export async function RevenueByProductList() {
  let breakdown: { productTitle: string; cents: number }[] = []
  let errorMessage: string | null = null

  try {
    const [purchases, products] = await Promise.all([getPurchases(), getProducts()])
    breakdown = aggregateRevenueByProduct(purchases, products)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load revenue by product'
  }

  if (errorMessage) {
    return <ErrorNote label="Revenue by product" message={errorMessage} />
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Revenue by product</p>
      {breakdown.length === 0 ? (
        <p className="text-sm text-zinc-600">No completed purchases yet.</p>
      ) : (
        <ul className="space-y-2">
          {breakdown.map((p) => (
            <li key={p.productTitle} className="flex justify-between text-sm text-zinc-300">
              <span>{p.productTitle}</span>
              <span className="font-semibold text-white">{formatCents(p.cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Implement `PageViewsSection.tsx`**

```tsx
// web/src/app/(app)/admin/performance/PageViewsSection.tsx
import { getPageViews } from './data'
import { aggregateCountByDay } from '@/lib/metrics/activity'
import { aggregateTopPages } from '@/lib/metrics/pageviews'
import { TimeSeriesChart, ErrorNote } from './components'

export async function PageViewsChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const views = await getPageViews()
    data = aggregateCountByDay(views).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load page views'
  }

  if (errorMessage) {
    return <ErrorNote label="Page views per day (last 30 days)" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Page views per day (last 30 days)" />
}

export async function TopPagesList() {
  let pages: { path: string; count: number }[] = []
  let errorMessage: string | null = null

  try {
    const views = await getPageViews()
    pages = aggregateTopPages(views, 10)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load page views'
  }

  if (errorMessage) {
    return <ErrorNote label="Top pages" message={errorMessage} />
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
        Top pages (last 30 days)
      </p>
      {pages.length === 0 ? (
        <p className="text-sm text-zinc-600">No page views recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li key={p.path} className="flex justify-between text-sm text-zinc-300">
              <span className="font-mono">{p.path}</span>
              <span className="font-semibold text-white">{p.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify the app still builds**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/admin/performance/RevenueSection.tsx" "src/app/(app)/admin/performance/PageViewsSection.tsx"
git commit -m "feat: add Revenue and Page Views sections for admin performance page"
```

---

### Task 11: Assemble the performance page, and link it from the admin index

**Files:**
- Create: `web/src/app/(app)/admin/performance/page.tsx`
- Modify: `web/src/app/(app)/admin/page.tsx`

**Interfaces:**
- Consumes: every exported component from `GrowthSection.tsx`, `ActivitySection.tsx`, `RevenueSection.tsx`, `PageViewsSection.tsx` (Tasks 9–10); `TileSkeleton`, `ChartSkeleton` (Task 8)

- [ ] **Step 1: Implement the page**

```tsx
// web/src/app/(app)/admin/performance/page.tsx
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { RoleTiles, SignupsChart, CumulativeChart } from './GrowthSection'
import { DrillsChart, SessionPlansChart, MessagesChart, PodcastPlaysTile } from './ActivitySection'
import {
  TotalRevenueTile,
  ActiveClubSubsTile,
  ActiveCoachSubsTile,
  RevenueByDayChart,
  RevenueByProductList,
} from './RevenueSection'
import { PageViewsChart, TopPagesList } from './PageViewsSection'
import { TileSkeleton, ChartSkeleton } from './components'

export const metadata = { title: 'App Performance — Admin' }

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">{children}</h2>
  )
}

export default async function AdminPerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-10 max-w-5xl">
      <div>
        <h1 className="app-heading text-2xl">App Performance</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Sign-ups, activity, revenue &amp; page traffic</p>
      </div>

      <section>
        <SectionHeading>Growth</SectionHeading>
        <div className="space-y-3">
          <Suspense fallback={<TileSkeleton />}>
            <RoleTiles />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <SignupsChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <CumulativeChart />
          </Suspense>
        </div>
      </section>

      <section>
        <SectionHeading>Activity</SectionHeading>
        <div className="space-y-3">
          <Suspense fallback={<TileSkeleton />}>
            <PodcastPlaysTile />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <DrillsChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <SessionPlansChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <MessagesChart />
          </Suspense>
        </div>
      </section>

      <section>
        <SectionHeading>Revenue</SectionHeading>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Suspense fallback={<TileSkeleton />}>
              <TotalRevenueTile />
            </Suspense>
            <Suspense fallback={<TileSkeleton />}>
              <ActiveClubSubsTile />
            </Suspense>
            <Suspense fallback={<TileSkeleton />}>
              <ActiveCoachSubsTile />
            </Suspense>
          </div>
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueByDayChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueByProductList />
          </Suspense>
        </div>
      </section>

      <section>
        <SectionHeading>Page Views</SectionHeading>
        <div className="space-y-3">
          <Suspense fallback={<ChartSkeleton />}>
            <PageViewsChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <TopPagesList />
          </Suspense>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Add the panel link on `/admin`**

In `web/src/app/(app)/admin/page.tsx`, add `LineChart` to the existing `lucide-react` import on line 4 (append it to the destructured list), then add a new entry to the `panels` array (after the `email` panel, before the closing `]`):

```tsx
    {
      href: '/admin/performance',
      icon: LineChart,
      label: 'App Performance',
      description: 'Sign-ups, activity, revenue & page views',
      colour: 'border-teal-500/20 hover:border-teal-500/40 text-teal-400',
    },
```

- [ ] **Step 3: Verify the app builds and lints clean**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both clean.

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Log in as an admin user, visit `/admin` and confirm the new "App Performance" panel appears and links to `/admin/performance`. Visit `/admin/performance` directly and confirm the page renders (real data if your local Supabase has any, otherwise empty/error states per section — not a crash). Log in as a non-admin (or visit while logged out) and confirm `/admin/performance` redirects away.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/admin/performance/page.tsx" "src/app/(app)/admin/page.tsx"
git commit -m "feat: assemble admin performance page and link it from the admin index"
```

---

### Task 12: Page-view tracking route handler

**Files:**
- Create: `web/src/app/api/track-page-view/route.ts`
- Test: `web/src/app/api/track-page-view/route.test.ts`

**Interfaces:**
- Consumes: `createClient` (`@/lib/supabase/server`, already exists)
- Produces: `POST` handler at `/api/track-page-view` — `204` on success or no-op (no authenticated user), `400` on a malformed body

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/app/api/track-page-view/route.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  insertError: { message: string } | null
} = { user: null, insertError: null }

const insertMock = vi.fn(async () => ({ error: state.insertError }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({ insert: insertMock }),
  }),
}))

import { POST } from './route'

function request(body: unknown): Request {
  return {
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input')
      return body
    },
  } as unknown as Request
}

describe('POST /api/track-page-view', () => {
  beforeEach(() => {
    state.user = { id: 'user-1' }
    state.insertError = null
    insertMock.mockClear()
  })

  it('returns 400 for a malformed body', async () => {
    const res = await POST(request(undefined))
    expect(res.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('returns 400 when path is missing or not a string', async () => {
    const res = await POST(request({ path: 42 }))
    expect(res.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('no-ops with 204 when there is no authenticated user', async () => {
    state.user = null
    const res = await POST(request({ path: '/dashboard' }))
    expect(res.status).toBe(204)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('inserts a page_views row scoped to the current user and returns 204', async () => {
    const res = await POST(request({ path: '/drills' }))
    expect(res.status).toBe(204)
    expect(insertMock).toHaveBeenCalledWith({ path: '/drills', user_id: 'user-1' })
  })

  it('still returns 204 if the insert itself fails (best-effort tracking)', async () => {
    state.insertError = { message: 'db unreachable' }
    const res = await POST(request({ path: '/drills' }))
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/api/track-page-view/route.test.ts
```

Expected: FAIL — `route.ts` does not exist yet.

- [ ] **Step 3: Implement**

```ts
// web/src/app/api/track-page-view/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let path: unknown

  try {
    const body = await request.json()
    path = body.path
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (typeof path !== 'string' || path.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse(null, { status: 204 })
  }

  // Best-effort tracking: never surface an insert failure to the beacon caller.
  await supabase.from('page_views').insert({ path, user_id: user.id })

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/api/track-page-view/route.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/track-page-view/route.ts" "src/app/api/track-page-view/route.test.ts"
git commit -m "feat: add page-view tracking route handler"
```

---

### Task 13: Page-view tracker client component, mounted in the app layout

**Files:**
- Create: `web/src/components/analytics/PageViewTracker.tsx`
- Modify: `web/src/app/(app)/layout.tsx`

**Interfaces:**
- Produces: `<PageViewTracker />` — renders nothing, fires a beacon to `/api/track-page-view` (Task 12) on mount and on every path change

- [ ] **Step 1: Implement the tracker**

```tsx
// web/src/components/analytics/PageViewTracker.tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    const payload = JSON.stringify({ path: pathname })

    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/track-page-view', blob)
    } else {
      fetch('/api/track-page-view', { method: 'POST', body: payload, keepalive: true })
    }
  }, [pathname])

  return null
}
```

- [ ] **Step 2: Mount it in the app layout**

In `web/src/app/(app)/layout.tsx`, add the import alongside the existing component imports:

```tsx
import { PageViewTracker } from '@/components/analytics/PageViewTracker'
```

Then render it once inside the returned tree, next to `<HelpWidget />` (both render nothing visible, so placement within the `SidebarProvider` tree doesn't affect layout):

```tsx
      <HelpWidget />
      <PageViewTracker />
```

- [ ] **Step 3: Verify the app builds and lints clean**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both clean. (`PageViewTracker`'s `useEffect` is a deliberate, documented exception to "don't use `useEffect` to fetch data" — it's a fire-and-forget analytics beacon, not a data fetch for rendering; see the design spec.)

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Log in, navigate between a couple of pages (e.g. `/dashboard` → `/drills`), then check the `page_views` table in your local Supabase Studio (or via `supabase db` / a quick `select * from page_views order by created_at desc limit 5;`) and confirm rows appeared with the right `path` and `user_id`.

- [ ] **Step 5: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass, including everything from Tasks 2–6 and 12.

- [ ] **Step 6: Commit**

```bash
git add "src/components/analytics/PageViewTracker.tsx" "src/app/(app)/layout.tsx"
git commit -m "feat: mount page-view tracker in the app layout"
```

---

## Self-Review Notes

- **Spec coverage:** Growth/Activity/Revenue/Page Views sections (Tasks 3–10), the admin auth gate and panel link (Task 11), the `page_views` table and RLS (Task 1), and the tracking beacon + route handler (Tasks 12–13) all map directly to the design spec's sections. The spec's "out of scope" items (historical export, alerting, anonymous tracking, device/referrer filtering) are correctly not implemented.
- **Carried-over correctness fixes:** this plan bakes in, from the start, three fixes that a related earlier build only found via code review: pagination past the 1000-row cap (Task 2, used everywhere in Task 7), GBP currency formatting (Task 6), and per-section `Suspense` + independent error handling on every section (Tasks 9–11) — rather than repeating the mistakes and needing another review pass to catch them.
- **Type consistency:** `SignupRow`, `TimestampedRow`, `PurchaseRow`/`ProductRow`/`ClubRow`/`ProfileSubscriptionRow`, and `PageViewRow` are each defined once (in their respective `lib/metrics/*.ts` file) and imported everywhere else — no redefinitions. `SubscriptionTier` is defined once in `revenue.ts` and shared by both `ClubRow` and `ProfileSubscriptionRow`.
- **Placeholder scan:** no TBD/TODO markers; every code block is complete, runnable code, not a description of code to write.
