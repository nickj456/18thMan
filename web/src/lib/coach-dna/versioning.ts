export interface VersionedResponse {
  value: number
  submittedAt: string
  questionVersion: number
}

export function filterCurrentVersion<T extends VersionedResponse>(rows: T[], currentVersion: number): T[] {
  return rows.filter(r => r.questionVersion === currentVersion)
}
