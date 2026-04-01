import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import type { UserRole } from '@/lib/supabase/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, notifResult] = await Promise.all([
    supabase.from('profiles').select('display_name, role, avatar_url').eq('id', user.id).single(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
  ])

  const profile = profileResult.data
  const unreadCount = notifResult.count ?? 0

  return (
    <SidebarProvider>
      <AppSidebar
        role={(profile?.role ?? 'viewer') as UserRole}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        unreadNotifications={unreadCount}
      />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
