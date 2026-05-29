'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
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
  Settings,
  Shirt,
  BookMarked,
  Dumbbell,
  Clock,
  Headphones,
  Video,
  ClipboardList,
  Target,
  HeartPulse,
  ClipboardCheck,
  Sparkles,
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
  useSidebar,
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
  { href: '/weekly-focus', label: 'Weekly Focus', icon: Target },
  { href: '/podcasts', label: 'Podcasts', icon: Headphones },
  { href: '/wellbeing', label: 'Wellbeing', icon: HeartPulse },
  { href: '/analysis', label: 'Coaching Eye', icon: Video },
  { href: '/my-reviews', label: 'Match Reviews', icon: ClipboardCheck },
]

const resourceItems = [
  { href: '/positions', label: 'Positions Guide', icon: Shirt },
  { href: '/age-groups', label: 'Age Groups Guide', icon: Users },
  { href: '/skills', label: 'Fundamental Skills', icon: Dumbbell },
  { href: '/tag-rugby', label: 'Tag Rugby Rules', icon: Tag },
  { href: '/how-to', label: 'How-to & FAQ', icon: BookMarked },
]

const profileItems = [
  { href: '/profile', label: 'My Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
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
  const { setOpenMobile } = useSidebar()

  // Close the mobile sidebar whenever the route changes
  const closeMobile = () => setOpenMobile(false)

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 border-b border-sidebar-border">
        <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-2.5 no-underline">
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
                    isActive={pathname === href || (href === '/my-reviews' && pathname.startsWith('/my-reviews/'))}
                    render={<Link href={href} onClick={closeMobile} />}
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
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourceItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    render={<Link href={href} onClick={closeMobile} />}
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
                    render={<Link href={href} onClick={closeMobile} />}
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
                      render={<Link href="/admin" onClick={closeMobile} />}
                    >
                      <ShieldCheck className="size-4" />
                      <span>Admin</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/game-plans')}
                      render={<Link href="/game-plans" onClick={closeMobile} />}
                    >
                      <ClipboardList className="size-4" />
                      <span>Game Plans</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/admin/users')}
                      render={<Link href="/admin/users" onClick={closeMobile} />}
                    >
                      <Users className="size-4" />
                      <span>Users</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/admin/categories')}
                      render={<Link href="/admin/categories" onClick={closeMobile} />}
                    >
                      <Tag className="size-4" />
                      <span>Categories</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/admin/drills')}
                      render={<Link href="/admin/drills" onClick={closeMobile} />}
                    >
                      <Clock className="size-4" />
                      <span>Drill Approval</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/admin/import-playlist')}
                      render={<Link href="/admin/import-playlist" onClick={closeMobile} />}
                    >
                      <ListVideo className="size-4" />
                      <span>Import Playlist</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname === '/analyze'}
                      render={<Link href="/analyze" onClick={closeMobile} />}
                    >
                      <Video className="size-4" />
                      <span>Video Analysis</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/admin/content-engine')}
                      render={<Link href="/admin/content-engine" onClick={closeMobile} />}
                    >
                      <Sparkles className="size-4" />
                      <span>Content Engine</span>
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
          <Link href="/notifications" onClick={closeMobile} className="relative text-zinc-500 hover:text-zinc-300 transition-colors" title="Notifications">
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
        <HelpTrigger />
      </SidebarFooter>
    </Sidebar>
  )
}

function HelpTrigger() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = () => setDismissed(localStorage.getItem('helpWidgetDismissed') === 'true')
    check()
    window.addEventListener('show-help-widget', check)
    return () => window.removeEventListener('show-help-widget', check)
  }, [])

  if (!dismissed) return null

  return (
    <button
      onClick={() => window.dispatchEvent(new Event('show-help-widget'))}
      className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
    >
      <HelpCircle className="size-3" />
      Help
    </button>
  )
}
