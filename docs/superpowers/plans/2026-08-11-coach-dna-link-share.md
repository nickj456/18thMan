# Coach DNA Shareable Link Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner share a direct link to the Coach DNA self-assessment with real coaches for testing — an anonymous visitor is routed through sign-up or login and lands back on the assessment afterward — without adding it to navigation or opening it to every user.

**Architecture:** A pure `isSafeRedirectPath` helper guards every place a `next` destination is read from user input, preventing open redirects. The auth middleware preserves the original destination as a `next` query param when bouncing an anonymous visitor to `/login`. Login and signup forms carry `next` through to their server actions, which redirect there (or, for signup, thread it into the email-confirmation link) instead of the hardcoded `/dashboard`. The existing `/auth/callback` route already redirects to a `next` param after email confirmation — this plan adds validation to it and gives it real callers for the first time. Finally, the Coach DNA access gate loosens from `admin`-only to `coach` or `admin`.

**Tech Stack:** Next.js App Router (Server Components, Server Actions, middleware/proxy), Supabase Auth, Vitest.

## Global Constraints

- Every place a `next` value is read from a query param or form field (untrusted input) must validate it with `isSafeRedirectPath` before ever passing it to `redirect()` or `NextResponse.redirect()`. Never trust `next` without validation, including inside `/auth/callback`, which already reads one today.
- A `next` value that fails validation (or is absent) falls back to the existing default (`/dashboard`) — never throws, never 500s.
- Coach DNA does not get added to the sidebar navigation as part of this plan — staying unlisted is what keeps the feature "not fully released."
- Only the `coach` and `admin` roles gain access to Coach DNA; `viewer` stays locked out.
- All web app commands run from `web/`.

---

### Task 1: `isSafeRedirectPath` helper

**Files:**
- Create: `web/src/lib/redirect-safety.ts`
- Create: `web/src/lib/redirect-safety.test.ts`

**Interfaces:**
- Produces: `isSafeRedirectPath(path: string | null | undefined): path is string` — consumed by Tasks 3, 4, 5.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/redirect-safety.test.ts
import { describe, it, expect } from 'vitest'
import { isSafeRedirectPath } from './redirect-safety'

