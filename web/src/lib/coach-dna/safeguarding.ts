import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

/**
 * Automated safeguarding screen for a free-text feedback comment. Fails
 * closed: any error, timeout, or unparseable response is treated as a flag
 * (held for manual review) rather than waved through, since a false
 * negative here is far worse than a false positive landing in the
 * moderation queue.
 */
export async function checkSafeguardingConcern(text: string): Promise<boolean> {
  const prompt = `You are a safeguarding screener for a youth rugby league coaching platform. A respondent (who may be a child, a parent, or a coach) has submitted this free-text comment as part of anonymous coach feedback:

"""
${text}
"""

Does this text contain anything inappropriate directed at or involving a minor (e.g. sexual content, grooming language, an abuse disclosure requiring urgent escalation, or other content unsafe for an automated review queue to pass through untouched)?

Respond with ONLY the single word "FLAG" or "CLEAR" — no other text.`

  try {
    const { text: result } = await generateText({ model: groq('llama-3.3-70b-versatile'), prompt })
    return result.trim().toUpperCase() !== 'CLEAR'
  } catch {
    return true
  }
}
