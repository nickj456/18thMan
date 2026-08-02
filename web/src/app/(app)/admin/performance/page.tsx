import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { RoleTiles, SignupsChart, CumulativeChart } from './GrowthSection'
import { DrillsChart, SessionPlansChart, MessagesChart, PodcastPlaysTile } from './ActivitySection'
import {
  TotalRevenueTile,
  ActiveClubSubsTile,
  ActiveCoachSubsTile,
  RevenueByDayChart,
  RevenueByProductList,
} from './RevenueSection'
import { PageViewsChart, TopPagesList } from './PageViewsSection'
import { TileSkeleton, ChartSkeleton } from './components'

export const metadata = { title: 'App Performance — Admin' }

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">{children}</h2>
  )
}

export default async function AdminPerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-10 max-w-5xl">
      <div>
        <h1 className="app-heading text-2xl">App Performance</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Sign-ups, activity, revenue &amp; page traffic</p>
      </div>

      <section>
        <SectionHeading>Growth</SectionHeading>
        <div className="space-y-3">
          <Suspense fallback={<TileSkeleton />}>
            <RoleTiles />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <SignupsChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <CumulativeChart />
          </Suspense>
        </div>
      </section>

      <section>
        <SectionHeading>Activity</SectionHeading>
        <div className="space-y-3">
          <Suspense fallback={<TileSkeleton />}>
            <PodcastPlaysTile />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <DrillsChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <SessionPlansChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <MessagesChart />
          </Suspense>
        </div>
      </section>

      <section>
        <SectionHeading>Revenue</SectionHeading>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Suspense fallback={<TileSkeleton />}>
              <TotalRevenueTile />
            </Suspense>
            <Suspense fallback={<TileSkeleton />}>
              <ActiveClubSubsTile />
            </Suspense>
            <Suspense fallback={<TileSkeleton />}>
              <ActiveCoachSubsTile />
            </Suspense>
          </div>
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueByDayChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueByProductList />
          </Suspense>
        </div>
      </section>

      <section>
        <SectionHeading>Page Views</SectionHeading>
        <div className="space-y-3">
          <Suspense fallback={<ChartSkeleton />}>
            <PageViewsChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <TopPagesList />
          </Suspense>
        </div>
      </section>
    </div>
  )
}
