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
  Mail,
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
  TrendingUp,
  ShoppingBag,
  ShieldAlert,
  Gavel,
  ChevronDown,
  Brain,
  Megaphone,
  type LucideIcon,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { signOut } from '@/app/(app)/actions'
import { useTheme } from '@/components/ThemeProvider'
import type { UserRole } from '@/lib/supabase/types'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
  roles?: UserRole[]
}

const overviewItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, isActive: (p) => p === '/dashboard' },
  { href: '/shop', label: 'Shop', icon: ShoppingBag, isActive: (p) => p === '/shop' || p.startsWith('/shop') },
  { href: '/analysis', label: 'Coaching Eye', icon: Video, isActive: (p) => p === '/analysis' },
]

const coachingToolItems: NavItem[] = [
  { href: '/drills', label: 'Drill Library', icon: BookOpen, isActive: (p) => p === '/drills' },
  { href: '/drills/new', label: 'Drill Designer', icon: PenTool, isActive: (p) => p === '/drills/new' },
  { href: '/sessions', label: 'Session Planner', icon: CalendarDays, isActive: (p) => p === '/sessions' },
  { href: '/weekly-focus', label: 'Weekly Focus', icon: Target, isActive: (p) => p === '/weekly-focus' },
]

const analysisItems: NavItem[] = [
  { href: '/my-reviews', label: 'Match Reviews', icon: ClipboardCheck, isActive: (p) => p === '/my-reviews' || p.startsWith('/my-reviews/') },
  {
    href: '/analyst/progression',
    label: 'Match Analysis',
    icon: TrendingUp,
    isActive: (p) => p.startsWith('/analyst'),
    roles: ['coach', 'admin'],
  },
  {
    href: '/admin/coach-dna',
    label: 'Coach DNA',
    icon: Brain,
    isActive: (p) => p.startsWith('/admin/coach-dna'),
    roles: ['coach', 'admin'],
  },
]

const communityItems: NavItem[] = [
  { href: '/chat', label: 'Coach Chat', icon: MessageSquare, isActive: (p) => p === '/chat' },
  { href: '/clubs', label: 'My Club', icon: Building2, isActive: (p) => p === '/clubs' },
  { href: '/groups', label: 'My Groups', icon: Users2, isActive: (p) => p === '/groups' },
]

const resourceItems: NavItem[] = [
  { href: '/positions', label: 'Positions Guide', icon: Shirt, isActive: (p) => p === '/positions' },
  { href: '/age-groups', label: 'Age Groups Guide', icon: Users, isActive: (p) => p === '/age-groups' },
  { href: '/skills', label: 'Fundamental Skills', icon: Dumbbell, isActive: (p) => p === '/skills' },
  { href: '/tag-rugby', label: 'Tag Rugby Rules', icon: Tag, isActive: (p) => p === '/tag-rugby' },
  { href: '/how-to', label: 'How-to & FAQ', icon: BookMarked, isActive: (p) => p === '/how-to' },
  { href: '/podcasts', label: 'Podcasts', icon: Headphones, isActive: (p) => p === '/podcasts' },
  { href: '/wellbeing', label: 'Wellbeing', icon: HeartPulse, isActive: (p) => p === '/wellbeing' },
]

const profileItems: NavItem[] = [
  { href: '/profile', label: 'My Profile', icon: User, isActive: (p) => p === '/profile' },
  { href: '/settings', label: 'Settings', icon: Settings, isActive: (p) => p === '/settings' },
]

const adminItems: NavItem[] = [
  { href: '/admin', label: 'Admin', icon: ShieldCheck, isActive: (p) => p === '/admin' },
  { href: '/game-plans', label: 'Game Plans', icon: ClipboardList, isActive: (p) => p.startsWith('/game-plans') },
  { href: '/admin/users', label: 'Users', icon: Users, isActive: (p) => p.startsWith('/admin/users') },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, isActive: (p) => p.startsWith('/admin/announcements') },
  { href: '/admin/feedback/safeguarding', label: 'Safeguarding Queue', icon: ShieldAlert, isActive: (p) => p.startsWith('/admin/feedback/safeguarding') },
  { href: '/admin/feedback/disputes', label: 'Response Disputes', icon: Gavel, isActive: (p) => p.startsWith('/admin/feedback/disputes') },
  { href: '/admin/categories', label: 'Categories', icon: Tag, isActive: (p) => p.startsWith('/admin/categories') },
  { href: '/admin/drills', label: 'Drill Approval', icon: Clock, isActive: (p) => p.startsWith('/admin/drills') },
  { href: '/admin/import-playlist', label: 'Import Playlist', icon: ListVideo, isActive: (p) => p.startsWith('/admin/import-playlist') },
  { href: '/analyze', label: 'Video Analysis', icon: Video, isActive: (p) => p === '/analyze' },
  { href: '/admin/content-engine', label: 'Content Engine', icon: Sparkles, isActive: (p) => p.startsWith('/admin/content-engine') },
  { href: '/admin/shop', label: 'Shop', icon: ShoppingBag, isActive: (p) => p.startsWith('/admin/shop') },
]

