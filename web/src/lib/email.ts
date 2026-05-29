import { Resend } from 'resend'

const FROM = '18th Man <hello@18thman.app>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

export interface EmailResult {
  success: boolean
  error?: string
}

async function send(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[],
): Promise<EmailResult> {
  const resend = getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not configured' }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, attachments })
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
  return `${divider()}<p style="margin:0;font-size:13px;color:#52525b;">The 18th Man team</p>`
}

const PRICING_URL = `${SITE_URL}/pricing`

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

const DRIP_WEEK_META = [
  { title: 'Ball Handling &amp; Passing', detail: 'Passing grids, offloads, quick hands', mins: '70 min' },
  { title: 'Defensive Shape',             detail: 'Flat line drill, tackle technique, conditioned game', mins: '70 min' },
  { title: 'Attack Plays &amp; Structure', detail: 'Set pieces, broken-field running, small-sided game', mins: '75 min' },
  { title: 'Full Run Session',             detail: 'Review weeks 1–3, full training game', mins: '75 min' },
]

/** Sent to a lead with a single week's session plan PDF */
export async function sendLeadMagnetEmail(
  to: string,
  ageGroup: string | null,
  pdfBuffer: Buffer,
  weekNumber: number,
): Promise<EmailResult> {
  const ageNote = ageGroup ? ` — ${ageGroup}` : ''
  const meta = DRIP_WEEK_META[weekNumber - 1]
  const isFirst = weekNumber === 1

  const subjectPrefix = isFirst
    ? 'Your free coaching plan starts here'
    : `Week ${weekNumber} of your coaching plan is ready`

  const intro = isFirst
    ? `Your 4-week rugby league training plan kicks off with Week 1. You'll get a new session each week — <strong style="color:#18181b;">Week 2 arrives in 7 days.</strong>`
    : `Week ${weekNumber} of your 4-week plan is attached. ${weekNumber < 4 ? `Week ${weekNumber + 1} is coming next week.` : "This is the final session — make it count."}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f4f5" style="background:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

    <!-- Logo -->
    <tr><td align="center" style="padding-bottom:24px;">
      <img src="${SITE_URL}/logo.png" alt="18th Man" width="44" height="44" style="display:block;" />
    </td></tr>

    <!-- Header -->
    <tr><td bgcolor="#e8560a" style="background:#e8560a;border-radius:12px 12px 0 0;padding:24px 32px 20px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1.8px;text-transform:uppercase;">Week ${weekNumber} of 4${ageNote}</p>
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.3px;">${meta.title}</h1>
    </td></tr>

    <!-- Body -->
    <tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px 32px 32px;border:1px solid #e4e4e7;border-top:none;">

      <p style="margin:0 0 6px;font-size:15px;color:#18181b;line-height:1.6;">Hey Coach,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">${intro}</p>

      <!-- Session summary -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
        <tr>
          <td width="44" bgcolor="#e8560a" align="center" valign="middle" style="background:#e8560a;padding:18px 0;">
            <span style="font-size:20px;font-weight:800;color:#ffffff;">${weekNumber}</span>
          </td>
          <td bgcolor="#ffffff" style="background:#ffffff;padding:14px 16px;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#18181b;">${meta.title}</p>
            <p style="margin:0;font-size:12px;color:#71717a;">${meta.detail} &nbsp;&middot;&nbsp; <strong style="color:#e8560a;">${meta.mins}</strong></p>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;font-size:14px;color:#71717a;line-height:1.6;">Session plan is attached as a PDF — print it and take it to training.</p>

      <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 20px;" />
      <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">The 18th Man team</p>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr><td bgcolor="#e8560a" style="background:#e8560a;border-radius:8px;">
          <a href="${SITE_URL}/signup" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;">Create a free account →</a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:12px;color:#a1a1aa;">Free for all coaches &nbsp;&middot;&nbsp; No credit card needed</p>

    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding-top:20px;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
        18th Man &nbsp;&middot;&nbsp; Rugby League Coaching Platform<br/>
        <a href="${SITE_URL}" style="color:#a1a1aa;">18thman.app</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`

  return send(
    to,
    `${subjectPrefix}${ageNote} — 18th Man`,
    html,
    [{ filename: `18th-man-week-${weekNumber}-session-plan.pdf`, content: pdfBuffer }],
  )
}

