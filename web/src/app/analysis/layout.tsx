import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function AnalysisLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 no-underline">
            <Image src="/logo.png" alt="18th Man" width={30} height={30} className="shrink-0" />
            <span className="text-sm font-extrabold tracking-wide uppercase">18th Man</span>
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-4 text-sm">
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
              <Link href="/signup" className="bg-[#e8560a] hover:bg-[#d14d09] text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">Sign up</Link>
            </div>
          )}
        </div>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
