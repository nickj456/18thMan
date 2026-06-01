# Four Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Contact Us page, Penalty Won/Conceded stats, admin group deletion, and per-club group limits to the 18th Man rugby league coaching platform.

**Architecture:** Four independent features. Features 1–3 are self-contained additions; Feature 4 requires a DB migration, dropping an existing DB trigger, and touching three layers (DB, server actions, UI). Each feature can be built and deployed independently.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Supabase Postgres, shadcn/ui, Resend for email, TypeScript.

---

## File Map

| Feature | Creates | Modifies |
|---------|---------|----------|
| Contact page | `web/src/app/contact/page.tsx`, `web/src/app/contact/actions.ts` | `web/src/components/app-sidebar.tsx`, `web/src/app/legal/privacy/page.tsx`, `web/src/app/legal/terms/page.tsx` |
| Penalties | `web/supabase/migrations/064_penalty_stats.sql` | `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/GameStatsClient.tsx` |
| Admin delete groups | `web/src/app/(app)/admin/groups/[id]/DeleteGroupButton.tsx` | `web/src/app/(app)/groups/actions.ts`, `web/src/app/(app)/admin/groups/[id]/page.tsx` |
| Groups limit | `web/supabase/migrations/065_club_max_groups.sql` | `web/src/app/(app)/admin/clubs/actions.ts`, `web/src/app/(app)/admin/clubs/[id]/ClubSettingsForm.tsx`, `web/src/app/(app)/admin/clubs/[id]/page.tsx`, `web/src/app/(app)/groups/actions.ts`, `web/src/app/(app)/clubs/ClubAdminPanel.tsx`, `web/src/app/(app)/clubs/page.tsx` |

---

## Feature 1: Contact Us Page

### Task 1: Create the contact Server Action

**Files:**
- Create: `web/src/app/contact/actions.ts`

- [ ] **Step 1: Create the server action file**

```typescript
// web/src/app/contact/actions.ts
'use server'

import { send } from '@/lib/email'

export async function submitContact(prevState: { error?: string; success?: boolean }, formData: FormData) {
  const name    = (formData.get('name') as string)?.trim()
  const email   = (formData.get('email') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim() || 'General'
  const message = (formData.get('message') as string)?.trim()

  if (!name || !email || !message) return { error: 'Please fill in all required fields.' }

  const html = `
    <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <hr />
    <p>${message.replace(/\n/g, '<br />')}</p>
  `

  const result = await send('Hello@18thMan.app', `[Contact] ${subject} — from ${name}`, html)
  if (!result.success) return { error: 'Failed to send your message. Please try again.' }

  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/contact/actions.ts
git commit -m "feat: add contact form server action"
```

---

### Task 2: Create the contact page

**Files:**
- Create: `web/src/app/contact/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// web/src/app/contact/page.tsx
import Link from 'next/link'
import { ContactForm } from './ContactForm'

export const metadata = { title: 'Contact Us — 18th Man' }

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-[#c8c4bc] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <Link href="/" className="text-[#e8560a] text-sm font-semibold hover:opacity-80 transition-opacity">
            ← Back to 18th Man
          </Link>
          <h1 className="text-3xl font-bold text-[#e8e4dc] mt-6 mb-1">Contact Us</h1>
          <p className="text-sm text-[#5a5855]">Got a question or feedback? We&apos;d love to hear from you.</p>
        </div>

        <ContactForm />

        <div className="mt-12 pt-8 border-t border-white/5 flex gap-6 text-xs text-[#5a5855]">
          <Link href="/legal/privacy" className="hover:text-[#e8e4dc] transition-colors">Privacy Policy</Link>
          <Link href="/legal/terms" className="hover:text-[#e8e4dc] transition-colors">Terms of Service</Link>
          <Link href="/login" className="hover:text-[#e8e4dc] transition-colors">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the ContactForm client component**

```tsx
// web/src/app/contact/ContactForm.tsx
'use client'