describe('isSafeRedirectPath', () => {
  it('accepts a plain relative path', () => {
    expect(isSafeRedirectPath('/admin/coach-dna')).toBe(true)
  })

  it('accepts a relative path with a query string', () => {
    expect(isSafeRedirectPath('/admin/coach-dna/assessment/abc-123?q=5')).toBe(true)
  })

  it('rejects a protocol-relative path (open-redirect vector)', () => {
    expect(isSafeRedirectPath('//evil.com')).toBe(false)
  })

  it('rejects an absolute URL', () => {
    expect(isSafeRedirectPath('https://evil.com')).toBe(false)
  })

  it('rejects a backslash-based bypass attempt', () => {
    expect(isSafeRedirectPath('/\\evil.com')).toBe(false)
  })

  it('rejects a path with no leading slash', () => {
    expect(isSafeRedirectPath('admin/coach-dna')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isSafeRedirectPath('')).toBe(false)
  })

  it('rejects null and undefined', () => {
    expect(isSafeRedirectPath(null)).toBe(false)
    expect(isSafeRedirectPath(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/lib/redirect-safety.test.ts`
Expected: FAIL — `./redirect-safety` does not exist yet.

- [ ] **Step 3: Write the helper**

```ts
// web/src/lib/redirect-safety.ts
// Guards every place a redirect destination is read from user-controlled
// input (a query param or form field) before it reaches redirect() or
// NextResponse.redirect(). Never pass an unvalidated `next` value to either.

/** True if `path` is safe to redirect to: a same-site relative path, never
 *  an absolute URL or a protocol-relative one (`//evil.com` is parsed by
 *  browsers as `https://evil.com`). Also rejects a leading backslash, since
 *  some browsers normalize `/\evil.com` to `//evil.com`. */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (typeof path !== 'string' || path.length === 0) return false
  if (!path.startsWith('/')) return false
  const normalized = path.replace(/\\/g, '/')
  if (normalized.startsWith('//')) return false
  return true
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/lib/redirect-safety.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/redirect-safety.ts web/src/lib/redirect-safety.test.ts
git commit -m "feat(auth): add isSafeRedirectPath guard for next-param redirects"
```

---

### Task 2: Preserve destination through the anonymous-visitor redirect

**Files:**
- Modify: `web/src/lib/supabase/middleware.ts`

**Interfaces:**
- None — this task only changes what query param is attached to an already-existing redirect. No test file: this codebase has no established pattern for testing Next.js middleware (confirmed no existing `middleware.test.ts`/`proxy.test.ts` anywhere in the repo), and the value written here is validated on the read side in Tasks 3-5, not here. Coverage for this task comes from Task 8's manual QA step.

- [ ] **Step 1: Update the redirect**

In `web/src/lib/supabase/middleware.ts`, replace:

```ts
  if (isAppRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
```

with:

```ts
  if (isAppRoute && !user) {
    const next = request.nextUrl.pathname + request.nextUrl.search
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(next)}`
    return NextResponse.redirect(url)
  }
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/supabase/middleware.ts
git commit -m "feat(auth): preserve original destination as a next param on the anonymous-visitor redirect"
```

---

### Task 3: Login carries `next` through sign-in and into signup

**Files:**
- Modify: `web/src/app/(auth)/login/page.tsx`
- Modify: `web/src/app/(auth)/login/actions.ts`
- Create: `web/src/app/(auth)/login/actions.test.ts`

**Interfaces:**
- Consumes: `isSafeRedirectPath` (Task 1).
- Produces (changed signature): `loginWithOAuth(provider: 'google' | 'facebook' | 'github', formData: FormData)` — was `(provider)` only. Bound via `.bind(null, provider)` on a form action, Next.js already supplies the form's `FormData` as the next argument automatically, so this is a compatible change, not a breaking one for the existing `<form action={loginWithOAuth.bind(null, 'google')}>` call site in `page.tsx`.

- [ ] **Step 1: Update `login/page.tsx`**

Replace the component signature:

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>
}) {
  const { error, email } = await searchParams
```

with:

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; next?: string }>
}) {
  const { error, email, next } = await searchParams
```

Replace the Google sign-in form:

```tsx
      {/* Google sign-in */}
      <form action={loginWithOAuth.bind(null, 'google')}>
        <button type="submit" className="auth-google-btn">
```

with:

```tsx
      {/* Google sign-in */}
      <form action={loginWithOAuth.bind(null, 'google')}>
        {next && <input type="hidden" name="next" value={next} />}
        <button type="submit" className="auth-google-btn">
```

Replace the email/password form's opening tag:

```tsx
      {/* Email/password form */}
      <form action={login}>
        <div className="auth-field">
```

with:

```tsx
      {/* Email/password form */}
      <form action={login}>
        {next && <input type="hidden" name="next" value={next} />}
        <div className="auth-field">
```

Replace the footer's signup link:

```tsx
      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link href="/signup">Create one free</Link>
      </p>
```

with:

```tsx
      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}>Create one free</Link>
      </p>
```

- [ ] **Step 2: Write the failing tests**

```ts
// web/src/app/(auth)/login/actions.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  signInError: { message: string } | null
  oauthError: { message: string } | null
  oauthUrl: string | null
} = { signInError: null, oauthError: null, oauthUrl: null }

const revalidatePathMock = vi.fn()
const signInWithPasswordMock = vi.fn(async () => ({ error: state.signInError }))
const signInWithOAuthMock = vi.fn(async () => ({ data: { url: state.oauthUrl }, error: state.oauthError }))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signInWithOAuth: signInWithOAuthMock,
    },
  }),
}))

import { login, loginWithOAuth } from './actions'

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('login', () => {
  beforeEach(() => {
    state.signInError = null
    revalidatePathMock.mockClear()
    signInWithPasswordMock.mockClear()
  })

  it('redirects to the safe next path on success', async () => {
    await expect(
      login(formData({ email: 'coach@example.com', password: 'secret123', next: '/admin/coach-dna' })),
    ).rejects.toThrow('REDIRECT:/admin/coach-dna')
  })

  it('falls back to /dashboard when next is missing', async () => {
    await expect(
      login(formData({ email: 'coach@example.com', password: 'secret123' })),
    ).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('falls back to /dashboard when next is an unsafe absolute URL', async () => {
    await expect(
      login(formData({ email: 'coach@example.com', password: 'secret123', next: 'https://evil.com' })),
    ).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('preserves a safe next through the error-redirect path', async () => {
    state.signInError = { message: 'Invalid credentials' }
    await expect(
      login(formData({ email: 'coach@example.com', password: 'wrong', next: '/admin/coach-dna' })),
    ).rejects.toThrow(/next=%2Fadmin%2Fcoach-dna/)
  })

  it('does not add a next param to the error redirect when next is unsafe', async () => {
    state.signInError = { message: 'Invalid credentials' }
    await expect(
      login(formData({ email: 'coach@example.com', password: 'wrong', next: '//evil.com' })),
    ).rejects.not.toThrow(/next=/)
  })
})

describe('loginWithOAuth', () => {
  beforeEach(() => {
    state.oauthError = null
    state.oauthUrl = 'https://accounts.google.com/o/oauth2/auth?foo=bar'
    signInWithOAuthMock.mockClear()
  })

  it('includes a safe next param in the OAuth redirectTo URL', async () => {
    await expect(loginWithOAuth('google', formData({ next: '/admin/coach-dna' }))).rejects.toThrow(
      'REDIRECT:https://accounts.google.com/o/oauth2/auth?foo=bar',
    )
    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('next=%2Fadmin%2Fcoach-dna'),
        }),
      }),
    )
  })

  it('omits the next param from redirectTo when next is unsafe', async () => {
    await expect(loginWithOAuth('google', formData({ next: '//evil.com' }))).rejects.toThrow()
    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: expect.not.stringContaining('next='),
        }),
      }),
    )
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(auth)/login/actions.test.ts"`
Expected: FAIL — `login`/`loginWithOAuth` don't read or use `next` yet.

- [ ] **Step 4: Update `login/actions.ts`**

Replace the whole file:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSafeRedirectPath } from '@/lib/redirect-safety'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const next = formData.get('next') as string | null

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get('password') as string,
  })

  if (error) {
    const nextParam = isSafeRedirectPath(next) ? `&next=${encodeURIComponent(next)}` : ''
    redirect(`/login?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}${nextParam}`)
  }

  revalidatePath('/', 'layout')
  redirect(isSafeRedirectPath(next) ? next : '/dashboard')
}

export async function loginWithOAuth(provider: 'google' | 'facebook' | 'github', formData: FormData) {
  const supabase = await createClient()
  const next = formData.get('next') as string | null

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback${isSafeRedirectPath(next) ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  if (data.url) redirect(data.url)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(auth)/login/actions.test.ts"`
Expected: PASS (all tests)

- [ ] **Step 6: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "web/src/app/(auth)/login/page.tsx" "web/src/app/(auth)/login/actions.ts" "web/src/app/(auth)/login/actions.test.ts"
git commit -m "feat(auth): carry a safe next destination through login and into signup"
```

---

### Task 4: Signup carries `next` through email confirmation

**Files:**
- Modify: `web/src/app/(auth)/signup/page.tsx`
- Modify: `web/src/app/(auth)/signup/actions.ts`
- Create: `web/src/app/(auth)/signup/actions.test.ts`

**Interfaces:**
- Consumes: `isSafeRedirectPath` (Task 1).
- Unchanged: `/auth/callback`'s existing `next` query param handling — this task is the first real caller of it, no changes to that route yet (Task 5 adds validation there).

- [ ] **Step 1: Update `signup/page.tsx`**

Replace the component signature:

```tsx
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
```

with:

```tsx
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; next?: string }>
}) {
  const { error, success, next } = await searchParams
```

Replace the Google sign-in form:

```tsx
      {/* Google sign-in */}
      <form action={loginWithOAuth.bind(null, 'google')}>
        <button type="submit" className="auth-google-btn">
```

with:

```tsx
      {/* Google sign-in */}
      <form action={loginWithOAuth.bind(null, 'google')}>
        {next && <input type="hidden" name="next" value={next} />}
        <button type="submit" className="auth-google-btn">
```

Replace the signup form's opening tag:

```tsx
      <form action={signup}>
        <div className="auth-field">
          <label htmlFor="username" className="auth-label">Username</label>
```

with:

```tsx
      <form action={signup}>
        {next && <input type="hidden" name="next" value={next} />}
        <div className="auth-field">
          <label htmlFor="username" className="auth-label">Username</label>
```

- [ ] **Step 2: Write the failing tests**

```ts
// web/src/app/(auth)/signup/actions.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: { signUpError: { code?: string; message: string } | null } = { signUpError: null }

const signUpMock = vi.fn(async () => ({ error: state.signUpError }))
const sendWelcomeEmailMock = vi.fn(async () => {})

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { signUp: signUpMock },
  }),
}))
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: (...args: unknown[]) => sendWelcomeEmailMock(...args),
}))

