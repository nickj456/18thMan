import Link from 'next/link'
import { ContactForm } from './ContactForm'

export const metadata = { title: 'Contact Us — 18th Man' }

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-[#c8c4bc] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <Link href="/" className="text-[#e8560a] text-sm font-semibold hover:opacity-80 transition-opacity">
            ← Back to 18th Man
          </Link>
          <h1 className="text-3xl font-bold text-[#e8e4dc] mt-6 mb-1">Contact Us</h1>
          <p className="text-sm text-[#5a5855]">Got a question or feedback? We&apos;d love to hear from you.</p>
        </div>

        <ContactForm />

        <div className="mt-12 pt-8 border-t border-white/5 flex gap-6 text-xs text-[#5a5855]">
          <Link href="/legal/privacy" className="hover:text-[#e8e4dc] transition-colors">Privacy Policy</Link>
          <Link href="/legal/terms" className="hover:text-[#e8e4dc] transition-colors">Terms of Service</Link>
          <Link href="/login" className="hover:text-[#e8e4dc] transition-colors">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
