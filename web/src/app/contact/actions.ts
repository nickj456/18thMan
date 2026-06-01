'use server'

import { send } from '@/lib/email'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function submitContact(prevState: { error?: string; success?: boolean }, formData: FormData) {
  const name    = (formData.get('name') as string)?.trim()
  const email   = (formData.get('email') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim() || 'General'
  const message = (formData.get('message') as string)?.trim()

  if (!name || !email || !message) return { error: 'Please fill in all required fields.' }
  if (name.length > 200 || email.length > 200 || subject.length > 200 || message.length > 5000) {
    return { error: 'One or more fields exceed the maximum allowed length.' }
  }

  const html = `
    <p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>
    <p><strong>Subject:</strong> ${esc(subject)}</p>
    <hr />
    <p>${esc(message).replace(/\n/g, '<br />')}</p>
  `

  const result = await send('Hello@18thMan.app', `[Contact] ${esc(subject)} — from ${esc(name)}`, html)
  if (!result.success) return { error: 'Failed to send your message. Please try again.' }

  return { success: true }
}
