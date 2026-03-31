import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Tag, Plus } from 'lucide-react'
import { CategoryControls } from './CategoryControls'
import { createCategory } from './actions'

export const metadata = { title: 'Drill Categories — Admin' }

export default async function AdminCategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: categories } = await supabase
    .from('drill_categories')
    .select('id, name, slug, sort_order, created_at')
    .order('sort_order', { ascending: true })

  // Count drills per category
  const { data: drillCounts } = await supabase
    .from('drills')
    .select('category_id')

  const countMap = (drillCounts ?? []).reduce<Record<string, number>>((acc, d) => {
    if (d.category_id) acc[d.category_id] = (acc[d.category_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Admin Panel
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tag size={20} className="text-emerald-400" /> Drill Categories
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{categories?.length ?? 0} categories</p>
        </div>
      </div>

      {/* Category list */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        {!categories?.length ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-600">No categories yet</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800/40 transition-colors">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{cat.name}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    /{cat.slug} · {countMap[cat.id] ?? 0} drill{(countMap[cat.id] ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <CategoryControls
                  id={cat.id}
                  name={cat.name}
                  isFirst={idx === 0}
                  isLast={idx === (categories.length - 1)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add category */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus size={14} className="text-emerald-400" /> Add Category
        </h2>
        <form action={createCategory} className="flex gap-2">
          <input
            name="name"
            placeholder="Category name…"
            required
            className="flex-1 text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