import { signup } from './actions'

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('signup', () => {
  beforeEach(() => {
    state.signUpError = null
    signUpMock.mockClear()
    sendWelcomeEmailMock.mockClear()
  })

  it('includes a safe next param in emailRedirectTo', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith', next: '/admin/coach-dna' })),
    ).rejects.toThrow('REDIRECT:/signup?success=check-email')

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Fadmin%2Fcoach-dna'),
        }),
      }),
    )
  })

  it('omits the next param from emailRedirectTo when next is missing', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith' })),
    ).rejects.toThrow('REDIRECT:/signup?success=check-email')

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(/\/auth\/callback$/),
        }),
      }),
    )
  })

  it('omits the next param from emailRedirectTo when next is unsafe', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith', next: '//evil.com' })),
    ).rejects.toThrow('REDIRECT:/signup?success=check-email')

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(/\/auth\/callback$/),
        }),
      }),
    )
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(auth)/signup/actions.test.ts"`
Expected: FAIL — `signup` doesn't read or use `next` yet.

- [ ] **Step 4: Update `signup/actions.ts`**

Replace:

```ts
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  })
```

with:

```ts
  const next = formData.get('next') as string | null
  const nextParam = isSafeRedirectPath(next) ? `?next=${encodeURIComponent(next)}` : ''

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback${nextParam}`,
    },
  })
