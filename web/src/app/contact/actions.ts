'use server'

import { send } from '@/lib/email'

export async function submitContact(prevState: { error?: string; success?: boolean }, formData: FormData) {
  const name    = (formData.get('name') as string)?.trim()
  const email   = (formData.get('email') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim() || 'General'
  const message = (formData.get('message') as string)?.trim()

  if (!name || !email || !message) return { error: 'Please fill in all required fields.' }

  const html = `
    <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <hr />
    <p>${message.replace(/\n/g, '<br />')}</p>
  `

  const result = await send('Hello@18thMan.app', `[Contact] ${subject} — from ${name}`, html)
  if (!result.success) return { error: 'Failed to send your message. Please try again.' }

  return { success: true }
}
