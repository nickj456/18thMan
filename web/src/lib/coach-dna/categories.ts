// web/src/lib/coach-dna/categories.ts
// Single source of truth for Coach DNA category *display labels*.
// Note: this is deliberately separate from the slug-order constants in
// archetype.ts / self-score.ts, which encode ranking/tie-breaking logic
// rather than presentation.

export const CATEGORY_LABELS: Record<string, string> = {
  teacher: 'Teacher',
  technician: 'Technician',
  motivator: 'Motivator',
  developer: 'Developer',
  'game-manager': 'Game Manager',
  communicator: 'Communicator',
  organiser: 'Organiser',
  'culture-builder': 'Culture Builder',
}

/** Display label for a category slug. Falls back to the raw slug, never undefined. */
export function labelFor(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug
}