/** Sent after Week 4 to convert leads into sign-ups */
export async function sendDripConversionEmail(
  to: string,
  ageGroup: string | null,
): Promise<EmailResult> {
  const ageNote = ageGroup ? ` — ${ageGroup}` : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f4f5" style="background:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

    <!-- Logo -->
    <tr><td align="center" style="padding-bottom:24px;">
      <img src="${SITE_URL}/logo.png" alt="18th Man" width="44" height="44" style="display:block;" />
    </td></tr>

    <!-- Header -->
    <tr><td bgcolor="#0d1117" style="background:#0d1117;border-radius:12px 12px 0 0;padding:24px 32px 20px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#e8560a;letter-spacing:1.8px;text-transform:uppercase;">4-Week Plan Complete${ageNote}</p>
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.3px;">You've finished the plan. What's next?</h1>
    </td></tr>

    <!-- Body -->
    <tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px 32px 32px;border:1px solid #e4e4e7;border-top:none;">

      <p style="margin:0 0 6px;font-size:15px;color:#18181b;line-height:1.6;">Hey Coach,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        You've worked through all four sessions. That's a full month of structured, purposeful coaching — well done.
      </p>

      <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;">
        If you want to keep building on it, 18th Man lets you design your own drills, plan sessions with AI, and share what works with your coaching staff — all for free.
      </p>

      <!-- Feature list -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
        ${[
          ['🎨', 'Visual Drill Designer', 'Build and save your own drills on a canvas'],
          ['📋', 'Session Planning', 'Plan full training weeks with timings and structure'],
          ['🤖', 'AI Coaching Chat', 'Get tactical advice and session ideas instantly'],
          ['🏉', 'Club &amp; Group Tools', 'Share plans with your whole coaching staff'],
        ].map(([icon, title, desc], i, arr) => `
        <tr>
          <td width="44" align="center" valign="top" style="padding:14px 0 14px 14px;${i < arr.length - 1 ? 'border-bottom:1px solid #e4e4e7;' : ''}">
            <span style="font-size:18px;">${icon}</span>
          </td>
          <td style="padding:14px;${i < arr.length - 1 ? 'border-bottom:1px solid #e4e4e7;' : ''}">
            <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#18181b;">${title}</p>
            <p style="margin:0;font-size:12px;color:#71717a;">${desc}</p>
          </td>
        </tr>`).join('')}
      </table>

      <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 20px;" />
      <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">The 18th Man team</p>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr><td bgcolor="#e8560a" style="background:#e8560a;border-radius:8px;">
          <a href="${SITE_URL}/signup" style="display:inline-block;padding:13px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Create your free account →</a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:12px;color:#a1a1aa;">Free for all coaches &nbsp;&middot;&nbsp; No credit card needed</p>

    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding-top:20px;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
        18th Man &nbsp;&middot;&nbsp; Rugby League Coaching Platform<br/>
        <a href="${SITE_URL}" style="color:#a1a1aa;">18thman.app</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`

  return send(
    to,
    `You've completed the 4-week plan — what's next?${ageNote}`,
    html,
  )
}

/** Sent to Nick when a coach submits a video analysis request */
export async function sendVideoAnalysisRequestEmail(
  to: string,
  params: {
    coachName: string
    coachEmail: string
    serviceType: 'match-review' | 'opposition-scouting'
    turnaround: 'standard' | 'express'
    subject: string
    matchDate: string
    opposition: string
    competition: string
    videoLink: string
    notes: string
    subscriptionTier: string
    price: number
    memberDiscount: boolean
  },
): Promise<EmailResult> {
  const serviceName = params.serviceType === 'match-review' ? 'Match Review — Individual Player' : 'Opposition Scouting'
  const turnaroundLabel = params.turnaround === 'express' ? 'Express (24hr)' : 'Standard (72hr)'
  const discountNote = params.memberDiscount
    ? `<tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#e8560a;margin-right:10px;">★</span><span style="color:#d4d4d4;font-size:14px;">Member — apply coupon <strong style="color:#ffffff;">18THMAN_MEMBER</strong> (£10 off)</span></td></tr>`
    : ''

  return send(
    to,
    `New Video Analysis Request — ${serviceName} (${turnaroundLabel})`,
    layout(`
      ${heading('New Video Analysis Request')}
      ${para(`<strong style="color:#ffffff;">${params.coachName}</strong> has submitted a request.`)}
      ${divider()}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:20px 0;">
        <tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Service</span><span style="color:#ffffff;font-size:14px;font-weight:700;">${serviceName}</span></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Turnaround</span><span style="color:#ffffff;font-size:14px;">${turnaroundLabel}</span></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Price to charge</span><span style="color:#e8560a;font-size:14px;font-weight:700;">£${params.price}</span></td></tr>
        ${discountNote}
        <tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Subject</span><span style="color:#d4d4d4;font-size:14px;">${params.subject}</span></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Match date</span><span style="color:#d4d4d4;font-size:14px;">${params.matchDate}</span></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Opposition</span><span style="color:#d4d4d4;font-size:14px;">${params.opposition}</span></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Competition</span><span style="color:#d4d4d4;font-size:14px;">${params.competition}</span></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Video link</span><a href="${params.videoLink}" style="color:#e8560a;font-size:14px;word-break:break-all;">${params.videoLink}</a></td></tr>
        ${params.notes ? `<tr><td style="padding:10px 16px;"><span style="color:#a1a1aa;font-size:13px;display:inline-block;width:130px;">Notes</span><span style="color:#d4d4d4;font-size:14px;">${params.notes}</span></td></tr>` : ''}
      </table>
      ${divider()}
      ${para(`Reply to <a href="mailto:${params.coachEmail}" style="color:#e8560a;">${params.coachEmail}</a> with the Stripe payment link to get started.`)}
    `)
  )
}

