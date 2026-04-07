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
  Users,
  Tag,
  Bell,
  Sun,
  Moon,
  Building2,
  Users2,
  HelpCircle,
  Scale,
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { signOut } from '@/app/(app)/actions'
import { useTheme } from '@/components/ThemeProvider'
import type { UserRole } from '@/lib/supabase/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/drills', label: 'Drill Library', icon: BookOpen },
  { href: '/drills/new', label: 'Drill Designer', icon: PenTool },
  { href: '/sessions', label: 'Session Planner', icon: CalendarDays },
  { href: '/chat', label: 'Coach Chat', icon: MessageSquare },
  { href: '/clubs', label: 'My Club', icon: Building2 },
  { href: '/groups', label: 'My Groups', icon: Users2 },
]

const profileItems = [
  { href: '/profile', label: 'My Profile', icon: User },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/how-to', label: 'How To', icon: HelpCircle },
  { href: '/legal/terms', label: 'Legal', icon: Scale },
]

interface AppSidebarProps {
  role: UserRole
  displayName: string | null
  avatarUrl: string | null
  unreadNotifications: number
}

export function AppSidebar({ role, displayName, avatarUrl, unreadNotifications }: AppSidebarProps) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
          <Image src="/logo.png" alt="18th Man" width={36} height={36} className="shrink-0" />
          <div>
            <p className="font-bold text-sm leading-tight tracking-wide">18TH MAN</p>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Rugby League</p>
          </div>
        </Link>
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
                      isActive={pathname.startsWith('/admin/users')}
                      render={<Link href="/admin/users" />}
                    >
                      <Users className="size-4" />
                      <span>Users</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/admin/categories')}
                      render={<Link href="/admin/categories" />}
                    >
                      <Tag className="size-4" />
                      <span>Categories</span>
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

      <SidebarFooter className="border-t border-zinc-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar size="sm">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? 'Coach'} />
            <AvatarFallback className="text-xs font-semibold" style={{ background: 'rgba(232,86,10,0.2)', color: '#e8560a' }}>
              {displayName ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{displayName ?? 'Coach'}</p>
          </div>
          <button
            onClick={toggle}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link href="/notifications" className="relative text-zinc-500 hover:text-zinc-300 transition-colors" title="Notifications">
            <Bell className="size-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-[#e8560a] text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
