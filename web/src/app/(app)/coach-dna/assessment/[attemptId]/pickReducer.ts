export interface PickState {
  mostId: string | null
  leastId: string | null
}

export type PickAction = { type: 'tap'; optionId: string }

export function pickReducer(state: PickState, action: PickAction): PickState {
  const { optionId } = action

  if (state.mostId === optionId) return { ...state, mostId: null }
  if (state.leastId === optionId) return { ...state, leastId: null }
  if (state.mostId === null) return { ...state, mostId: optionId }
  if (state.leastId === null) return { ...state, leastId: optionId }

  // Both marks already placed on two other options: the new tap becomes the
  // "most" pick, and "least" stays where it was.
  return { mostId: optionId, leastId: state.leastId }
}