/** Sent to a customer when their Coaching Eye analysis report is ready */
export async function sendMatchReportEmail(
  to: string,
  params: {
    serviceType: 'match-review' | 'opposition-scouting'
    matchDate: string
    opposition: string
    competition: string
    playerNames: string[]
  },
  pdfBuffer: Buffer,
): Promise<EmailResult> {
  const serviceLabel =
    params.serviceType === 'match-review' ? 'Match Review' : 'Opposition Scouting'

  const dateFormatted = params.matchDate
    ? new Date(`${params.matchDate}T12:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : params.matchDate

  const playerLine =
    params.playerNames.length > 0
      ? `${params.playerNames.length === 1 ? 'Player' : 'Players'}: ${params.playerNames.join(', ')}`
      : null

  const filename = `coaching-eye-${params.serviceType}-${params.opposition
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}.pdf`

  const html = layout(`
    ${heading('Your Coaching Eye Report is ready.')}
    ${para(`${serviceLabel} — ${params.opposition}`)}
    ${divider()}
    ${greeting('')}
    ${para(`Your analysis report for <strong style="color:#ffffff;">${params.opposition}</strong> is attached to this email as a PDF.`)}
    ${featureList([
      `Match: ${params.opposition} — ${params.competition}`,
      `Date: ${dateFormatted}`,
      ...(playerLine ? [playerLine] : []),
    ])}
    ${para('Open the attached PDF for your full analysis, including match statistics and coach commentary for each player.')}
    ${para('If you have any questions about your report, simply reply to this email and we\'ll get back to you.')}
    ${sign()}
  `)

  return send(
    to,
    `Your Coaching Eye Report — ${params.opposition}`,
    html,
    [{ filename, content: pdfBuffer }],
  )
}

/** Sent when a Coach Pro or Club subscription is activated */
export async function sendSubscriptionConfirmationEmail(
  to: string,
  displayName: string,
  plan: 'coach' | 'club',
): Promise<EmailResult> {
  const isClub = plan === 'club'
  const planName = isClub ? 'Club' : 'Coach Pro'
  const tagline = isClub
    ? 'Your whole club now has full access to 18th Man.'
    : 'You now have full access to 18th Man.'
  const features = isClub
    ? ['Unlimited coaches in your club', 'Club private drills', 'Coaching groups (up to 5)', 'Collaborative session plans', 'AI session guidance (GameSense)']
    : ['Unlimited drills', 'PDF export', 'Unlimited AI coaching chat', 'All free features included']

  return send(to, `You're on ${planName} — welcome aboard`, layout(`
    ${heading(`You're on ${planName}.`)}
    ${para(tagline)}
    ${divider()}
    ${greeting(displayName)}
    ${para("Here's what you've unlocked:")}
    ${featureList(features)}
    ${ctaButton('Go to your dashboard', `${SITE_URL}/dashboard`)}
    ${para(`You can manage your billing at any time from your <a href="${SITE_URL}/settings" style="color:#e8560a;">settings page</a>.`)}
    ${sign()}
  `))
}

/** Sent when a platform admin or club admin adds a user directly to a club */
export async function sendClubAddedEmail(
  to: string,
  displayName: string,
  clubName: string,
  addedByName: string,
): Promise<EmailResultWithId> {
  const resend = getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not configured' }
  const html = layout(`
    ${heading(`You're now part of ${esc(clubName)}.`)}
    ${para(`${esc(addedByName)} has added you to the club.`)}
    ${divider()}
    ${greeting(esc(displayName))}
    ${para(`You've been added to <strong style="color:#ffffff;">${esc(clubName)}</strong> on 18th Man. Here's what club membership gives you access to:`)}
    ${featureList([
      'Club drills — exclusive plays and moves shared within your club',
      'Coaching groups — collaborate with your coaching staff on shared session plans',
      'AI session guidance (GameSense) — intelligent rotation and drill suggestions',
      'PDF export — printable session plans to take to training',
    ])}
    ${ctaButton('Go to your club', `${SITE_URL}/clubs`)}
    ${sign()}
  `)
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject: `You've been added to ${clubName} — 18th Man`, html })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/** Sent when a club or group admin adds a user directly to a coaching group */
export async function sendGroupAddedEmail(
  to: string,
  displayName: string,
  groupName: string,
  clubName: string,
  addedByName: string,
): Promise<EmailResultWithId> {
  const resend = getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not configured' }
  const html = layout(`
    ${heading(`You've been added to ${esc(groupName)}.`)}
    ${para(`${esc(addedByName)} has added you to this coaching group.`)}
    ${divider()}
    ${greeting(esc(displayName))}
    ${para(`You're now part of the <strong style="color:#ffffff;">${esc(groupName)}</strong> coaching group at ${esc(clubName)}. Open the app to see shared session plans, drills, and group activity.`)}
    ${ctaButton('View your group', `${SITE_URL}/groups`)}
    ${sign()}
  `)
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject: `You've been added to ${groupName} — 18th Man`, html })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Unsubscribe footer (added to all notification + campaign emails) ────────────

export function unsubscribeFooter(category: string, unsubToken: string): string {
  const categoryLabel = category.replace(/_/g, ' ')
  return `
    <tr>
      <td align="center" style="padding-top:20px;border-top:1px solid #2a2a2a;margin-top:24px;">
        <p style="margin:0;font-size:11px;color:#3f3f46;line-height:1.8;">
          <a href="${SITE_URL}/api/unsubscribe?token=${unsubToken}" style="color:#3f3f46;text-decoration:underline;">Unsubscribe from ${categoryLabel} emails</a>
          &nbsp;·&nbsp;
          <a href="${SITE_URL}/settings#email-preferences" style="color:#3f3f46;text-decoration:underline;">Manage all email preferences</a>
        </p>
      </td>
    </tr>`
}

// ── Notification emails ────────────────────────────────────────────────────────

export interface NotificationEmailParams {
  subject: string
  bodyText: string
  ctaLabel: string
  ctaPath: string
  category: string
  unsubToken: string
}

export interface EmailResultWithId extends EmailResult {
  messageId?: string
}

export async function sendNotificationEmailHtml(
  to: string,
  params: NotificationEmailParams,
): Promise<EmailResultWithId> {
  const resendClient = getResend()
  if (!resendClient) return { success: false, error: 'RESEND_API_KEY not configured' }

  const html = `<!DOCTYPE html>
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
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${SITE_URL}/logo.png" alt="18th Man" width="56" height="56" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td style="background:#161616;border:1px solid #2a2a2a;border-radius:16px;padding:40px 40px 36px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6;">${params.bodyText}</p>
              <table cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                <tr>
                  <td style="background:#e8560a;border-radius:10px;">
                    <a href="${SITE_URL}${params.ctaPath}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.2px;">${params.ctaLabel} →</a>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;" />
              <p style="margin:0;font-size:13px;color:#52525b;">The 18th Man team</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                18th Man · Rugby League Coaching Platform<br/>
                <a href="${SITE_URL}" style="color:#52525b;">18thman.app</a>
              </p>
            </td>
          </tr>
          ${unsubscribeFooter(params.category, params.unsubToken)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const { data, error } = await resendClient.emails.send({
      from: FROM,
      to,
      subject: params.subject,
      html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function sendBurstEmailHtml(
  to: string,
  displayName: string,
  count: number,
  unsubFooterHtml?: string,
): Promise<EmailResultWithId> {
  const resendClient = getResend()
  if (!resendClient) return { success: false, error: 'RESEND_API_KEY not configured' }

  const html = layout(`
    ${heading(`You have ${count} new notifications.`)}
    ${para('A flurry of activity is waiting for you in 18th Man.')}
    ${divider()}
    ${greeting(displayName)}
    ${para(`You've received <strong style="color:#ffffff;">${count} new notifications</strong> in a short space of time. Open the app to see what's happening.`)}
    ${ctaButton('View your notifications', `${SITE_URL}/notifications`)}
    ${sign()}
    ${unsubFooterHtml ?? `<p style="margin:8px 0 0;font-size:11px;color:#3f3f46;text-align:center;">
  <a href="${SITE_URL}/settings#email-preferences" style="color:#3f3f46;text-decoration:underline;">Manage email preferences</a>
</p>`}
  `)

  try {
    const { data, error } = await resendClient.emails.send({
      from: FROM,
      to,
      subject: `You have ${count} new notifications — 18th Man`,
      html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Campaign email template ────────────────────────────────────────────────────

export interface CampaignEmailParams {
  subject: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  category?: string
  unsubToken: string
}

export function buildCampaignEmailHtml(params: Omit<CampaignEmailParams, 'subject'>): string {
  const ctaSection = params.ctaLabel && params.ctaUrl
    ? ctaButton(params.ctaLabel, params.ctaUrl)
    : ''
  const category = params.category ?? 'announcement'

  const baseHtml = layout(`
    <div style="color:#a1a1aa;font-size:15px;line-height:1.6;">${params.bodyHtml}</div>
    ${ctaSection}
    ${sign()}
  `)

  return baseHtml + `
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr>
      <td align="center" style="padding:8px 16px 0;">
        <p style="margin:0;font-size:11px;color:#3f3f46;line-height:1.8;">
          <a href="${SITE_URL}/api/unsubscribe?token=${params.unsubToken}" style="color:#3f3f46;text-decoration:underline;">Unsubscribe from ${category.replace(/_/g, ' ')} emails</a>
          &nbsp;·&nbsp;
          <a href="${SITE_URL}/settings#email-preferences" style="color:#3f3f46;text-decoration:underline;">Manage all email preferences</a>
        </p>
      </td>
    </tr>
  </table>`
}

export async function sendCampaignEmailHtml(
  to: string,
  params: CampaignEmailParams,
): Promise<EmailResultWithId> {
  const resendClient = getResend()
  if (!resendClient) return { success: false, error: 'RESEND_API_KEY not configured' }

  const html = buildCampaignEmailHtml(params)

  try {
    const { data, error } = await resendClient.emails.send({
      from: FROM,
      to,
      subject: params.subject,
      html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
