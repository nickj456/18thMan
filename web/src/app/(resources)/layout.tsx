import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'

export default async function ResourcesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 no-underline">
            <Image src="/logo.png" alt="18th Man" width={28} height={28} className="shrink-0" />
            <span className="font-bold text-sm tracking-wide">18TH MAN</span>
          </Link>
          {user ? (
            <Link
              href="/drills"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={13} />
              Back to app
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-xs text-zinc-400 hover:text-white transition-colors">
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-xs font-semibold bg-[#e8560a] hover:bg-[#d14d09] text-white px-3 py-1.5 rounded-md transition-colors"
              >
                Sign up free
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
