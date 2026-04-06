import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Send welcome email for new signups (account created within last 5 minutes)
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email && user.created_at) {
        const ageMs = Date.now() - new Date(user.created_at).getTime()
        if (ageMs < 5 * 60 * 1000) {
          const email = user.email
          after(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', user.id)
              .single()
            await sendWelcomeEmail(email, profile?.display_name ?? '')
          })
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
