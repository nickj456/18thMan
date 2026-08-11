# Coach DNA — Shareable Link Access (Testing Phase)

## Problem

The Coach DNA self-assessment currently requires the `admin` role to access — every route and server action under `web/src/app/(app)/admin/coach-dna/` redirects anyone else to `/dashboard`. This was a stand-in access gate during development. The owner wants to share a direct link with real coaches for testing: if they don't have an account, sign up; if they do, log in; either way land on the assessment afterward. The feature should not become publicly discoverable — no navigation entry, no announcement — just reachable by whoever has the link and an account.

## Scope

This is access-control and auth-redirect plumbing, not a change to the assessment itself. No new UI screens, no new database tables. Four things change:

1. The access gate on Coach DNA routes/actions loosens from `admin`-only to `coach` or `admin` (excludes `viewer`).
2. The anonymous-visitor redirect (in the auth middleware) preserves the original destination instead of dropping it.
3. Login carries that destination through sign-in and into the "create an account" link.
4. Signup carries it through email confirmation into the already-existing `next` handling in `/auth/callback`.

## Part 1: Loosen the access gate

**Files affected:** the 7 files under `web/src/app/(app)/admin/coach-dna/` that currently check `profile?.role !== 'admin'`:
- `page.tsx`
- `actions.ts`
- `pdf-actions.tsx`
- `summary-actions.ts`
- `assessment/[attemptId]/page.tsx`
- `assessment/[attemptId]/actions.ts`
- `assessment/[attemptId]/complete/page.tsx`

Each changes from:
```ts
if (profile?.role !== 'admin') redirect('/dashboard')
```
to:
```ts
if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')
```

No other role/auth logic in these files changes — the `if (!user) redirect('/login')` checks stay exactly as they are.

## Part 2: Preserve destination through the anonymous-visitor redirect

`src/lib/supabase/middleware.ts` currently redirects an unauthenticated visitor hitting any protected route straight to `/login`, dropping the path they were trying to reach:

```ts
if (isAppRoute && !user) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}
```

This changes to carry the original path as a `next` query param:

```ts
if (isAppRoute && !user) {
  const next = request.nextUrl.pathname + request.nextUrl.search
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = `?next=${encodeURIComponent(next)}`
  return NextResponse.redirect(url)
}
```

## Part 3: Login carries `next` through to sign-in and to signup

`src/app/(auth)/login/page.tsx` reads `next` from `searchParams` (alongside the existing `error`/`email`), passes it as a hidden form field on the email/password form, and appends it as a query param on the "Create one free" link to `/signup` — so a visitor who needs to sign up doesn't lose their destination.

`src/app/(auth)/login/actions.ts`'s `login()` action reads `next` from the submitted form data, validates it's a same-site relative path (starts with `/`, does not start with `//`), and redirects there on success instead of the hardcoded `/dashboard`. An invalid or missing `next` falls back to `/dashboard` — same behavior as today.

## Part 4: Signup carries `next` through email confirmation

`src/app/(auth)/signup/page.tsx` reads `next` from `searchParams`, passes it as a hidden form field.

`src/app/(auth)/signup/actions.ts`'s `signup()` action reads `next` from the submitted form data, validates it the same way as login, and appends it to the existing `emailRedirectTo` URL as a `next` query param:

```ts
emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
```

`src/app/auth/callback/route.ts` already reads `next` from its own query params and redirects there after exchanging the confirmation code (defaulting to `/dashboard` if absent) — no change needed there, this wires an existing capability up to a real caller for the first time.

## Security: open-redirect protection

Every point that reads a `next` value from user-controlled input (query param or form field) validates it before use: must start with `/`, must not start with `//` (protocol-relative URLs are a classic open-redirect vector — `//evil.com` is parsed by browsers as `https://evil.com`). A shared validation helper (`isSafeRedirectPath(path: string): boolean`) is used at every call site rather than duplicating the check inline four times.

`src/app/auth/callback/route.ts`'s existing `next` handling has no such validation today. This is a pre-existing gap this feature doesn't introduce, but since this work adds a second, third, and fourth caller that now feed user-controlled `next` values into that same code path, the callback route also gets the same validation applied, closing the gap rather than propagating it further.

## Out of scope

- Any UI change to the assessment itself, the results page, PDF, or email.
- Adding Coach DNA to the sidebar navigation (deliberately not done — this is what keeps it "not released").
- A dedicated invite/allowlist mechanism beyond the role check — `coach` or `admin` role is the entire access control for this testing phase.
- Hardening `next`-style redirects anywhere else in the app outside the auth flow touched here.
