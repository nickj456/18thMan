# Coach 360 Feedback — Request, Respond, Moderate, Blend

## Problem

Coach DNA is currently self-assessment only. A substantial backend for closing the loop already exists — `feedback_requests`, `feedback_responses`, `feedback_answers`, `response_disputes`, `safeguarding_flags`, `club_guardian_consents` (migrations 088–102), plus a fully-built and unit-tested multi-source scoring blend (`src/lib/coach-dna/scoring.ts`, `config.ts`) — but none of it is connected to any page, route, or the live scoring path. This spec closes that loop: a coach can request anonymous feedback from players/parents or fellow coaches, respondents can answer without an account, unsafe content is screened before a coach ever sees it, and real feedback blends into the coach's profile alongside their self-assessment.

Minors are in scope from day one (`player`/`parent` respondent types), so the consent gate and safeguarding moderation ship together with the request/response loop rather than as a follow-up.

## Scope

Five pieces, in dependency order:

1. Coach request creation, gated by club guardian consent for player/parent requests.
2. New question content (rating scale, not self-assessment's forced-choice) for both audiences.
3. Public, no-login response submission with automated safeguarding screening.
4. Admin moderation (safeguarding queue, disputes queue) and the club-admin consent toggle.
5. Threshold-gated notification, and wiring the existing scoring blend into the live Coach DNA path.

## Part 1: Coach request creation

**New page:** `web/src/app/(app)/admin/coach-dna/feedback/new/page.tsx`.

A coach picks:
- **Type**: Player/Parent Voice (scoped to one of their `coaching_groups` teams) or Peer Observation (no team scoping).
- **Expiry**: defaults to 14 days from creation.
- **Minimum response threshold**: defaults to 3 (the existing anti-gaming floor already enforced by migration 094/102's tamper guard).

Before a Player/Parent Voice request can be created, the flow checks `club_guardian_consents` for the coach's club and the current season. No current attestation on file → the coach sees a blocked state explaining they need their club admin to confirm consent first, with no way to bypass it. Peer Observation requests skip this check entirely.

On successful creation, the coach is shown their request's shareable token link (`/feedback/[token]`, see Part 3) to distribute however they choose. `feedback_type`, `anonymous`, and `team_id` are immutable after creation per the existing tamper-guard migrations — this page just needs to get them right at creation time.

## Part 2: Question content

Two new question sets, seeded via migration, distinct from the existing `self_assessment` type in `assessment_questions` (reusing the `assessment_type` column with new values `player_voice` and `peer_observation`). Each set has exactly 8 items — one statement per existing coaching category (teacher, technician, motivator, developer, game-manager, communicator, organiser, culture-builder) — answered on a 1–5 scale (Strongly Disagree → Strongly Agree), plus one optional free-text comment per submission (not per-question).

Player/Parent Voice statements use neutral third-person phrasing so they read naturally for either respondent role:

| Category | Player/Parent Voice | Peer Observation |
|---|---|---|
| Teacher | The coach explains things clearly. | They break down technical concepts clearly for players. |
| Technician | The coach helps players improve their skills and technique. | They have strong technical/tactical coaching knowledge. |
| Motivator | The coach makes players feel confident and motivated to try their best. | They get the best effort and energy out of players. |
| Developer | The coach cares about players as people, not just as athletes. | They focus on long-term player development, not just results. |
| Game Manager | The coach makes good decisions during games. | They make sound tactical decisions under pressure. |
| Communicator | The coach listens and communicates clearly. | They communicate clearly and directly with players and staff. |
| Organiser | Training sessions feel well planned and organised. | Their sessions are well planned and run efficiently. |
| Culture Builder | This feels like a good team to be part of. | They build a positive, healthy team culture. |

Each statement carries the same `category_weights_json`-style mapping to its single category (weight 100), matching the existing `assessment_options` pattern — except here there are no discrete options, the "answer" is the numeric rating itself, stored in `feedback_answers`.

## Part 3: Public submission flow

**New route:** `web/src/app/feedback/[token]/page.tsx` — outside the `(app)` auth-gated group entirely, since respondents never log in.

The token resolves the `feedback_request` (404/expired state if invalid or past `expires_at`). For a Player/Parent Voice request, the respondent first picks "I'm the player" or "I'm a parent" (sets `respondent_type`); a Peer Observation request skips the picker (`respondent_type` is always `peer_coach`). They then rate all 8 statements and may add one optional comment, and submit.

On submit (`feedback-actions.ts`, a Route Handler or Server Action reachable without auth):
1. A `feedback_response` row is created, `held_for_review = true` initially.
2. If a comment was provided, it's sent through an automated safeguarding check (Groq, mirroring the existing Coach DNA summary AI call) asking specifically whether the text contains anything inappropriate directed at or involving a minor.
3. Clean (or no comment provided) → `held_for_review` flips to `false` immediately, response becomes visible to the requesting coach and counts toward the threshold.
4. Flagged → a `safeguarding_flags` row is created (`detection_method = 'automated'`), response stays held, and it enters the manual moderation queue (Part 4).

No `device_fingerprint_hash`/rate-limiting logic is redesigned here — the schema already has a column for it; this plan wires basic duplicate-submission throttling using it, not a new anti-abuse system.

## Part 4: Admin moderation & consent toggle

**Club admin consent toggle:** a new section on the existing club admin settings page — a single checkbox per season ("We have guardian consent on file for player/parent feedback this season") that writes a `club_guardian_consents` row attributed to the acting admin. No document upload or platform-side verification; this is the club's attestation, not the platform certifying it.

**Safeguarding queue:** `web/src/app/(app)/admin/feedback/safeguarding/page.tsx` (club admins see only their club's flags via existing RLS scoping; platform admins see all). Each flagged item shows the flagged text and the AI's stated reason, with two actions: **dismiss** (false positive — response releases, `held_for_review = false`) or **confirm** (keep hidden permanently — the flag itself is already immutable once created per migration 092b). Every view and action writes to the existing `admin_feedback_access_log`.

**Disputes queue:** `web/src/app/(app)/admin/feedback/disputes/page.tsx` — a coach-facing "dispute this response" action appears on responses they've already seen (added to the coach's results view from Part 5); disputes land here for a club/platform admin to resolve as `excluded` (removed from that coach's results and any score calculation) or `no_action`.

## Part 5: Notifications & scoring blend

**Notification:** one email to the requesting coach when a request's count of *cleared* (non-held) responses first reaches its `minimum_response_threshold` — not on every individual response. Uses the existing `sendTrialStartEmail`-style pattern in `web/src/lib/email.ts`.

**Scoring blend:** `web/src/lib/coach-dna/scoring.ts`'s `computeCategoryScore` already implements the blend (self + player_voice + peer_observation + parent_voice, confidence-adjusted by sample size, outlier-capped for peer observations, recency-weighted) and is fully unit-tested but called from nowhere in the app. This part wires it into the live path: `generateSelfAssessmentSummary` (or a renamed/extended equivalent) fetches cleared `feedback_responses`/`feedback_answers` for the coach alongside their self-assessment responses, and calls `computeCategoryScore` per category instead of using self-only scores directly, whenever at least one category has enough cleared external responses to clear its configured confidence threshold.

**UI/PDF changes:** the results page, PDF, and email currently say "This reflects your self-assessment only." Once any category has blended data, this becomes a per-category indicator (e.g. a small "Includes player feedback" tag next to categories that aren't self-only anymore) rather than a blanket self-only disclaimer — categories still below threshold keep showing as self-only.

## Out of scope

- Individual per-parent digital consent collection (e-signatures, per-child tracking) — the club-level attestation model above is the whole of Part 4's consent handling for this spec.
- Rate-limiting/anti-abuse beyond using the existing `device_fingerprint_hash` column for basic duplicate-submission throttling — no CAPTCHA, no IP-based blocking.
- `coach_reflections`/`recommendations` (migration 089) — a separate, adjacent scaffold, not touched here.
- Any change to Coach DNA's own self-assessment mechanic, question content, or forced-choice scoring — those are untouched; this spec only adds external sources alongside them.
