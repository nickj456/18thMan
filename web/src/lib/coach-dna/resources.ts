// Curated, code-owned growth resources per Coach DNA category. The AI never
// picks or invents a resource — this is the only source, looked up by
// category slug and attached to focus areas after the AI's text is parsed.
// Every title/URL was verified real before being added here (see the
// 2026-08-11 design spec) — never add an entry without verifying it exists.

export interface CategoryResource {
  title: string
  description: string
  url: string | null
}

export const CATEGORY_RESOURCES: Record<string, CategoryResource[]> = {
  teacher: [
    {
      title: 'Teaching Games for Understanding',
      description: 'Butler & Griffin — a framework for coaching through guided discovery rather than direct instruction.',
      url: 'https://openlibrary.org/works/OL21648824W',
    },
  ],
  technician: [
    {
      title: 'RFL Coach Education',
      description: 'The Rugby Football League\'s official coaching hub — technical skill courses and CPD.',
      url: 'https://www.rugby-league.com/get-involved/coach',
    },
  ],
  motivator: [
    {
      title: 'The Coaching Habit',
      description: 'Michael Bungay Stanier — short, practical habits for coaching conversations that build motivation.',
      url: 'https://openlibrary.org/works/OL20038440W',
    },
  ],
  developer: [
    {
      title: 'Long-Term Athlete Development',
      description: 'Balyi, Way & Higgs — the foundational framework for developing players over years, not weeks.',
      url: 'https://openlibrary.org/works/OL19638829W',
    },
  ],
  'game-manager': [
    {
      title: 'RFL Coach Education',
      description: 'The Rugby Football League\'s official coaching hub — tactical and game-strategy modules.',
      url: 'https://www.rugby-league.com/get-involved/coach',
    },
  ],
  communicator: [
    {
      title: 'Coaching for Performance',
      description: 'Sir John Whitmore — the book that introduced the GROW model for coaching conversations.',
      url: 'https://openlibrary.org/works/OL3284831W',
    },
  ],
  organiser: [
    {
      title: 'Periodization Training for Sports',
      description: 'Tudor Bompa — structuring training and session planning across a season.',
      url: 'https://openlibrary.org/works/OL1850738W',
    },
  ],
  'culture-builder': [
    {
      title: 'Legacy',
      description: 'James Kerr — 15 lessons in leadership from the All Blacks, on building a team\'s culture.',
      url: 'https://openlibrary.org/works/OL19762970W',
    },
    {
      title: 'The Culture Code',
      description: 'Daniel Coyle — what high-performing groups do differently to build belonging and trust.',
      url: 'https://openlibrary.org/works/OL19670476W',
    },
  ],
}

/** Curated resources for a category slug. Falls back to an empty array, never undefined or throws. */
export function resourcesFor(categorySlug: string): CategoryResource[] {
  return CATEGORY_RESOURCES[categorySlug] ?? []
}
