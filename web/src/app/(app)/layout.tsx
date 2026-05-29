import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { HelpWidget } from '@/components/help/HelpWidget'
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
          <div className="flex-1" />
          <Link
            href="/notifications"
            className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#e8560a] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
      <HelpWidget />
    </SidebarProvider>
  )
}
