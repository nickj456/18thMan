'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  PenTool,
  CalendarDays,
  MessageSquare,
  User,
  ShieldCheck,
  LogOut,
  ListVideo,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { signOut } from '@/app/(app)/actions'
import type { UserRole } from '@/lib/supabase/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/drills', label: 'Drill Library', icon: BookOpen },
  { href: '/drills/new', label: 'Drill Designer', icon: PenTool },
  { href: '/sessions', label: 'Session Planner', icon: CalendarDays },
  { href: '/chat', label: 'Coach Chat', icon: MessageSquare },
]

const profileItems = [
  { href: '/profile', label: 'My Profile', icon: User },
]

interface AppSidebarProps {
  role: UserRole
  displayName: string | null
}

export function AppSidebar({ role, displayName }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="18th Man" width={44} height={44} className="shrink-0" />
          <div>
            <p className="font-bold text-sm leading-tight">18th Man</p>
            <p className="text-xs text-muted-foreground">{displayName ?? 'Coach'}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    render={<Link href={href} />}
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {profileItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    render={<Link href={href} />}
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {role === 'admin' && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname === '/admin'}
                      render={<Link href="/admin" />}
                    >
                      <ShieldCheck className="size-4" />
                      <span>Admin</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/admin/import-playlist')}
                      render={<Link href="/admin/import-playlist" />}
                    >
                      <ListVideo className="size-4" />
                      <span>Import Playlist</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton type="submit" className="w-full text-muted-foreground hover:text-foreground">
                <LogOut className="size-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
