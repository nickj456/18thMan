import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — 18th Man',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-[#c8c4bc] px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-[#e8560a] text-sm font-semibold hover:opacity-80 transition-opacity">
            ← Back to 18th Man
          </Link>
          <h1 className="text-3xl font-bold text-[#e8e4dc] mt-6 mb-1">Terms of Service</h1>
          <p className="text-sm text-[#5a5855]">Last updated: 7 April 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">1. Who we are</h2>
            <p>
              18th Man (&ldquo;the platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a rugby league coaching tool that helps coaches
              design drills, plan sessions, and connect with other coaches. By creating an account you agree
              to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">2. Your account</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>You must be 18 or older to create an account.</li>
              <li>You are responsible for keeping your password secure. We are not liable for any loss caused by unauthorised access to your account.</li>
              <li>One person, one account. You may not share accounts or create accounts on behalf of others without their consent.</li>
              <li>Usernames must not impersonate another person or organisation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">3. What you can do</h2>
            <p>
              Your account lets you create drills, plan sessions, use the AI coaching assistant, and
              (with a Club subscription) access group features and PDF exports. We grant you a personal,
              non-transferable licence to use the platform for coaching purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">4. Your content</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>Drills, session plans, and notes you create belong to you. We don&rsquo;t claim ownership of your content.</li>
              <li>By uploading content you grant us a licence to store and display it to run the service.</li>
              <li>Don&rsquo;t upload anything illegal, offensive, or that infringes someone else&rsquo;s intellectual property.</li>
              <li>We may remove content that violates these terms without notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">5. Subscriptions and payments</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>The free tier is free forever and includes up to 20 drills and 20 AI messages per day.</li>
              <li>Club tier features (coaching groups, PDF export, unlimited drills) require a paid subscription.</li>
              <li>Subscriptions are billed monthly or annually. Prices are shown at the point of purchase.</li>
              <li>You may cancel at any time. Access continues until the end of your billing period — no refunds for unused time.</li>
              <li>We may change pricing with 30 days&rsquo; notice to your registered email address.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">6. AI coaching assistant</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>The AI assistant is a coaching aid, not a substitute for professional judgement.</li>
              <li>We are not responsible for outcomes resulting from AI-generated suggestions.</li>
              <li>Do not share sensitive personal information about players (names, medical details) in the chat.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">7. Acceptable use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Use the platform to harass, abuse, or harm others.</li>
              <li>Attempt to reverse-engineer or exploit the platform&rsquo;s systems.</li>
              <li>Use automated tools to scrape or bulk-download content without permission.</li>
              <li>Use the platform for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">8. Service availability</h2>
            <p>
              We aim for high availability but cannot guarantee uninterrupted access. We may carry out
              maintenance or updates at any time. We are not liable for any loss resulting from downtime.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">9. Account termination</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>You can delete your account at any time from your profile settings.</li>
              <li>We may suspend or terminate accounts that breach these terms.</li>
              <li>On deletion, your personal data is removed within 30 days (see our Privacy Policy for details).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">10. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
              consequential loss arising from your use of the platform. Our total liability in any case
              is limited to the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">11. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. We&rsquo;ll notify you by email for material changes.
              Continued use of the platform after the effective date means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#e8e4dc] mb-3">12. Contact</h2>
            <p>
              Questions about these terms?{' '}
              <a href="mailto:hello@18thman.app" className="text-[#e8560a] hover:opacity-80 transition-opacity">
                hello@18thman.app
              </a>
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-white/5 flex gap-6 text-xs text-[#5a5855]">
          <Link href="/legal/privacy" className="hover:text-[#e8e4dc] transition-colors">Privacy Policy</Link>
          <Link href="/contact" className="hover:text-[#e8e4dc] transition-colors">Contact</Link>
          <Link href="/login" className="hover:text-[#e8e4dc] transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-[#e8e4dc] transition-colors">Create account</Link>
        </div>

      </div>
    </div>
  )
}