function visibleFor(items: NavItem[], role: UserRole) {
  return items.filter((item) => !item.roles || item.roles.includes(role))
}

function containsActiveRoute(items: NavItem[], pathname: string) {
  return items.some((item) => item.isActive(pathname))
}

function NavMenuItems({
  items,
  role,
  pathname,
  closeMobile,
}: {
  items: NavItem[]
  role: UserRole
  pathname: string
  closeMobile: () => void
}) {
  return (
    <>
      {visibleFor(items, role).map(({ href, label, icon: Icon, isActive }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton isActive={isActive(pathname)} render={<Link href={href} onClick={closeMobile} />}>
            <Icon className="size-4" />
            <span>{label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  )
}

export function CollapsibleNavGroup({
  label,
  items,
  role,
  pathname,
  closeMobile,
  shouldBeOpen,
}: {
  label: string
  items: NavItem[]
  role: UserRole
  pathname: string
  closeMobile: () => void
  shouldBeOpen: boolean
}) {
  const visibleItems = visibleFor(items, role)
  const [open, setOpen] = useState(shouldBeOpen)
  // AppSidebar persists across client-side navigations (it isn't remounted per
  // route), so a group must re-open itself when navigation lands the active
  // route inside it — otherwise the highlighted link can end up hidden inside
  // a collapsed group. Auto-open only; never auto-close a group the user opened.
  // Adjusting state during render (React's recommended pattern for deriving
  // state from a prop change) instead of an effect, per react-hooks/set-state-in-effect.
  const [prevShouldBeOpen, setPrevShouldBeOpen] = useState(shouldBeOpen)
  if (shouldBeOpen !== prevShouldBeOpen) {
    setPrevShouldBeOpen(shouldBeOpen)
    if (shouldBeOpen) setOpen(true)
  }
  if (visibleItems.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<SidebarMenuItem className="group/collapsible" />}>
      <CollapsibleTrigger render={<SidebarMenuButton />}>
        <span>{label}</span>
        <ChevronDown className="ml-auto size-4 shrink-0 transition-transform group-data-open/collapsible:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {visibleItems.map(({ href, label: itemLabel, icon: Icon, isActive }) => (
            <SidebarMenuSubItem key={href}>
              <SidebarMenuSubButton isActive={isActive(pathname)} render={<Link href={href} onClick={closeMobile} />}>
                <Icon className="size-4" />
                <span>{itemLabel}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

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
              <NavMenuItems items={overviewItems} role={role} pathname={pathname} closeMobile={closeMobile} />
              <CollapsibleNavGroup
                label="Coaching Tools"
                items={coachingToolItems}
                role={role}
                pathname={pathname}
                closeMobile={closeMobile}
                shouldBeOpen={containsActiveRoute(coachingToolItems, pathname)}
              />
              <CollapsibleNavGroup
                label="Analysis & Development"
                items={analysisItems}
                role={role}
                pathname={pathname}
                closeMobile={closeMobile}
                shouldBeOpen={containsActiveRoute(analysisItems, pathname)}
              />
              <CollapsibleNavGroup
                label="Community"
                items={communityItems}
                role={role}
                pathname={pathname}
                closeMobile={closeMobile}
                shouldBeOpen={containsActiveRoute(communityItems, pathname)}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavMenuItems items={resourceItems} role={role} pathname={pathname} closeMobile={closeMobile} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavMenuItems items={profileItems} role={role} pathname={pathname} closeMobile={closeMobile} />
              {role === 'admin' && (
                <CollapsibleNavGroup
                  label="Admin"
                  items={adminItems}
                  role={role}
                  pathname={pathname}
                  closeMobile={closeMobile}
                  shouldBeOpen={containsActiveRoute(adminItems, pathname)}
                />
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
        <Link
          href="/contact"
          className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
        >
          <Mail className="size-3" />
          Contact
        </Link>
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