```

And add the import at the top of the file, alongside the existing imports:

```ts
import { isSafeRedirectPath } from '@/lib/redirect-safety'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(auth)/signup/actions.test.ts"`
Expected: PASS (all tests)

- [ ] **Step 6: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "web/src/app/(auth)/signup/page.tsx" "web/src/app/(auth)/signup/actions.ts" "web/src/app/(auth)/signup/actions.test.ts"
git commit -m "feat(auth): thread a safe next destination through signup's email confirmation link"
```

---

### Task 5: Validate `next` in the auth callback

**Files:**
- Modify: `web/src/app/auth/callback/route.ts`
- Create: `web/src/app/auth/callback/route.test.ts`

**Interfaces:**
- Consumes: `isSafeRedirectPath` (Task 1).

**Context for the implementer:** This route already reads a `next` query param and redirects there after exchanging the confirmation code, with no validation — a pre-existing gap. Tasks 3 and 4 now feed real, user-influenced `next` values into this same code path for the first time, so this task closes the gap rather than propagating it further.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/app/auth/callback/route.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  exchangeError: { message: string } | null
  user: { id: string; email?: string; created_at: string } | null
} = { exchangeError: null, user: null }

const exchangeCodeForSessionMock = vi.fn(async () => ({ error: state.exchangeError }))
const afterMock = vi.fn((cb: () => unknown) => cb())

vi.mock('next/server', () => ({
  after: (cb: () => unknown) => afterMock(cb),
  NextResponse: {
    redirect: (url: string) => ({ status: 307, headers: { get: () => url }, __redirectUrl: url }),
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { display_name: 'Coach' } }) }) }),
    }),
  }),
}))
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn(async () => {}),
}))

import { GET } from './route'

function request(url: string): Request {
  return new Request(url)
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    state.exchangeError = null
    state.user = null
    exchangeCodeForSessionMock.mockClear()
  })

  it('redirects to a safe next path on success', async () => {
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc&next=%2Fadmin%2Fcoach-dna'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/admin/coach-dna')
  })

  it('falls back to /dashboard when next is missing', async () => {
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/dashboard')
  })

  it('falls back to /dashboard when next is an unsafe absolute URL', async () => {
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc&next=https%3A%2F%2Fevil.com'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/dashboard')
  })

  it('falls back to /dashboard when next is a protocol-relative URL', async () => {
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc&next=%2F%2Fevil.com'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/dashboard')
  })

  it('redirects to /login with an error when the code exchange fails', async () => {
    state.exchangeError = { message: 'bad code' }
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/login?error=auth-callback-failed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/auth/callback/route.test.ts"`
Expected: FAIL — `next` isn't validated yet, so the "unsafe" test cases redirect to the attacker-controlled URL instead of `/dashboard`.

