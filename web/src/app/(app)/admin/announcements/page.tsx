import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Megaphone, Trash2 } from 'lucide-react'
import { createAnnouncement, setAnnouncementActive, deleteAnnouncement } from '@/lib/announcements/actions'

export const metadata = { title: 'Announcements — Admin' }

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, message, link_url, link_label, active, target_roles, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Admin Panel
      </Link>

      <div>
        <h1 className="app-heading text-2xl flex items-center gap-2">
          <Megaphone size={20} className="text-emerald-400" /> Announcements
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Shown as a pop-up to every logged-in user until they dismiss it. Only the newest active one is shown.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        {!announcements?.length ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-600">No announcements yet</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {announcements.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{a.message}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {a.link_url ? `${a.link_label ?? 'Learn more'} → ${a.link_url}` : 'No link'}
                    {' · '}
                    {a.target_roles?.length ? a.target_roles.map((r: string) => `${r[0].toUpperCase()}${r.slice(1)}`).join(', ') : 'Everyone'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <form
                    action={async () => {
                      'use server'
                      await setAnnouncementActive(a.id, !a.active)
                    }}
                  >
                    <button
                      type="submit"
                      className={
                        a.active
                          ? 'text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 whitespace-nowrap'
                          : 'text-xs px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 whitespace-nowrap'
                      }
                    >
                      {a.active ? 'Active' : 'Inactive'}
                    </button>
                  </form>
                  <form
                    action={async () => {
                      'use server'
                      await deleteAnnouncement(a.id)
                    }}
                  >
                    <button
                      type="submit"
                      aria-label="Delete announcement"
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Megaphone size={14} className="text-emerald-400" /> New announcement
        </h2>
        <form action={createAnnouncement} className="space-y-3">
          <textarea
            name="message"
            placeholder="Message shown to every user…"
            required
            rows={3}
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <input
              name="linkUrl"
              placeholder="Link (optional), e.g. /admin/coach-dna"
              className="flex-1 text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="linkLabel"
              placeholder="Button text (optional)"
              className="flex-1 text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Show to (leave all unchecked for everyone):</p>
            <div className="flex gap-4">
              {(['coach', 'admin', 'viewer'] as const).map(role => (
                <label key={role} className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <input type="checkbox" name="roles" value={role} className="rounded border-zinc-700 bg-zinc-800" />
                  {role[0].toUpperCase()}{role.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" name="active" defaultChecked className="rounded border-zinc-700 bg-zinc-800" />
            Activate immediately
          </label>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  )
}
