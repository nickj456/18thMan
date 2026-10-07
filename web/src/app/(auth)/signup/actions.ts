'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { isSafeRedirectPath } from '@/lib/redirect-safety'
import { USERNAME_MAX_LENGTH, isValidNewUsername } from '@/lib/username'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = ((formData.get('username') as string | null) ?? '').trim()
  const next = formData.get('next') as string | null
  const nextParam = isSafeRedirectPath(next) ? `&next=${encodeURIComponent(next)}` : ''

  if (!email || !password || !username) redirect(`/signup?error=All+fields+are+required${nextParam}`)
  if (username.length > USERNAME_MAX_LENGTH) redirect(`/signup?error=Username+must+be+${USERNAME_MAX_LENGTH}+characters+or+fewer${nextParam}`)
  if (!isValidNewUsername(username)) redirect(`/signup?error=Username+can+only+use+lowercase+letters%2C+numbers%2C+hyphens+and+underscores${nextParam}`)
  if (password.length > 128) redirect(`/signup?error=Password+is+too+long${nextParam}`)

  const emailRedirectParam = isSafeRedirectPath(next) ? `?next=${encodeURIComponent(next)}` : ''

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback${emailRedirectParam}`,
    },
  })

  if (error) {
    const msg = error.code === 'user_already_exists'
      ? 'An account with this email already exists.'
      : 'Signup failed. Please try again.'
    redirect(`/signup?error=${encodeURIComponent(msg)}${nextParam}`)
  }

  await sendWelcomeEmail(email, username)

  redirect(`/signup?success=check-email${nextParam}`)
}