- [ ] **Step 3: Update the route**

Replace:

```ts
import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
```

with:

```ts
import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { isSafeRedirectPath } from '@/lib/redirect-safety'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next')
  const next = isSafeRedirectPath(requestedNext) ? requestedNext : '/dashboard'
```

Everything below this (the code exchange, welcome-email logic, and both redirects) is unchanged — `next` is still just interpolated into `${origin}${next}` at the existing `NextResponse.redirect` call.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/auth/callback/route.test.ts"`
Expected: PASS (all tests)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/app/auth/callback/route.ts web/src/app/auth/callback/route.test.ts
git commit -m "fix(auth): validate the next redirect param in the auth callback"
```

---

### Task 6: Loosen the Coach DNA access gate to coach + admin

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/pdf-actions.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/actions.test.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.test.ts`

**Interfaces:**
- None — no signature changes, only the role-check condition changes in all 7 non-test files.

**Context for the implementer:** all 7 files currently contain the exact same line — `if (profile?.role !== 'admin') redirect('/dashboard')` — immediately after fetching the caller's profile. `page.tsx` and `assessment/[attemptId]/page.tsx` and `assessment/[attemptId]/complete/page.tsx` have no dedicated test files (this codebase's established pattern of not unit-testing Server Component pages directly), so only the 4 action files listed have tests to update.

- [ ] **Step 1: Update all 7 non-test files**

In each of these 7 files, replace:

```ts
  if (profile?.role !== 'admin') redirect('/dashboard')
```

with:

```ts
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')
```

Files: `web/src/app/(app)/admin/coach-dna/page.tsx`, `web/src/app/(app)/admin/coach-dna/actions.ts`, `web/src/app/(app)/admin/coach-dna/pdf-actions.tsx`, `web/src/app/(app)/admin/coach-dna/summary-actions.ts`, `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/page.tsx`, `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts`, `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`.

- [ ] **Step 2: Update the 4 existing test files**

In `web/src/app/(app)/admin/coach-dna/actions.test.ts`, replace:

```ts
  it('redirects non-admin callers to the dashboard without creating an attempt', async () => {
    state.role = 'coach'

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/dashboard')
    expect(insertMock).not.toHaveBeenCalled()
  })
```

with:

```ts
  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'

    // startAssessment redirects to the new attempt on success, so the mocked
    // redirect() throw is the expected outcome here, not a plain return —
    // this only proves the role check let the call reach the insert.
    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalled()
  })

  it('redirects non-coach, non-admin callers to the dashboard without creating an attempt', async () => {
    state.role = 'viewer'

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/dashboard')
    expect(insertMock).not.toHaveBeenCalled()
  })
```

In `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.test.ts`, replace:

```ts
  it('redirects non-admin callers to the dashboard without writing a response', async () => {
    state.role = 'coach'

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:/dashboard')
    expect(upsertMock).not.toHaveBeenCalled()
  })
```

with:

