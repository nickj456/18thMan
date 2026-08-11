'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSafeRedirectPath } from '@/lib/redirect-safety'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const next = formData.get('next') as string | null

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get('password') as string,
  })

  if (error) {
    const nextParam = isSafeRedirectPath(next) ? `&next=${encodeURIComponent(next)}` : ''
    redirect(`/login?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}${nextParam}`)
  }

  revalidatePath('/', 'layout')
  redirect(isSafeRedirectPath(next) ? next : '/dashboard')
}

export async function loginWithOAuth(provider: 'google' | 'facebook' | 'github', formData: FormData) {
  const supabase = await createClient()
  const next = formData.get('next') as string | null

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback${isSafeRedirectPath(next) ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  if (data.url) redirect(data.url)
}
