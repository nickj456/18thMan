/**
 * One-off script: generate the lead magnet PDF and email it.
 * Run from web/: npx tsx scripts/send-test-plan.mjs [email]
 */
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'path'

// Load env vars into process.env so email.ts can read RESEND_API_KEY etc.
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?$/)
  if (match) process.env[match[1]] = match[2]
}

const TO = process.argv[2] ?? 'nick.johnsonn@gmail.com'
console.log(`Generating PDF and sending to ${TO}...`)

const { LeadMagnetSessionPDF } = await import('../src/components/landing/LeadMagnetSessionPDF.tsx')
const { sendLeadMagnetEmail } = await import('../src/lib/email.ts')

const logoPath = resolve(process.cwd(), 'public/logo.png')
const logoSrc = existsSync(logoPath)
  ? `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`
  : undefined
const buffer = await renderToBuffer(createElement(LeadMagnetSessionPDF, { logoSrc }))
console.log(`PDF generated — ${buffer.byteLength} bytes`)

const result = await sendLeadMagnetEmail(TO, null, Buffer.from(buffer))

if (!result.success) {
  console.error('Email error:', result.error)
  process.exit(1)
}

console.log(`Sent successfully to ${TO}`)
