import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ArrowLeft } from 'lucide-react'
import { EmailSettingsForm } from './EmailSettingsForm'

export default async function AdminEmailSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const service = createServiceClient()
  const { data: settings } = await service.from('email_settings').select('*').maybeSingle()

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/email" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Email Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure thresholds for notifications and batching</p>
        </div>
      </div>
      <EmailSettingsForm settings={settings} />
    </div>
  )
}
