import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — 18th Man',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-[#c8c4bc] px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-[#e8560a] text-sm font-semibold hover:opacity-80 transition-opacity">
            ← Back to 18th Man
          </Link>
          <h1 className="text-3xl font-bold text-[#e8e4dc] mt-6 mb-1">Privacy Policy</h1>
          <p className="text-sm text-[#5a5855]">Last updated: 7 April 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">1. What we collect</h2>
            <p className="mb-3">When you use 18th Man we collect:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-[#e8e4dc]">Account data</strong> — your email address, username, and password (stored as a secure hash).</li>
              <li><strong className="text-[#e8e4dc]">Profile data</strong> — display name, avatar, bio, club, coaching level, and any social links you choose to add.</li>
              <li><strong className="text-[#e8e4dc]">Coaching content</strong> — drills, session plans, and canvas designs you create on the platform.</li>
              <li><strong className="text-[#e8e4dc]">Chat messages</strong> — messages you send to the AI assistant or other coaches.</li>
              <li><strong className="text-[#e8e4dc]">Usage data</strong> — pages visited, features used, and general activity logs to help us improve the platform.</li>
              <li><strong className="text-[#e8e4dc]">Payment data</strong> — if you subscribe, payments are processed by Stripe. We store your subscription status but not your full card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">2. How we use your data</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>To run the platform and provide you with the features you use.</li>
              <li>To send transactional emails (account confirmation, password reset, subscription updates).</li>
              <li>To send occasional product updates — you can unsubscribe at any time.</li>
              <li>To improve and develop new features based on how the platform is used.</li>
              <li>To enforce our Terms of Service and keep the platform safe.</li>
            </ul>
            <p className="mt-3 text-[#5a5855]">
              We do not sell your data to third parties. We do not use your coaching content to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">3. AI assistant</h2>
            <p>
              Messages you send to the AI coaching assistant are processed by Anthropic (via Vercel AI Gateway).
              These messages are subject to{' '}
              <a
                href="https://www.anthropic.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e8560a] hover:opacity-80 transition-opacity"
              >
                Anthropic&rsquo;s privacy policy
              </a>
              . Do not include sensitive personal information about players in your chat messages.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">4. Who we share data with</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-[#e8e4dc]">Supabase</strong> — our database and authentication provider. Data is hosted in the EU.</li>
              <li><strong className="text-[#e8e4dc]">Vercel</strong> — our hosting and infrastructure provider.</li>
              <li><strong className="text-[#e8e4dc]">Anthropic (via Vercel AI Gateway)</strong> — processes AI chat messages.</li>
              <li><strong className="text-[#e8e4dc]">Stripe</strong> — payment processing for Club subscriptions.</li>
              <li><strong className="text-[#e8e4dc]">Resend</strong> — transactional email delivery.</li>
            </ul>
            <p className="mt-3">
              All third-party providers are contractually bound to handle your data securely and only for the
              purposes we specify.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">5. Data retention</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>Your data is kept for as long as your account is active.</li>
              <li>If you delete your account, your personal data (email, profile, drills, messages) is permanently deleted within 30 days.</li>
              <li>Anonymised usage statistics may be retained after deletion.</li>
              <li>Stripe retains payment records as required by financial regulations — contact them directly to exercise rights over payment data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">6. Your rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-[#e8e4dc]">Access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong className="text-[#e8e4dc]">Correction</strong> — ask us to correct inaccurate data.</li>
              <li><strong className="text-[#e8e4dc]">Deletion</strong> — delete your account at any time from your profile settings, or email us to request deletion.</li>
              <li><strong className="text-[#e8e4dc]">Portability</strong> — request an export of your drills and session plans.</li>
              <li><strong className="text-[#e8e4dc]">Objection</strong> — opt out of marketing emails at any time using the unsubscribe link.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:hello@18thman.app" className="text-[#e8560a] hover:opacity-80 transition-opacity">
                hello@18thman.app
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">7. Cookies</h2>
            <p>
              We use a single session cookie to keep you logged in. We do not use advertising or tracking
              cookies. No third-party analytics scripts are loaded on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">8. Security</h2>
            <p>
              Passwords are hashed and never stored in plain text. All data in transit is encrypted via HTTPS.
              Database access is restricted and governed by row-level security policies. We follow security
              best practices but no system is completely immune to attack — please use a strong, unique password.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">9. Children</h2>
            <p>
              18th Man is intended for coaches aged 18 and over. We do not knowingly collect data from
              anyone under 18. If you believe a minor has created an account, please contact us and we will
              remove it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">10. Changes</h2>
            <p>
              We may update this policy from time to time. We&rsquo;ll notify you by email for material changes.
              The date at the top of this page shows when it was last updated.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">11. Contact</h2>
            <p>
              Questions or requests?{' '}
              <a href="mailto:hello@18thman.app" className="text-[#e8560a] hover:opacity-80 transition-opacity">
                hello@18thman.app
              </a>
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-white/5 flex gap-6 text-xs text-[#5a5855]">
          <Link href="/legal/terms" className="hover:text-[#e8e4dc] transition-colors">Terms of Service</Link>
          <Link href="/login" className="hover:text-[#e8e4dc] transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-[#e8e4dc] transition-colors">Create account</Link>
        </div>

      </div>
    </div>
  )
}
