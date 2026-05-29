'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export default async function ClubSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ clubId?: string; upgraded?: string }>
}) {
  const { clubId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!clubId) redirect('/clubs')

  async function saveClub(formData: FormData) {
    'use server'
    const name = (formData.get('name') as string).trim()
    if (!name) return

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const service = createServiceClient()

    await service
      .from('clubs')
      .update({ name, slug })
      .eq('id', clubId)

    // Ensure user is set as club admin
    await service
      .from('profiles')
      .update({ club_id: clubId, club_role: 'admin' })
      .eq('id', user!.id)

    revalidatePath('/clubs')
    revalidatePath('/', 'layout')
    redirect('/clubs')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Club plan activated!
          </h1>
          <p style={{ fontSize: 14, color: '#71717a', margin: 0 }}>
            Give your club a name to get started.
          </p>
        </div>

        <form action={saveClub} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#a1a1aa', marginBottom: 6 }}>
              Club name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Wigan Warriors Academy"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #3f3f46',
                background: '#18181b',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '10px 0',
              borderRadius: 8,
              background: '#e8560a',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Set up my club →
          </button>
        </form>
      </div>
    </div>
  )
}
