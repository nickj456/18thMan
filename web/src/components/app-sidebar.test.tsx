import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LayoutDashboard } from 'lucide-react'
import { AppSidebar, CollapsibleNavGroup } from './app-sidebar'
import { SidebarProvider, SidebarMenu } from '@/components/ui/sidebar'
import type { UserRole } from '@/lib/supabase/types'

const mockUsePathname = vi.fn(() => '/dashboard')

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

vi.mock('@/app/(app)/actions', () => ({
  signOut: vi.fn(),
}))

beforeEach(() => {
  mockUsePathname.mockReturnValue('/dashboard')
  // useIsMobile (via SidebarProvider) reads window.matchMedia; jsdom has no implementation.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderSidebar(role: UserRole, pathname = '/dashboard') {
  mockUsePathname.mockReturnValue(pathname)
  return render(
    <SidebarProvider>
      <AppSidebar role={role} displayName="Test Coach" avatarUrl={null} unreadNotifications={0} />
    </SidebarProvider>
  )
}

describe('AppSidebar', () => {
  it.each<[UserRole, boolean]>([
    ['admin', true],
    ['coach', false],
    ['viewer', false],
  ])('shows the Admin group trigger only for admin role (role=%s)', (role, expectAdmin) => {
    renderSidebar(role)
    if (expectAdmin) {
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument()
    } else {
      expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument()
    }
  })

  it.each<[UserRole, boolean, boolean]>([
    ['admin', true, true],
    ['coach', true, true],
    ['viewer', false, false],
  ])('gates Coach DNA and Match Analysis by role (role=%s)', async (role, expectCoachDna, expectMatchAnalysis) => {
    const user = userEvent.setup()
    renderSidebar(role)
    await user.click(screen.getByRole('button', { name: /Analysis & Development/i }))

    if (expectCoachDna) {
      expect(screen.getByRole('link', { name: /Coach DNA/i })).toBeInTheDocument()
    } else {
      expect(screen.queryByRole('link', { name: /Coach DNA/i })).not.toBeInTheDocument()
    }

    if (expectMatchAnalysis) {
      expect(screen.getByRole('link', { name: /Match Analysis/i })).toBeInTheDocument()
    } else {
      expect(screen.queryByRole('link', { name: /Match Analysis/i })).not.toBeInTheDocument()
    }
  })

  it('expands the group containing the current route by default, leaves others closed', () => {
    renderSidebar('admin', '/admin/coach-dna')

    expect(screen.getByRole('button', { name: /Analysis & Development/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Coaching Tools/i })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('link', { name: /Coach DNA/i })).toBeInTheDocument()
  })

  it('marks the active route link so it can be styled distinctly from inactive links', () => {
    renderSidebar('admin', '/admin/coach-dna')

    const activeLink = screen.getByRole('link', { name: /Coach DNA/i })
    const inactiveLink = screen.getByRole('link', { name: /Match Analysis/i })
    expect(activeLink).toHaveAttribute('data-active')
    expect(inactiveLink).not.toHaveAttribute('data-active')
  })

  it.each([
    ['/chat', 'Community'],
    ['/admin/users', 'Admin'],
  ])('expands the %s group by default when the current route is %s', (pathname, groupLabel) => {
    renderSidebar('admin', pathname)
    expect(screen.getByRole('button', { name: new RegExp(groupLabel, 'i') })).toHaveAttribute('aria-expanded', 'true')
  })

  it('auto-opens a group when client-side navigation (no remount) lands the active route inside it', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    const { rerender } = render(
      <SidebarProvider>
        <AppSidebar role="admin" displayName="Test Coach" avatarUrl={null} unreadNotifications={0} />
      </SidebarProvider>
    )
    expect(screen.getByRole('button', { name: /Coaching Tools/i })).toHaveAttribute('aria-expanded', 'false')

    // Simulate a same-instance client-side navigation (AppSidebar is not
    // remounted by the app's persistent layout) into a route inside a
    // currently-collapsed group.
    mockUsePathname.mockReturnValue('/drills/new')
    rerender(
      <SidebarProvider>
        <AppSidebar role="admin" displayName="Test Coach" avatarUrl={null} unreadNotifications={0} />
      </SidebarProvider>
    )

    expect(screen.getByRole('button', { name: /Coaching Tools/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: /Drill Designer/i })).toBeInTheDocument()
  })

  it('renders nothing for a group with no items visible to the current role', () => {
    render(
      <SidebarProvider>
        <SidebarMenu>
          <CollapsibleNavGroup
            label="Admin Only Group"
            items={[{ href: '/secret', label: 'Secret', icon: LayoutDashboard, isActive: () => false, roles: ['admin'] }]}
            role="viewer"
            pathname="/dashboard"
            closeMobile={() => {}}
            shouldBeOpen={false}
          />
        </SidebarMenu>
      </SidebarProvider>
    )

    expect(screen.queryByRole('button', { name: 'Admin Only Group' })).not.toBeInTheDocument()
  })
})
