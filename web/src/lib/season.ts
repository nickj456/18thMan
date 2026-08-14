/** The current season label used for club_guardian_consents (and any other
 *  season-scoped feedback check). One season per calendar year -- simple
 *  and consistent between the consent-granting UI and the request-creation
 *  check, which is all that matters (the exact scheme is arbitrary as long
 *  as both sides agree). */
export function getCurrentSeasonLabel(): string {
  return new Date().getFullYear().toString()
}
