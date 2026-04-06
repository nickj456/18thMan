import { Resend } from 'resend'

const FROM = 'The 18th Man <hello@18thman.app>'

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

export interface EmailResult {
  success: boolean
  error?: string
}

async function send(to: string, subject: string, html: string): Promise<EmailResult> {
  const resend = getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not configured' }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/** Sent immediately after a new user signs up */
export async function sendWelcomeEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(
    to,
    'Welcome to 18th Man',
    `<p>Hi ${displayName ?? 'Coach'},</p>
<p>Welcome to <strong>18th Man</strong> — the coaching platform built for rugby league.</p>
<p>Here are three things to try first:</p>
<ol>
  <li><strong>Create your first drill</strong> — use the visual designer to draw it up</li>
  <li><strong>Explore the drill library</strong> — see what other coaches have shared</li>
  <li><strong>Try the AI coaching chat</strong> — ask it anything about technique or session planning</li>
</ol>
<p>Good luck on the training ground.</p>
<p>— The 18th Man team</p>`
  )
}

/** Sent when a 48-hour trial is activated */
export async function sendTrialStartEmail(to: string, displayName: string, trialEndsAt: Date): Promise<EmailResult> {
  const endsStr = trialEndsAt.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })
  return send(
    to,
    "You've unlocked 48 hours of full access",
    `<p>Hi ${displayName ?? 'Coach'},</p>
<p>You've been using 18th Man and we want you to experience everything it has to offer. <strong>All premium features are now unlocked for 48 hours</strong> — until ${endsStr}.</p>
<p>Here's what to try while you have full access:</p>
<ul>
  <li><strong>Coaching groups</strong> — collaborate with your coaching staff on shared session plans</li>
  <li><strong>AI session guidance (GameSense)</strong> — get AI-powered rotation suggestions for your group</li>
  <li><strong>PDF export</strong> — generate a clean printable session plan to take to training</li>
  <li><strong>Club private drills</strong> — keep your team's moves locked to your club</li>
</ul>
<p>After 48 hours, features will revert unless your club subscribes.</p>
<p>— The 18th Man team</p>`
  )
}

/** Sent 24 hours before trial expiry */
export async function sendTrialExpiryWarningEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(
    to,
    '24 hours left on your 18th Man trial',
    `<p>Hi ${displayName ?? 'Coach'},</p>
<p>Just a heads up — your 18th Man trial ends in <strong>24 hours</strong>.</p>
<p>After it expires, coaching groups, AI guidance, PDF export, and club private drills will be locked until your club subscribes.</p>
<p><a href="https://18thman.app/pricing">Upgrade your club for £19.99/month</a> and keep everything.</p>
<p>— The 18th Man team</p>`
  )
}

/** Sent when a trial expires */
export async function sendTrialExpiredEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(
    to,
    'Your 18th Man trial has ended',
    `<p>Hi ${displayName ?? 'Coach'},</p>
<p>Your 48-hour trial has ended and premium features have been locked.</p>
<p>To keep access to coaching groups, AI guidance, PDF export, and club private drills, upgrade your club subscription.</p>
<p><a href="https://18thman.app/pricing">See plans and pricing →</a></p>
<p>— The 18th Man team</p>`
  )
}

/** Sent when a free user hits the 20-drill limit */
export async function sendDrillLimitEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(
    to,
    "You've created 20 drills — unlock unlimited",
    `<p>Hi ${displayName ?? 'Coach'},</p>
<p>You've hit the free limit of 20 drills on 18th Man. That's a serious drill library!</p>
<p>Upgrade your club subscription to create unlimited drills, plus unlock coaching groups, AI guidance, PDF export, and more.</p>
<p><a href="https://18thman.app/pricing">Upgrade your club →</a></p>
<p>— The 18th Man team</p>`
  )
}

/** Sent when a free user tries to access a gated feature */
export async function sendUpgradeNudgeEmail(to: string, displayName: string, feature: string): Promise<EmailResult> {
  return send(
    to,
    `Unlock ${feature} with a club subscription`,
    `<p>Hi ${displayName ?? 'Coach'},</p>
<p>You tried to use <strong>${feature}</strong> today — this is a premium feature available to club subscribers.</p>
<p>One subscription covers your whole coaching staff. Unlock everything for £19.99/month.</p>
<p><a href="https://18thman.app/pricing">See what's included →</a></p>
<p>— The 18th Man team</p>`
  )
}