```ts
  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'
    state.answeredQuestionIds = ['q1']

    // answerQuestion redirects to the next question on success, so the
    // mocked redirect() throw is the expected outcome here (matches this
    // file's existing 'saves both picks in one upsert' test pattern) — this
    // only proves the role check let the call reach the upsert.
    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:')
    expect(upsertMock).toHaveBeenCalled()
  })

  it('redirects non-coach, non-admin callers to the dashboard without writing a response', async () => {
    state.role = 'viewer'

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:/dashboard')
    expect(upsertMock).not.toHaveBeenCalled()
  })
```

(The file's `beforeEach` defaults `state.role` to `'admin'`, so every other test in it already covers the admin-allowed path — this task only needs the one new `'coach'` case above to prove the role check now accepts `coach` too.)

In `web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts`, replace:

```ts
  it('redirects non-admin callers to the dashboard', async () => {
    state.role = 'coach'
    await expect(emailSelfAssessmentSummaryPDF()).rejects.toThrow('REDIRECT:/dashboard')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
```

with:

```ts
  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: true })
  })

  it('redirects non-coach, non-admin callers to the dashboard', async () => {
    state.role = 'viewer'
    await expect(emailSelfAssessmentSummaryPDF()).rejects.toThrow('REDIRECT:/dashboard')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
```

In `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`, replace:

```ts
  it('redirects non-admin callers to the dashboard', async () => {
    state.role = 'coach'
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/dashboard')
    expect(upsertMock).not.toHaveBeenCalled()
  })
```

with:

```ts
  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'
    const result = await generateSelfAssessmentSummary('attempt-1')
    expect(result.primaryType).toBe('teacher')
  })

  it('redirects non-coach, non-admin callers to the dashboard', async () => {
    state.role = 'viewer'
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/dashboard')
    expect(upsertMock).not.toHaveBeenCalled()
  })
```

- [ ] **Step 3: Run the coach-dna test suite**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna"`
Expected: all pass.

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/page.tsx" "web/src/app/(app)/admin/coach-dna/actions.ts" "web/src/app/(app)/admin/coach-dna/pdf-actions.tsx" "web/src/app/(app)/admin/coach-dna/summary-actions.ts" "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/page.tsx" "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts" "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx" "web/src/app/(app)/admin/coach-dna/actions.test.ts" "web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts" "web/src/app/(app)/admin/coach-dna/summary-actions.test.ts" "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.test.ts"
git commit -m "feat(coach-dna): open the self-assessment to coach-role users, not just admin"
```

---

### Task 7: Full verification

**Files:**
- None created — this task verifies Tasks 1-6 together.

- [ ] **Step 1: Run the full test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npm run test`
Expected: all existing tests plus every changed/new test file from Tasks 1-6 pass, no regressions.

- [ ] **Step 2: Confirm Coach DNA is still absent from navigation**

Run: `cd web && grep -rn "coach-dna" src/components/app-sidebar.tsx`
Expected: no matches — confirms the feature stays link-only, not surfaced in the nav, per the plan's Global Constraints.

- [ ] **Step 3: Manual QA (cannot be automated in this environment — report to the human partner instead of claiming it's verified)**

This needs a real browser walkthrough. Do NOT claim this "works" without doing this:
1. In a private/incognito window (no existing session), visit `/admin/coach-dna` directly.
2. Confirm you land on `/login` with `?next=%2Fadmin%2Fcoach-dna` (or similar) in the URL.
3. Click "Create one free" — confirm the signup page URL still carries `next`.
4. Sign up with a test coach account, confirm the account via the emailed link — confirm it lands on `/admin/coach-dna`, not `/dashboard`.
5. Sign out, visit `/admin/coach-dna` again, this time log in with an existing `coach`-role account (not admin) — confirm login succeeds and lands on `/admin/coach-dna`.
6. Confirm a `viewer`-role account still gets redirected to `/dashboard` when visiting `/admin/coach-dna`.
7. Confirm Coach DNA still doesn't appear anywhere in the sidebar for any of these accounts.

If Playwright MCP tools or test accounts are not available, explicitly report that manual QA was NOT performed and ask the human partner to click through the flow themselves before considering this plan done.

- [ ] **Step 4: Commit (only if Step 1-2 required fixes)**

If any step required a fix, commit it with an appropriate message. If everything passed cleanly, skip this step.
