import { labelFor } from './categories'

export interface GuidanceStep {
  heading: string
  body: string
  href: string | null
  linkLabel: string | null
}

/** State-conditional "what to do next" for the Coach DNA hub/breakdown --
 *  one clear next action, not a checklist, so it reads as guidance rather
 *  than a gimmick. Priority order matters: a coach who somehow satisfies
 *  more than one condition always sees the earliest-listed one. */
export function buildGuidance(params: {
  hasAnyFeedbackRequest: boolean
  activeRequestsBelowThreshold: boolean
  hasBlendedFeedback: boolean
  focusCategories: string[]
}): GuidanceStep[] {
  if (!params.hasAnyFeedbackRequest) {
    return [{
      heading: 'Request feedback',
      body: 'Request feedback from your players, parents, or a fellow coach to see how your self-view compares.',
      href: '/admin/coach-dna/feedback',
      linkLabel: 'Request feedback',
    }]
  }

  if (params.activeRequestsBelowThreshold && !params.hasBlendedFeedback) {
    return [{
      heading: 'Almost there',
      body: "You're close — a few more responses will unlock your full blended picture.",
      href: '/admin/coach-dna/feedback',
      linkLabel: 'View feedback requests',
    }]
  }

  if (params.hasBlendedFeedback) {
    if (params.focusCategories.length === 0) {
      return [{
        heading: 'Steady across the board',
        body: 'Every category is holding steady or better — keep the habits that got you here.',
        href: null,
        linkLabel: null,
      }]
    }
    const topFocusLabel = labelFor(params.focusCategories[0])
    return [
      {
        heading: 'Plan a session',
        body: `Build a session that targets ${topFocusLabel}.`,
        href: '/sessions/new',
        linkLabel: 'Plan a session',
      },
      {
        heading: 'Browse drills',
        body: `Browse drills to develop your ${topFocusLabel} skills.`,
        href: '/drills',
        linkLabel: 'Browse drills',
      },
      {
        heading: 'Talk it through',
        body: `Talk ${topFocusLabel} through with the AI coaching assistant.`,
        href: '/chat/ai',
        linkLabel: 'Open AI chat',
      },
    ]
  }

  return [{
    heading: 'Coach DNA',
    body: 'Head back to your Coach DNA hub for the latest on your assessment and feedback.',
    href: '/admin/coach-dna',
    linkLabel: 'Back to Coach DNA',
  }]
}
