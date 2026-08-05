import type { SourceResponse } from './response-scoring'

export interface VersionedResponse extends SourceResponse {
  questionVersion: number
}

export function filterCurrentVersion<T extends VersionedResponse>(rows: T[], currentVersion: number): T[] {
  return rows.filter(r => r.questionVersion === currentVersion)
}
