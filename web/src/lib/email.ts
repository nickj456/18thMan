import { Resend } from 'resend'

const FROM = 'The 18th Man <onboarding@resend.dev>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

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

// ── Shared layout ─────────────────────────────────────────────────────────────

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${SITE_URL}/logo.png" alt="18th Man" width="56" height="56" style="display:block;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#161616;border:1px solid #2a2a2a;border-radius:16px;padding:40px 40px 36px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                18th Man · Rugby League Coaching Platform<br/>
                <a href="${SITE_URL}" style="color:#52525b;">18thman.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${text}</h1>`
}

function para(text: string): string {
  return `<p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6;">${text}</p>`
}

function featureList(items: string[]): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;">
        <span style="color:#10b981;margin-right:10px;">✓</span>
        <span style="color:#d4d4d4;font-size:14px;">${item}</span>
      </td>
    </tr>`).join('')
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:20px 0;">
      ${rows}
    </table>`
}

function ctaButton(text: string, href: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr>
        <td style="background:#e8560a;border-radius:10px;">
          <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.2px;">${text} →</a>
        </td>
      </tr>
    </table>`
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;" />`
}

function greeting(name: string): string {
  return para(`Hi ${name || 'Coach'},`)
}

function sign(): string {
  return `${divider()}<p style="margin:0;font-size:13px;color:#52525b;">— The 18th Man team</p>`
}

const PRICING_URL = '${SITE_URL}/pricing'

// ── Emails ────────────────────────────────────────────────────────────────────

/** Sent immediately after a new user signs up */
export async function sendWelcomeEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(to, 'Welcome to 18th Man', layout(`
    ${heading('Welcome to 18th Man.')}
    ${para('The coaching platform built for rugby league.')}
    ${divider()}
    ${greeting(displayName)}
    ${para("You're in. Here are three things to try first:")}
    ${featureList([
      'Create your first drill — use the visual designer to draw it up',
      'Explore the drill library — see what other coaches have shared',
      'Try the AI coaching chat — ask it anything about technique or session planning',
    ])}
    ${ctaButton('Go to your dashboard', '${SITE_URL}/dashboard')}
    ${sign()}
  `))
}

/** Sent when a 48-hour trial is activated */
export async function sendTrialStartEmail(to: string, displayName: string, trialEndsAt: Date): Promise<EmailResult> {
  const endsStr = trialEndsAt.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
  return send(to, "You've unlocked 48 hours of full access", layout(`
    ${heading("You've unlocked 48 hours of full access.")}
    ${para(`Trial active until <strong style="color:#ffffff;">${endsStr}</strong>.`)}
    ${divider()}
    ${greeting(displayName)}
    ${para("You've been using 18th Man and we want you to experience everything. <strong style=\"color:#ffffff;\">All premium features are now unlocked for 48 hours.</strong>")}
    ${para("Here's what to try while you have full access:")}
    ${featureList([
      'Coaching groups — collaborate with your staff on shared session plans',
      'AI session guidance (GameSense) — AI-powered rotation suggestions',
      'PDF export — printable session plans to take to training',
      'Club private drills — keep your team\'s moves locked to your club',
    ])}
    ${para(`After 48 hours, features will revert unless your club subscribes.`)}
    ${ctaButton('Explore premium features', '${SITE_URL}/dashboard')}
    ${sign()}
  `))
}

/** Sent 24 hours before trial expiry */
export async function sendTrialExpiryWarningEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(to, '24 hours left on your 18th Man trial', layout(`
    ${heading('24 hours left on your trial.')}
    ${para('Your premium access expires tomorrow.')}
    ${divider()}
    ${greeting(displayName)}
    ${para("Your 18th Man trial ends in <strong style=\"color:#e8560a;\">24 hours</strong>. After that, these features will be locked:")}
    ${featureList([
      'Coaching groups',
      'AI session guidance (GameSense)',
      'PDF export',
      'Club private drills',
    ])}
    ${para("One club subscription covers your entire coaching staff.")}
    ${ctaButton('Upgrade your club — from £9.99/mo', PRICING_URL)}
    ${sign()}
  `))
}

/** Sent when a trial expires */
export async function sendTrialExpiredEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(to, 'Your 18th Man trial has ended', layout(`
    ${heading('Your trial has ended.')}
    ${para('Upgrade to keep your premium access.')}
    ${divider()}
    ${greeting(displayName)}
    ${para("Your 48-hour trial is up. Premium features have been locked — but everything you created is still there.")}
    ${featureList([
      'Coaching groups',
      'AI session guidance (GameSense)',
      'PDF export',
      'Club private drills',
    ])}
    ${para("Upgrade your club to unlock everything again. One subscription covers all your coaching staff.")}
    ${ctaButton('See plans and pricing', PRICING_URL)}
    ${sign()}
  `))
}

/** Sent when a free user hits the 20-drill limit */
export async function sendDrillLimitEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(to, "You've created 20 drills — unlock unlimited", layout(`
    ${heading("You've built a serious drill library.")}
    ${para('20 drills created — you\'ve hit the free limit.')}
    ${divider()}
    ${greeting(displayName)}
    ${para("That's a lot of drills. Upgrade your club subscription to create unlimited drills, plus unlock:")}
    ${featureList([
      'Unlimited drills',
      'Coaching groups',
      'AI session guidance (GameSense)',
      'PDF export',
    ])}
    ${ctaButton('Upgrade your club', PRICING_URL)}
    ${sign()}
  `))
}

/** Sent when a free user tries to access a gated feature */
export async function sendUpgradeNudgeEmail(to: string, displayName: string, feature: string): Promise<EmailResult> {
  return send(to, `Unlock ${feature} with a club subscription`, layout(`
    ${heading(`Unlock ${feature}.`)}
    ${para('This feature is available to club subscribers.')}
    ${divider()}
    ${greeting(displayName)}
    ${para(`You tried to use <strong style="color:#ffffff;">${feature}</strong> today. It's a premium feature available on the Coach Pro and Club plans.`)}
    ${para("One subscription covers your whole coaching staff.")}
    ${ctaButton('See what\'s included', PRICING_URL)}
    ${sign()}
  `))
}