import { useActionState } from 'react'
import { submitContact } from './actions'

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContact, {})

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-300">
        Thanks — we&apos;ll be in touch soon.
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs font-medium text-[#7a7672]">Name <span className="text-[#e8560a]">*</span></label>
          <input
            id="name" name="name" required
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-medium text-[#7a7672]">Email <span className="text-[#e8560a]">*</span></label>
          <input
            id="email" name="email" type="email" required
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="subject" className="block text-xs font-medium text-[#7a7672]">Subject</label>
        <select
          id="subject" name="subject"
          className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
        >
          <option value="General">General</option>
          <option value="Bug Report">Bug Report</option>
          <option value="Billing">Billing</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="block text-xs font-medium text-[#7a7672]">Message <span className="text-[#e8560a]">*</span></label>
        <textarea
          id="message" name="message" required rows={5}
          className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60 resize-none"
        />
      </div>

      <button
        type="submit" disabled={isPending}
        className="px-6 py-2.5 rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isPending ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/contact/page.tsx web/src/app/contact/ContactForm.tsx
git commit -m "feat: add public contact us page"
```

---

### Task 3: Add Contact link to sidebar and legal pages

**Files:**
- Modify: `web/src/components/app-sidebar.tsx`
- Modify: `web/src/app/legal/privacy/page.tsx`
- Modify: `web/src/app/legal/terms/page.tsx`

- [ ] **Step 1: Add Contact link to the sidebar footer**

In `web/src/components/app-sidebar.tsx`, add a `Mail` icon import alongside the existing imports at the top, then add a Contact link in the `SidebarFooter` after `<HelpTrigger />`:

Find the existing imports block:
```typescript
import {
  Building2,
  Users2,
  HelpCircle,
  Scale,
  Settings,
  // ... other imports
} from 'lucide-react'
```

Add `Mail` to the import list:
```typescript
import {
  Building2,
  Users2,
  HelpCircle,
  Mail,
  Scale,
  Settings,
  // ... other imports
} from 'lucide-react'
```

Then find the `<SidebarFooter>` closing section:
```tsx
        <HelpTrigger />
      </SidebarFooter>
```

Replace with:
```tsx
        <HelpTrigger />
        <Link
          href="/contact"
          className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
        >
          <Mail className="size-3" />
          Contact
        </Link>
      </SidebarFooter>
```

- [ ] **Step 2: Add Contact link to legal pages footer nav**

In `web/src/app/legal/privacy/page.tsx`, find the footer nav div at the bottom:
```tsx
        <div className="mt-12 pt-8 border-t border-white/5 flex gap-6 text-xs text-[#5a5855]">
          <Link href="/legal/terms" className="hover:text-[#e8e4dc] transition-colors">Terms of Service</Link>
          <Link href="/login" className="hover:text-[#e8e4dc] transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-[#e8e4dc] transition-colors">Create account</Link>
        </div>
```

Replace with:
```tsx
        <div className="mt-12 pt-8 border-t border-white/5 flex gap-6 text-xs text-[#5a5855]">
          <Link href="/legal/terms" className="hover:text-[#e8e4dc] transition-colors">Terms of Service</Link>
          <Link href="/contact" className="hover:text-[#e8e4dc] transition-colors">Contact</Link>
          <Link href="/login" className="hover:text-[#e8e4dc] transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-[#e8e4dc] transition-colors">Create account</Link>
        </div>
```

Do the same for `web/src/app/legal/terms/page.tsx` — find its footer nav and add the Contact link in the same position.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/app-sidebar.tsx web/src/app/legal/privacy/page.tsx web/src/app/legal/terms/page.tsx
git commit -m "feat: add contact page link to sidebar and legal page footers"
```

---

## Feature 2: Positive & Negative Penalties in Stats Tracker

### Task 4: Add penalty enum values via migration

**Files:**
- Create: `web/supabase/migrations/064_penalty_stats.sql`

- [ ] **Step 1: Create the migration**

```sql
-- 064_penalty_stats.sql
alter type public.stat_type add value if not exists 'penalty_won';
alter type public.stat_type add value if not exists 'penalty_conceded';
```

- [ ] **Step 2: Apply the migration**

Run from the `web/` directory:
```bash
npx supabase db push
```
Expected: migration applied successfully.

- [ ] **Step 3: Regenerate TypeScript types**

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Verify `penalty_won` and `penalty_conceded` appear in the `stat_type` enum in the generated types file.

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/064_penalty_stats.sql web/src/lib/supabase/database.types.ts
git commit -m "feat: add penalty_won and penalty_conceded to stat_type enum"
```

---

### Task 5: Add Penalties tab to the live game stats tracker

**Files:**
- Modify: `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/GameStatsClient.tsx`

- [ ] **Step 1: Add penalty derived state and extend type unions**

In `GameStatsClient.tsx`, find the `Tab` type and add `'penalties'`:
```typescript
type Tab = 'carries' | 'tackles' | 'sets' | 'score' | 'penalties'
```

Find the derived counts section (around line 82) and add after `oppConvEvents`:
```typescript
  const penaltyWonEvents      = useMemo(() => events.filter(e => e.stat_type === 'penalty_won'), [events])
  const penaltyConcededEvents = useMemo(() => events.filter(e => e.stat_type === 'penalty_conceded'), [events])
```

Find the `handleUndoNoPlayer` function signature (around line 130):
```typescript
  async function handleUndoNoPlayer(statType: 'set_completion' | 'conversion' | 'opposition_try' | 'opposition_conversion') {
```

Replace with:
```typescript
  async function handleUndoNoPlayer(statType: 'set_completion' | 'conversion' | 'opposition_try' | 'opposition_conversion' | 'penalty_won' | 'penalty_conceded') {
```

- [ ] **Step 2: Add 'penalties' to the tab bar**

Find the tab bar array (around line 284):
```typescript
{(['carries', 'tackles', 'sets', 'score'] as Tab[]).map(t => (
```

Replace with:
```typescript
{(['carries', 'tackles', 'sets', 'score', 'penalties'] as Tab[]).map(t => (
```

- [ ] **Step 3: Add the PenaltiesTab render in the tap section**

After the `{activeTab === 'score' && ...}` block (around line 343), add:
```tsx
          {activeTab === 'penalties' && (
            <PenaltiesTab
              wonCount={penaltyWonEvents.filter(e => e.half === activeHalf).length}
              concededCount={penaltyConcededEvents.filter(e => e.half === activeHalf).length}
              onAddWon={() => handleAdd('penalty_won', null, null)}
              onUndoWon={() => handleUndoNoPlayer('penalty_won')}
              onAddConceded={() => handleAdd('penalty_conceded', null, null)}
              onUndoConceded={() => handleUndoNoPlayer('penalty_conceded')}
            />
          )}
```

- [ ] **Step 4: Add the PenaltiesTab component**

Add this component after the `SetsTab` component at the bottom of the file:
```tsx
// ── PenaltiesTab ──────────────────────────────────────────────────────────────

function PenaltiesTab({
  wonCount, concededCount, onAddWon, onUndoWon, onAddConceded, onUndoConceded,
}: {
  wonCount: number
  concededCount: number
  onAddWon: () => void
  onUndoWon: () => void
  onAddConceded: () => void
  onUndoConceded: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-xl border border-zinc-800 overflow-hidden text-center">
        <div className="py-3 border-r border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Won</p>
          <p className="text-3xl font-bold text-white mt-0.5">{wonCount}</p>
        </div>
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Conceded</p>
          <p className="text-3xl font-bold text-white mt-0.5">{concededCount}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Penalty Won</p>
        <div className="flex gap-3">
          <button
            onClick={onAddWon}
            className="flex-1 py-4 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-bold text-lg hover:bg-emerald-800/50 active:scale-95 transition-all"
          >
            + Won
          </button>
          <button
            onClick={onUndoWon}
            disabled={wonCount === 0}
            className="px-5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors text-base"
          >
            ↩
          </button>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Penalty Conceded</p>
        <div className="flex gap-3">
          <button
            onClick={onAddConceded}
            className="flex-1 py-4 rounded-xl bg-red-900/40 border border-red-700/40 text-red-400 font-bold text-lg hover:bg-red-800/50 active:scale-95 transition-all"
          >
            + Conceded
          </button>
          <button
            onClick={onUndoConceded}
            disabled={concededCount === 0}
            className="px-5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors text-base"
          >
            ↩
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/app/\(app\)/groups/\[id\]/game-stats/\[sessionId\]/GameStatsClient.tsx
git commit -m "feat: add penalty won/conceded tracking to game stats tracker"
```

---

## Feature 3: Platform Admin Can Delete Groups

### Task 6: Add deleteGroup server action

**Files:**
- Modify: `web/src/app/(app)/groups/actions.ts`

- [ ] **Step 1: Add the deleteGroup action at the bottom of `groups/actions.ts`**

```typescript
/** Platform admin only: permanently delete a group and all associated data. */
export async function deleteGroup(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Not authorised' }

  const { error } = await supabase
    .from('coaching_groups')
    .delete()
    .eq('id', groupId)

  if (error) return { error: error.message }

  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/groups/actions.ts
git commit -m "feat: add deleteGroup server action (platform admin only)"
```

---

### Task 7: Add Delete Group button with confirmation dialog to admin group page

**Files:**
- Create: `web/src/app/(app)/admin/groups/[id]/DeleteGroupButton.tsx`
- Modify: `web/src/app/(app)/admin/groups/[id]/page.tsx`

- [ ] **Step 1: Create the DeleteGroupButton client component**

```tsx
// web/src/app/(app)/admin/groups/[id]/DeleteGroupButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteGroup } from '@/app/(app)/groups/actions'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  groupId: string
  groupName: string
}

export function DeleteGroupButton({ groupId, groupName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canConfirm = confirmName === groupName

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGroup(groupId)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/admin')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setConfirmName(''); setError(null) } }}>
      <AlertDialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-red-700/40 text-red-400 hover:bg-red-900/20 hover:border-red-700/60 transition-colors">
          <Trash2 size={14} />
          Delete Group
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-zinc-900 border-zinc-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-100">Delete &quot;{groupName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            This will permanently delete <strong className="text-zinc-200">{groupName}</strong> and all associated members, game stats, and invitations. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-1">
          <p className="text-xs text-zinc-500">Type the group name to confirm:</p>
          <input
            value={confirmName}
            onChange={e => setConfirmName(e.target.value)}
            placeholder={groupName}
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500/60"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canConfirm || isPending}
            className="bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <><Loader2 size={13} className="animate-spin mr-1.5" />Deleting…</> : 'Delete Group'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Add the button to the admin group page**

In `web/src/app/(app)/admin/groups/[id]/page.tsx`, add the import at the top:
```typescript
import { DeleteGroupButton } from './DeleteGroupButton'
```

Find the group header section (the `<div className="flex items-center gap-3">` around line 55):
```tsx
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <Users2 size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">{group.name}</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{members?.length ?? 0} members</p>
        </div>
      </div>
```

Replace with:
```tsx
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Users2 size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">{group.name}</h1>
            <p className="text-xs text-zinc-600 mt-0.5">{members?.length ?? 0} members</p>
          </div>
        </div>
        <DeleteGroupButton groupId={group.id} groupName={group.name} />
      </div>
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\(app\)/admin/groups/\[id\]/DeleteGroupButton.tsx web/src/app/\(app\)/admin/groups/\[id\]/page.tsx
git commit -m "feat: add delete group button with name-confirmation dialog to admin panel"
```

---

## Feature 4: Per-Club Groups Limit

### Task 8: DB migration — add max_groups, drop trigger

**Files:**
- Create: `web/supabase/migrations/065_club_max_groups.sql`

- [ ] **Step 1: Create the migration**

```sql
-- 065_club_max_groups.sql
-- Add per-club group limit (null = platform default of 5)
alter table public.clubs
  add column if not exists max_groups integer;

-- Drop the old hard-coded trigger; enforcement moves to app layer
drop trigger if exists enforce_club_group_limit on public.coaching_groups;
drop function if exists public.check_club_group_limit();
```

- [ ] **Step 2: Apply and regenerate types**

Run from `web/`:
```bash
npx supabase db push
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Verify `max_groups` appears in the `clubs` row type in the generated file.

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/065_club_max_groups.sql web/src/lib/supabase/database.types.ts
git commit -m "feat: add max_groups to clubs table, drop hard-coded group limit trigger"
```

---

### Task 9: Update updateClubSettings action to handle max_groups

**Files:**
- Modify: `web/src/app/(app)/admin/clubs/actions.ts`

- [ ] **Step 1: Update the updateClubSettings function**

Find the `updateClubSettings` function (around line 181). Find these lines:
```typescript
  const maxRaw = formData.get('max_members') as string
  const max_members = maxRaw && maxRaw.trim() !== '' ? parseInt(maxRaw, 10) : null

  const supabase = await createClient()
  const { error: dbErr } = await supabase
    .from('clubs')
    .update({ name, slug: toSlug(name), max_members })
    .eq('id', clubId)
```

Replace with:
```typescript
  const maxRaw = formData.get('max_members') as string
  const max_members = maxRaw && maxRaw.trim() !== '' ? parseInt(maxRaw, 10) : null

  const maxGroupsRaw = formData.get('max_groups') as string
  const max_groups = maxGroupsRaw && maxGroupsRaw.trim() !== '' ? parseInt(maxGroupsRaw, 10) : null

  const supabase = await createClient()
  const { error: dbErr } = await supabase
    .from('clubs')
    .update({ name, slug: toSlug(name), max_members, max_groups })
    .eq('id', clubId)
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/admin/clubs/actions.ts
git commit -m "feat: update updateClubSettings to persist max_groups"
```

---

### Task 10: Update ClubSettingsForm to show Max Groups field

**Files:**
- Modify: `web/src/app/(app)/admin/clubs/[id]/ClubSettingsForm.tsx`

- [ ] **Step 1: Add maxGroups and groupCount to Props**

Find the `Props` interface:
```typescript
interface Props {
  clubId: string
  clubName: string
  maxMembers: number | null
  memberCount: number
}
```

Replace with:
```typescript
interface Props {
  clubId: string
  clubName: string
  maxMembers: number | null
  memberCount: number
  maxGroups: number | null
  groupCount: number
}
```

Find the function signature:
```typescript
export function ClubSettingsForm({ clubId, clubName, maxMembers, memberCount }: Props) {
```

Replace with:
```typescript
export function ClubSettingsForm({ clubId, clubName, maxMembers, memberCount, maxGroups, groupCount }: Props) {
```

- [ ] **Step 2: Add the Max Groups input field**

Find the closing `</div>` of the `grid grid-cols-2` div that contains the Club Name and Max Members fields:
```tsx
        <div className="space-y-1.5">
          <label htmlFor="max_members" className="block text-xs font-medium text-zinc-400">
            Max Members <span className="text-zinc-600 font-normal">(blank = unlimited)</span>
          </label>
          <input
            id="max_members"
            name="max_members"
            type="number"
            min={1}
            defaultValue={maxMembers ?? ''}
            placeholder="Unlimited"
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
          />
        </div>
      </div>
```

Replace with:
```tsx
        <div className="space-y-1.5">
          <label htmlFor="max_members" className="block text-xs font-medium text-zinc-400">
            Max Members <span className="text-zinc-600 font-normal">(blank = unlimited)</span>
          </label>
          <input
            id="max_members"
            name="max_members"
            type="number"
            min={1}
            defaultValue={maxMembers ?? ''}
            placeholder="Unlimited"
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="max_groups" className="block text-xs font-medium text-zinc-400">
            Max Groups <span className="text-zinc-600 font-normal">(blank = default 5)</span>
          </label>
          <input
            id="max_groups"
            name="max_groups"
            type="number"
            min={1}
            defaultValue={maxGroups ?? ''}
            placeholder="5"
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
          />
        </div>
      </div>
```

- [ ] **Step 3: Update the footer stats line**

Find:
```tsx
        <p className="text-xs text-zinc-600">
          {memberCount} current member{memberCount !== 1 ? 's' : ''}
          {maxMembers ? ` · limit ${maxMembers}` : ' · no limit'}
        </p>
```

Replace with:
```tsx
        <p className="text-xs text-zinc-600">
          {memberCount} member{memberCount !== 1 ? 's' : ''}{maxMembers ? ` · limit ${maxMembers}` : ''}
          {' · '}
          {groupCount} group{groupCount !== 1 ? 's' : ''} · limit {maxGroups ?? 5}
        </p>
```

- [ ] **Step 4: Update the grid from 2 to 3 columns**

Find:
```tsx
      <div className="grid grid-cols-2 gap-4">
```

Replace with:
```tsx
      <div className="grid grid-cols-3 gap-4">
```

- [ ] **Step 5: Commit**

```bash
git add web/src/app/\(app\)/admin/clubs/\[id\]/ClubSettingsForm.tsx
git commit -m "feat: add max groups field to club settings form"
```

---

### Task 11: Pass max_groups and groupCount to ClubSettingsForm from the admin page

**Files:**
- Modify: `web/src/app/(app)/admin/clubs/[id]/page.tsx`

- [ ] **Step 1: Fetch max_groups and group count**

Find the club select query (around line 22):
```typescript
  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, slug, max_members, created_at')
    .eq('id', id)
    .single()
```

Replace with:
```typescript
  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, slug, max_members, max_groups, created_at')
    .eq('id', id)
    .single()

  const { count: groupCount } = await supabase
    .from('coaching_groups')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', id)
```

- [ ] **Step 2: Pass the new props to ClubSettingsForm**

Find the `<ClubSettingsForm` usage in the return JSX and add the two new props:
```tsx
          <ClubSettingsForm
            clubId={club.id}
            clubName={club.name}
            maxMembers={club.max_members}
            memberCount={members?.length ?? 0}
            maxGroups={club.max_groups}
            groupCount={groupCount ?? 0}
          />
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\(app\)/admin/clubs/\[id\]/page.tsx
git commit -m "feat: fetch and pass group limit data to ClubSettingsForm"
```

---

### Task 12: Replace DB trigger check with app-level check in createGroup

**Files:**
- Modify: `web/src/app/(app)/groups/actions.ts`

- [ ] **Step 1: Replace the DB trigger error catch with an explicit pre-check**

In `createGroup`, find the name validation and insert block (around line 35):
```typescript
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Group name is required' }

  const { data: group, error } = await supabase
    .from('coaching_groups')
    .insert({ name, club_id: me.club_id, created_by: user.id })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('maximum of 5')) return { error: 'This club already has 5 groups (the maximum)' }
    return { error: error.message }
  }
```

Replace with:
```typescript
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Group name is required' }

  // Check per-club group limit (replaces the dropped DB trigger)
  const [{ data: clubData }, { count: currentGroupCount }] = await Promise.all([
    supabase.from('clubs').select('max_groups').eq('id', me.club_id).single(),
    supabase.from('coaching_groups').select('id', { count: 'exact', head: true }).eq('club_id', me.club_id),
  ])
  const limit = clubData?.max_groups ?? 5
  if ((currentGroupCount ?? 0) >= limit) {
    return { error: 'Your club has reached its group limit. Contact your administrator to increase it.' }
  }

  const { data: group, error } = await supabase
    .from('coaching_groups')
    .insert({ name, club_id: me.club_id, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/groups/actions.ts
git commit -m "feat: replace DB trigger group limit with app-level check using per-club max_groups"
```

---

### Task 13: Show groups used/limit in ClubAdminPanel

**Files:**
- Modify: `web/src/app/(app)/clubs/ClubAdminPanel.tsx`
- Modify: `web/src/app/(app)/clubs/page.tsx`

- [ ] **Step 1: Add groupCount and maxGroups props to ClubAdminPanel**

In `ClubAdminPanel.tsx`, find the `Props` interface:
```typescript
interface Props {
  clubId: string
  inviteToken: string
  members: Member[]
  availableUsers: AvailableUser[]
  pendingInvites: PendingInvite[]
  currentUserId: string
}
```

Replace with:
```typescript
interface Props {
  clubId: string
  inviteToken: string
  members: Member[]
  availableUsers: AvailableUser[]
  pendingInvites: PendingInvite[]
  currentUserId: string
  groupCount: number
  maxGroups: number | null
}
```

Find the function signature:
```typescript
export function ClubAdminPanel({ clubId, inviteToken, members, availableUsers, pendingInvites, currentUserId }: Props) {
```

Replace with:
```typescript
export function ClubAdminPanel({ clubId, inviteToken, members, availableUsers, pendingInvites, currentUserId, groupCount, maxGroups }: Props) {
```

- [ ] **Step 2: Add the groups stat display**

Find the `<h2>` heading in the component:
```tsx
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Club Admin</h2>
```

Replace with:
```tsx
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Club Admin</h2>
        <span className="text-xs text-zinc-500">
          {groupCount} / {maxGroups ?? 5} groups
        </span>
      </div>
```

- [ ] **Step 3: Pass the new props from clubs/page.tsx**

In `web/src/app/(app)/clubs/page.tsx`, add a group count fetch inside the admin block. Find the block that starts:
```typescript
    if (profile.club_role === 'admin') {
      const memberIds = (members ?? []).map(m => m.id)
```

Add a group count fetch after the existing queries in that block. Find the `const { data } = await q` and `availableUsers = data ?? []` lines and add after:
```typescript
      const { count: groupCount } = await supabase
        .from('coaching_groups')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', profile.club_id)

      const groupCountVal = groupCount ?? 0
```

You will also need the club's `max_groups`. Update the club select query (around line 32) from:
```typescript
      supabase
        .from('clubs')
        .select('id, name, slug, created_at, invite_token')
        .eq('id', profile.club_id)
        .single(),
```

Replace with:
```typescript
      supabase
        .from('clubs')
        .select('id, name, slug, created_at, invite_token, max_groups')
        .eq('id', profile.club_id)
        .single(),
```

Then find the `<ClubAdminPanel` usage and pass the new props:
```tsx
          <ClubAdminPanel
            clubId={profile.club_id}
            inviteToken={club.invite_token}
            members={members ?? []}
            availableUsers={availableUsers}
            pendingInvites={pendingInvites}
            currentUserId={user.id}
            groupCount={groupCountVal}
            maxGroups={club.max_groups ?? null}
          />
```

Note: `groupCountVal` is only available inside the `if (profile.club_role === 'admin')` block, so the `ClubAdminPanel` is already rendered inside that conditional — this is fine.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/\(app\)/clubs/ClubAdminPanel.tsx web/src/app/\(app\)/clubs/page.tsx
git commit -m "feat: show groups used/limit in club admin panel"
```

---

## Final Verification

- [ ] **Verify contact page** — visit `/contact` without being logged in, submit the form, confirm email arrives at Hello@18thMan.app. Check the Contact link appears in the sidebar footer when logged in. Check it appears in the Privacy and Terms page footers.

- [ ] **Verify penalties** — open a live game stats session, confirm the Penalties tab appears in the tab bar. Tap Penalty Won and Penalty Conceded — confirm events are recorded and counts update. Confirm undo works.

- [ ] **Verify admin delete groups** — go to `/admin/groups/[id]`, confirm Delete Group button is visible. Click it, confirm the dialog opens. Try confirming with wrong name (button stays disabled). Type the correct name, confirm delete works and redirects to `/admin`.

- [ ] **Verify groups limit** — in `/admin/clubs/[id]`, confirm the Max Groups field appears. Set it to 2 for a test club. Try to create a third group in that club — confirm the error message "Your club has reached its group limit" appears. Check the Club Admin panel shows the correct groups used/limit ratio.
