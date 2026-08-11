# Coach DNA Content Differentiation & Growth Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reword all 96 Coach DNA self-assessment answer options so most/least picks force a genuine choice between distinct coaching instincts, and add curated, code-owned growth resources to each focus area in the results.

**Architecture:** A content-only migration rewrites `assessment_options.option_text` (same IDs, same `category_weights_json`, same category-per-question mapping — text only). A new static resource map (`web/src/lib/coach-dna/resources.ts`) is looked up by category slug and attached to `cons` entries after the AI response is parsed — the AI never picks or invents a resource. The AI prompt is extended so `cons` become 2-3 sentences; `pros` stay one sentence. All three result surfaces (on-screen, PDF, email) render the expanded text and resources for each focus area.

**Tech Stack:** Next.js Server Components/Actions, Supabase Postgres migrations, Vercel AI SDK (`generateText` via Groq), `@react-pdf/renderer`, Vitest.

## Global Constraints

- No em dashes in new UI copy or email content (existing house style in this codebase's email/PDF copy).
- The AI must never pick, name, or invent a resource — resources come only from the static `CATEGORY_RESOURCES` map in `web/src/lib/coach-dna/resources.ts`, attached to the AI's output by category slug after parsing (same anti-fabrication pattern already used for archetype category slugs in `summary-actions.ts`).
- `pros` entries stay exactly as they are today (one sentence, no resources) — only `cons` (focus areas) change shape.
- The reworded options must keep each question's existing category-per-option assignment (same `category_weights_json` per option ID) — only `option_text` changes. This preserves the seed's category-balance guarantee (each of the 8 categories offered in exactly 12 of the 24 questions), which `TIMES_EACH_CATEGORY_IS_OFFERED = 12` in `web/src/lib/coach-dna/self-score.ts` depends on.
- All web app commands run from `web/`.

---

### Task 1: Reword all 96 answer options

**Files:**
- Create: `web/supabase/migrations/112_self_assessment_reword_options.sql`

**Interfaces:**
- None — content-only migration, no schema change. IDs and `category_weights_json` values are untouched; only `option_text` per existing option ID changes.

**Context for the implementer:** This migration rewords every option in the seed (`web/supabase/migrations/108_self_assessment_seed.sql`) so it reads as a distinct, instinctive coaching behavior rather than a generic "reasonable response." Apply it as a live Supabase migration (via the Supabase MCP `apply_migration` tool, or `supabase db push` if working from the CLI) after writing the file — this table is read live by the running app.

- [ ] **Step 1: Write the migration**

```sql
-- 112_self_assessment_reword_options.sql
-- Rewords all 96 self-assessment answer options so each question's 4 options
-- represent distinct, instinctive coaching behaviors instead of 4 generically
-- "reasonable" responses. IDs and category_weights_json are untouched.

update public.assessment_options set option_text = 'Sit the team down and walk through the game frame by frame so everyone understands why it went wrong.' where id = 'b0000000-0000-0000-0000-000000000001';
update public.assessment_options set option_text = 'Skip the debrief. Go straight to the training ground and rebuild the exact technique that broke down.' where id = 'b0000000-0000-0000-0000-000000000002';
update public.assessment_options set option_text = 'Lead with what went right. A flat, defeated team won''t fix anything, confidence comes first.' where id = 'b0000000-0000-0000-0000-000000000003';
update public.assessment_options set option_text = 'Don''t overreact to one bad week. File it as a marker and keep the long-term plan on track.' where id = 'b0000000-0000-0000-0000-000000000004';

update public.assessment_options set option_text = 'Walk the team through the tactical calls you''d make differently next time. The ref''s gone, the game reading hasn''t.' where id = 'b0000000-0000-0000-0000-000000000005';
update public.assessment_options set option_text = 'Get in front of the room now, own the moment, and set the tone for how this gets talked about.' where id = 'b0000000-0000-0000-0000-000000000006';
update public.assessment_options set option_text = 'Ignore the noise for a minute. Get the kit packed and the bus moving on schedule.' where id = 'b0000000-0000-0000-0000-000000000007';
update public.assessment_options set option_text = 'Use the anger as fuel for a bigger point: how the group backs each other no matter the result.' where id = 'b0000000-0000-0000-0000-000000000008';

update public.assessment_options set option_text = 'Sit them down and explain exactly why the error keeps happening, step by step.' where id = 'b0000000-0000-0000-0000-000000000009';
update public.assessment_options set option_text = 'Design a drill that forces the correct read under matchlike pressure.' where id = 'b0000000-0000-0000-0000-000000000010';
update public.assessment_options set option_text = 'Pull them aside, one on one, and tell them plainly what you need to see.' where id = 'b0000000-0000-0000-0000-000000000011';
update public.assessment_options set option_text = 'Log it as a long-term project. This isn''t a one-conversation fix.' where id = 'b0000000-0000-0000-0000-000000000012';

update public.assessment_options set option_text = 'Load them up with individual technical work. Channel the energy into something specific.' where id = 'b0000000-0000-0000-0000-000000000013';
update public.assessment_options set option_text = 'Sit down with them and dig into what''s actually driving the behaviour.' where id = 'b0000000-0000-0000-0000-000000000014';
update public.assessment_options set option_text = 'Tighten the session structure so there''s less space for it to happen.' where id = 'b0000000-0000-0000-0000-000000000015';
update public.assessment_options set option_text = 'Make it a team-standards conversation, not a private one. This is about what the group tolerates.' where id = 'b0000000-0000-0000-0000-000000000016';

update public.assessment_options set option_text = 'Set hard technical benchmarks the team needs to hit by mid-season.' where id = 'b0000000-0000-0000-0000-000000000017';
update public.assessment_options set option_text = 'Ask the group what they actually want this year, and build the plan around their answer.' where id = 'b0000000-0000-0000-0000-000000000018';
update public.assessment_options set option_text = 'Map the whole training calendar and logistics for the block right now.' where id = 'b0000000-0000-0000-0000-000000000019';
update public.assessment_options set option_text = 'Make the goals about effort and enjoyment, not results.' where id = 'b0000000-0000-0000-0000-000000000020';

update public.assessment_options set option_text = 'Move it indoors and turn it into a pure technical skills session.' where id = 'b0000000-0000-0000-0000-000000000021';
update public.assessment_options set option_text = 'Use the disruption as a live test of how the team adapts under changed conditions.' where id = 'b0000000-0000-0000-0000-000000000022';
update public.assessment_options set option_text = 'Rework the plan on the fly without losing the thread of what the week was building toward.' where id = 'b0000000-0000-0000-0000-000000000023';
update public.assessment_options set option_text = 'Turn it into a fun, low-stakes session and keep the mood light.' where id = 'b0000000-0000-0000-0000-000000000024';

update public.assessment_options set option_text = 'Slow your explanations down and check they''re following, even if they never ask.' where id = 'b0000000-0000-0000-0000-000000000025';
update public.assessment_options set option_text = 'Give them technical feedback one on one, away from the group.' where id = 'b0000000-0000-0000-0000-000000000026';
update public.assessment_options set option_text = 'Check in privately on how they''re finding things, and encourage them gently.' where id = 'b0000000-0000-0000-0000-000000000027';
update public.assessment_options set option_text = 'Accept the group format won''t reach them. Plan for their needs individually.' where id = 'b0000000-0000-0000-0000-000000000028';

update public.assessment_options set option_text = 'Break down exactly which tactical calls made the difference.' where id = 'b0000000-0000-0000-0000-000000000029';
update public.assessment_options set option_text = 'Get the word out to players and parents about how well the team played.' where id = 'b0000000-0000-0000-0000-000000000030';
update public.assessment_options set option_text = 'Lock down the post-match logistics, transport, next fixture, before anyone leaves.' where id = 'b0000000-0000-0000-0000-000000000031';
update public.assessment_options set option_text = 'Hold it up as proof of what the team''s culture can produce.' where id = 'b0000000-0000-0000-0000-000000000032';

update public.assessment_options set option_text = 'Spell out specifically what their child needs to work on to earn more minutes.' where id = 'b0000000-0000-0000-0000-000000000033';
update public.assessment_options set option_text = 'Explain the tactical reasoning behind the selection that day.' where id = 'b0000000-0000-0000-0000-000000000034';
update public.assessment_options set option_text = 'Hear them out fully first, then explain your reasoning calmly.' where id = 'b0000000-0000-0000-0000-000000000035';
update public.assessment_options set option_text = 'Reassure them the club values effort and involvement, not just game time.' where id = 'b0000000-0000-0000-0000-000000000036';

update public.assessment_options set option_text = 'Sharpen the technical content so showing up feels worth it.' where id = 'b0000000-0000-0000-0000-000000000037';
update public.assessment_options set option_text = 'Talk to a few players one on one about what would bring them back.' where id = 'b0000000-0000-0000-0000-000000000038';
update public.assessment_options set option_text = 'Check whether the timing or format of training is the actual problem.' where id = 'b0000000-0000-0000-0000-000000000039';
update public.assessment_options set option_text = 'Talk to the group about what training means to the team, not just the results it produces.' where id = 'b0000000-0000-0000-0000-000000000040';

update public.assessment_options set option_text = 'Walk them through exactly what happened and how to avoid it next time.' where id = 'b0000000-0000-0000-0000-000000000041';
update public.assessment_options set option_text = 'Talk it through with them directly and adjust their plan together.' where id = 'b0000000-0000-0000-0000-000000000042';
update public.assessment_options set option_text = 'Keep the rest of the session running smoothly while it''s dealt with.' where id = 'b0000000-0000-0000-0000-000000000043';
update public.assessment_options set option_text = 'Check in on how they''re feeling about it, not just the physical side.' where id = 'b0000000-0000-0000-0000-000000000044';

update public.assessment_options set option_text = 'Set a technical drill next session that forces them to work together.' where id = 'b0000000-0000-0000-0000-000000000045';
update public.assessment_options set option_text = 'Manage the moment live: separate them, reset the drill, keep control.' where id = 'b0000000-0000-0000-0000-000000000046';
update public.assessment_options set option_text = 'Talk to both individually about what''s really going on between them.' where id = 'b0000000-0000-0000-0000-000000000047';
update public.assessment_options set option_text = 'Use it to reinforce what the team stands for and how conflict gets handled.' where id = 'b0000000-0000-0000-0000-000000000048';

update public.assessment_options set option_text = 'Break it into small, teachable steps before anyone tries it at pace.' where id = 'b0000000-0000-0000-0000-000000000049';
update public.assessment_options set option_text = 'Frame it around when and why it matters in a real game.' where id = 'b0000000-0000-0000-0000-000000000050';
update public.assessment_options set option_text = 'Explain clearly why you''re introducing it now and what you expect.' where id = 'b0000000-0000-0000-0000-000000000051';
update public.assessment_options set option_text = 'Treat it as a multi-week project, not something to nail in one session.' where id = 'b0000000-0000-0000-0000-000000000052';

update public.assessment_options set option_text = 'Point the extra time at one specific technical weakness you''ve both flagged.' where id = 'b0000000-0000-0000-0000-000000000053';
update public.assessment_options set option_text = 'Use it to find out what''s really driving them to put in the extra work.' where id = 'b0000000-0000-0000-0000-000000000054';
update public.assessment_options set option_text = 'Slot it into the calendar without disrupting anything else.' where id = 'b0000000-0000-0000-0000-000000000055';
update public.assessment_options set option_text = 'Frame it as one piece of their longer development plan.' where id = 'b0000000-0000-0000-0000-000000000056';

update public.assessment_options set option_text = 'Go through what worked and didn''t tactically this year.' where id = 'b0000000-0000-0000-0000-000000000057';
update public.assessment_options set option_text = 'Ask the group directly what they''d change next year.' where id = 'b0000000-0000-0000-0000-000000000058';
update public.assessment_options set option_text = 'Get the logistics, presentations, sign-off, handled properly.' where id = 'b0000000-0000-0000-0000-000000000059';
update public.assessment_options set option_text = 'Centre the conversation on what the team built together.' where id = 'b0000000-0000-0000-0000-000000000060';

update public.assessment_options set option_text = 'Give them direct, clear coaching so they''re not left behind.' where id = 'b0000000-0000-0000-0000-000000000061';
update public.assessment_options set option_text = 'Slot them into a tactical role that suits their strengths right away.' where id = 'b0000000-0000-0000-0000-000000000062';
update public.assessment_options set option_text = 'Have someone check in on how they''re settling in, not just how they''re playing.' where id = 'b0000000-0000-0000-0000-000000000063';
update public.assessment_options set option_text = 'Make a real effort to fold them into the team''s existing habits and culture.' where id = 'b0000000-0000-0000-0000-000000000064';

update public.assessment_options set option_text = 'Break down specifically what went wrong so they understand it, not just feel bad about it.' where id = 'b0000000-0000-0000-0000-000000000065';
update public.assessment_options set option_text = 'Reconnect them to why they play in the first place.' where id = 'b0000000-0000-0000-0000-000000000066';
update public.assessment_options set option_text = 'Address the group directly and honestly about where things stand.' where id = 'b0000000-0000-0000-0000-000000000067';
update public.assessment_options set option_text = 'Remind them what the team is about beyond the scoreboard.' where id = 'b0000000-0000-0000-0000-000000000068';

update public.assessment_options set option_text = 'Dial back the technical intensity to manage the load.' where id = 'b0000000-0000-0000-0000-000000000069';
update public.assessment_options set option_text = 'Make in-game tactical calls that protect the tired players.' where id = 'b0000000-0000-0000-0000-000000000070';
update public.assessment_options set option_text = 'Rebuild the schedule to force in real recovery.' where id = 'b0000000-0000-0000-0000-000000000071';
update public.assessment_options set option_text = 'Check in on how the group''s coping mentally, not just physically.' where id = 'b0000000-0000-0000-0000-000000000072';

update public.assessment_options set option_text = 'Set the technical standards the team needs to hit to compete at that level.' where id = 'b0000000-0000-0000-0000-000000000073';
update public.assessment_options set option_text = 'Build a tactical game plan specifically around who you''ll face.' where id = 'b0000000-0000-0000-0000-000000000074';
update public.assessment_options set option_text = 'Get deliberate about travel, prep, and timing for the bigger occasion.' where id = 'b0000000-0000-0000-0000-000000000075';
update public.assessment_options set option_text = 'Keep the team grounded and connected as the pressure ramps up.' where id = 'b0000000-0000-0000-0000-000000000076';

update public.assessment_options set option_text = 'Have a calm, direct conversation with them after the game.' where id = 'b0000000-0000-0000-0000-000000000077';
update public.assessment_options set option_text = 'Use it to reinforce the team''s standards on sideline behaviour.' where id = 'b0000000-0000-0000-0000-000000000078';
update public.assessment_options set option_text = 'Stay locked on your own tactical calls and deal with it separately, later.' where id = 'b0000000-0000-0000-0000-000000000079';
update public.assessment_options set option_text = 'Flag it as something to manage proactively before the next game.' where id = 'b0000000-0000-0000-0000-000000000080';

update public.assessment_options set option_text = 'Make sure they''re crystal clear on the technical content you want delivered.' where id = 'b0000000-0000-0000-0000-000000000081';
update public.assessment_options set option_text = 'Have a direct conversation about roles and expectations.' where id = 'b0000000-0000-0000-0000-000000000082';
update public.assessment_options set option_text = 'Set up a clear structure for who runs what, every week.' where id = 'b0000000-0000-0000-0000-000000000083';
update public.assessment_options set option_text = 'Bring them into shaping the team''s culture, not just running drills.' where id = 'b0000000-0000-0000-0000-000000000084';

update public.assessment_options set option_text = 'Give them harder technical work to re-engage them.' where id = 'b0000000-0000-0000-0000-000000000085';
update public.assessment_options set option_text = 'Have a conversation about what''s actually behind the lack of effort.' where id = 'b0000000-0000-0000-0000-000000000086';
update public.assessment_options set option_text = 'Think about what this means for them long-term, not just this week.' where id = 'b0000000-0000-0000-0000-000000000087';
update public.assessment_options set option_text = 'Reinforce what effort means to the team, regardless of talent.' where id = 'b0000000-0000-0000-0000-000000000088';

update public.assessment_options set option_text = 'Make the tactical calls needed to see it out.' where id = 'b0000000-0000-0000-0000-000000000089';
update public.assessment_options set option_text = 'Get the message to players clearly and calmly amid the noise.' where id = 'b0000000-0000-0000-0000-000000000090';
update public.assessment_options set option_text = 'Trust the technical habits you''ve drilled in all season to hold up.' where id = 'b0000000-0000-0000-0000-000000000091';
update public.assessment_options set option_text = 'Lean on the team''s composure and trust in each other.' where id = 'b0000000-0000-0000-0000-000000000092';

update public.assessment_options set option_text = 'Seeing individual players'' skills improve technically.' where id = 'b0000000-0000-0000-0000-000000000093';
update public.assessment_options set option_text = 'Seeing the team make smarter decisions on the field.' where id = 'b0000000-0000-0000-0000-000000000094';
update public.assessment_options set option_text = 'Seeing players grow as people, not just as players.' where id = 'b0000000-0000-0000-0000-000000000095';
update public.assessment_options set option_text = 'Seeing the team become a place players wanted to be.' where id = 'b0000000-0000-0000-0000-000000000096';
```

- [ ] **Step 2: Apply the migration live**

Use the Supabase MCP `apply_migration` tool with `project_id: khslkwspsqyopicxufun` and the SQL body above (project already established in this session for the 18th-man Supabase project). Verify afterward:

```sql
select count(*) from public.assessment_options where option_text like '%reasonable%'; -- sanity: should be 0, no leftover generic phrasing marker
select id, option_text from public.assessment_options where question_id = 'a0000000-0000-0000-0000-000000000001' order by id;
```

Expected: the Q1 query returns the 4 new Q1 strings from Step 1 (the "Sit the team down...", "Skip the debrief...", "Lead with what went right...", "Don't overreact..." rows).

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/112_self_assessment_reword_options.sql
git commit -m "content(coach-dna): reword all 96 self-assessment options for genuine differentiation"
```

---

### Task 2: Curated growth resources data

**Files:**
- Create: `web/src/lib/coach-dna/resources.ts`
- Create: `web/src/lib/coach-dna/resources.test.ts`

**Interfaces:**
- Produces: `CategoryResource { title: string; description: string; url: string | null }`, `resourcesFor(categorySlug: string): CategoryResource[]` — consumed by Task 4 (`summary-actions.ts`).

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/resources.test.ts
import { describe, it, expect } from 'vitest'
import { resourcesFor, CATEGORY_RESOURCES } from './resources'

describe('resourcesFor', () => {
  it('returns the curated resources for a known category', () => {
    const result = resourcesFor('teacher')
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('title')
    expect(result[0]).toHaveProperty('description')
  })

  it('returns an empty array for an unknown category, never throws', () => {
    expect(resourcesFor('not-a-real-category')).toEqual([])
  })

  it('has at least one resource for every one of the 8 known categories', () => {
    const categories = ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']
    for (const slug of categories) {
      expect(CATEGORY_RESOURCES[slug]?.length).toBeGreaterThan(0)
    }
  })

  it('never has a resource with an empty title or description', () => {
    for (const resources of Object.values(CATEGORY_RESOURCES)) {
      for (const resource of resources) {
        expect(resource.title.trim().length).toBeGreaterThan(0)
        expect(resource.description.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/resources.test.ts`
Expected: FAIL — `./resources` does not exist yet.

- [ ] **Step 3: Write the resources data**

```ts
// web/src/lib/coach-dna/resources.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/resources.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/resources.ts web/src/lib/coach-dna/resources.test.ts
git commit -m "feat(coach-dna): add curated growth resources per category"
```

---

### Task 3: Extend `SelfAssessmentSummary` type

**Files:**
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Produces (changed shape): `SelfAssessmentSummary.cons` entries gain `resources: { title: string; description: string; url: string | null }[]`. `pros` is unchanged.

- [ ] **Step 1: Update the interface**

In `web/src/lib/supabase/types.ts`, find:

```ts
export interface SelfAssessmentSummary {
  primaryType: string
  secondaryType: string | null
  narrative: string
  pros: { categorySlug: string; text: string }[]
  cons: { categorySlug: string; text: string }[]
}
```

Replace with:

```ts
export interface SelfAssessmentSummary {
  primaryType: string
  secondaryType: string | null
  narrative: string
  pros: { categorySlug: string; text: string }[]
  cons: { categorySlug: string; text: string; resources: { title: string; description: string; url: string | null }[] }[]
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: errors in `summary-actions.ts` (cons no longer match the new shape) — expected at this point, Task 4 fixes them. Confirm the errors are isolated to `summary-actions.ts` and nowhere else yet (nothing else constructs a `SelfAssessmentSummary` object directly).

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add resources field to SelfAssessmentSummary cons"
```

---

### Task 4: Expand focus-area text and attach resources in `summary-actions.ts`

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`

**Interfaces:**
- Consumes: `resourcesFor` (Task 2).
- Unchanged: `generateSelfAssessmentSummary(attemptId: string): Promise<SelfAssessmentSummary>`.

**Context for the implementer:** This task changes two things in the same function: the AI prompt now asks for 2-3 sentences per focus area instead of one, and after the AI's `cons` are zipped onto the TS-computed archetype slugs (existing pattern — don't change that zip), each con gets its `resources` field attached via `resourcesFor(categorySlug)`. The AI response shape itself (`cons: [{categorySlug, text}]`) does NOT change — resources are attached in code afterward, never requested from or returned by the model.

- [ ] **Step 1: Update the test fixtures and add a resources assertion**

In `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`, add the import and a new test. First add the import at the top alongside the existing import:

```ts
import { generateSelfAssessmentSummary } from './summary-actions'
import { CATEGORY_RESOURCES } from '@/lib/coach-dna/resources'
```

Then add this test in the `describe('generateSelfAssessmentSummary', ...)` block, alongside `'uses the computed archetype slugs, not the slugs the model returned'`:

```ts
  it('attaches the curated resources for each focus area\'s category, never from the model', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    // EXPECTED_CONS = ['motivator', 'culture-builder', 'organiser']
    expect(result.cons[0].resources).toEqual(CATEGORY_RESOURCES['motivator'])
    expect(result.cons[1].resources).toEqual(CATEGORY_RESOURCES['culture-builder'])
    expect(result.cons[2].resources).toEqual(CATEGORY_RESOURCES['organiser'])
  })
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/summary-actions.test.ts"`
Expected: FAIL — `result.cons[0].resources` is `undefined`, the implementation doesn't attach resources yet.

- [ ] **Step 3: Update the prompt and the cons-zipping**

In `web/src/app/(app)/admin/coach-dna/summary-actions.ts`, add the import:

```ts
import { resourcesFor } from '@/lib/coach-dna/resources'
```

Replace the prompt's focus-area line (inside the template literal):

```ts
Their growth-area categories, in this exact order (write one short constructive sentence for each, in the same order): ${archetype.cons.map(slug => labelFor(slug)).join(', ')}
```

with:

```ts
Their growth-area categories, in this exact order (write 2-3 sentences for each: what the gap looks like in practice, and one concrete thing to try, in the same order): ${archetype.cons.map(slug => labelFor(slug)).join(', ')}
```

And update the JSON shape line in the same prompt from:

```ts
Respond with ONLY a valid JSON object, no markdown fences, no explanation. "pros" must contain exactly ${archetype.pros.length} entries and "cons" exactly ${archetype.cons.length}, in the same order as the lists above. Shape:
{"narrative":"one paragraph, 2-4 sentences","pros":[{"categorySlug":"...","text":"one sentence"}],"cons":[{"categorySlug":"...","text":"one sentence"}]}`
```

to:

```ts
Respond with ONLY a valid JSON object, no markdown fences, no explanation. "pros" must contain exactly ${archetype.pros.length} entries and "cons" exactly ${archetype.cons.length}, in the same order as the lists above. Shape:
{"narrative":"one paragraph, 2-4 sentences","pros":[{"categorySlug":"...","text":"one sentence"}],"cons":[{"categorySlug":"...","text":"2-3 sentences: what the gap looks like in practice, and one concrete thing to try"}]}`
```

Then update the final `summary` construction. Replace:

```ts
  const summary: SelfAssessmentSummary = {
    primaryType: archetype.primaryType,
    secondaryType: archetype.secondaryType,
    narrative: parsed.narrative,
    pros: archetype.pros.map((categorySlug, i) => ({ categorySlug, text: parsed.pros[i].text })),
    cons: archetype.cons.map((categorySlug, i) => ({ categorySlug, text: parsed.cons[i].text })),
  }
```

with:

```ts
  const summary: SelfAssessmentSummary = {
    primaryType: archetype.primaryType,
    secondaryType: archetype.secondaryType,
    narrative: parsed.narrative,
    pros: archetype.pros.map((categorySlug, i) => ({ categorySlug, text: parsed.pros[i].text })),
    cons: archetype.cons.map((categorySlug, i) => ({
      categorySlug,
      text: parsed.cons[i].text,
      resources: resourcesFor(categorySlug),
    })),
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/summary-actions.test.ts"`
Expected: PASS (all tests, including the new resources test)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors (the `SelfAssessmentSummary` shape mismatch from Task 3 is now resolved).

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/summary-actions.ts" "web/src/app/(app)/admin/coach-dna/summary-actions.test.ts"
git commit -m "feat(coach-dna): expand focus-area guidance and attach curated resources"
```

---

### Task 5: Render resources on the results page

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`

**Interfaces:**
- Consumes: `SelfAssessmentSummary` (Task 3's new `cons[].resources` shape).

- [ ] **Step 1: Update the focus areas block**

In `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`, replace:

```tsx
          <div>
            <h2 className="text-sm font-semibold text-orange-400 mb-2">Focus areas</h2>
            <ul className="space-y-1.5">
              {summary.cons.map(con => (
                <li key={con.categorySlug} className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">{labelFor(con.categorySlug)}:</span> {con.text}
                </li>
              ))}
            </ul>
          </div>
```

with:

```tsx
          <div>
            <h2 className="text-sm font-semibold text-orange-400 mb-2">Focus areas</h2>
            <ul className="space-y-4">
              {summary.cons.map(con => (
                <li key={con.categorySlug} className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">{labelFor(con.categorySlug)}:</span> {con.text}
                  {con.resources.length > 0 && (
                    <ul className="mt-1.5 space-y-1 pl-3 border-l border-zinc-800">
                      {con.resources.map(resource => (
                        <li key={resource.title} className="text-xs text-zinc-500">
                          {resource.url ? (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 font-medium"
                            >
                              {resource.title}
                            </a>
                          ) : (
                            <span className="text-zinc-300 font-medium">{resource.title}</span>
                          )}
                          {' — '}{resource.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the coach-dna test suite**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna"`
Expected: all pass, no regressions (this page has no dedicated test file, per this codebase's established pattern of not unit-testing Server Component pages — this step confirms nothing else in the directory broke).

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx"
git commit -m "feat(coach-dna): render curated resources under each focus area on the results page"
```

---

### Task 6: Render resources in the PDF

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`

**Interfaces:**
- Consumes: `SelfAssessmentSummary` (Task 3's new `cons[].resources` shape). `CoachDnaSummaryPDF({ data, completedAt, logoSrc })`'s signature is unchanged.

**Context for the implementer:** `CommentBlock` currently renders one label + one body `Text`. Cons now need a resources list underneath the body. Rather than complicate the shared `CommentBlock` (used by both pros and cons) with an optional-resources prop, add a small dedicated block for cons only, reusing `CommentBlock` for the label/body and appending a resources list beneath it in the cons `.map()`.

- [ ] **Step 1: Add resource-list styles**

In `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`, add to the `StyleSheet.create` call, alongside the existing `commentBlock`/`commentBody` styles:

```ts
  resourceList: { marginTop: 6, paddingLeft: 10 },
  resourceItem: { fontSize: 8, color: MUTED, lineHeight: 1.5, marginBottom: 2 },
  resourceTitle: { fontFamily: 'Helvetica-Bold', color: MID },
```

- [ ] **Step 2: Render resources under each con**

Replace:

```tsx
          {data.cons.map(con => (
            <CommentBlock key={con.categorySlug} label={labelFor(con.categorySlug).toUpperCase()} text={con.text} color={AMBER} />
          ))}
```

with:

```tsx
          {data.cons.map(con => (
            <View key={con.categorySlug}>
              <CommentBlock label={labelFor(con.categorySlug).toUpperCase()} text={con.text} color={AMBER} />
              {con.resources.length > 0 && (
                <View style={s.resourceList}>
                  {con.resources.map(resource => (
                    <Text key={resource.title} style={s.resourceItem}>
                      <Text style={s.resourceTitle}>{resource.title}</Text>
                      {' — '}{resource.description}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the coach-dna test suite**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna"`
Expected: all pass — `pdf-actions.test.ts` mocks `renderToBuffer` and never invokes `CoachDnaSummaryPDF`'s function body, so this change has no test-visible surface there; this step confirms nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx"
git commit -m "feat(coach-dna): render curated resources under each focus area in the PDF"
```

---

### Task 7: Render resources in the results email

**Files:**
- Modify: `web/src/lib/email.ts`
- Modify: `web/src/lib/email.test.ts`

**Interfaces:**
- Produces (changed signature): `sendCoachDnaSummaryEmail`'s `summary` parameter's `cons` entries gain `resources: { title: string; description: string; url: string | null }[]`.

**Context for the implementer:** `featureList` and `para` are the two existing shared helpers this function already uses — don't change either helper itself, only how `sendCoachDnaSummaryEmail` calls them for `cons`. Currently `cons` is rendered as one `featureList` call across all cons; it changes to one block per con (label + expanded text via `para`, then a `featureList` of that con's resources underneath, when it has any).

- [ ] **Step 1: Update the test fixture and add a resources assertion**

In `web/src/lib/email.test.ts`, find the `summary` fixture in the `describe('sendCoachDnaSummaryEmail', ...)` block:

```ts
  const summary = {
    primaryType: 'teacher',
    secondaryType: 'motivator',
    narrative: 'You lead with clarity.',
    pros: [{ categorySlug: 'teacher', text: 'You explain things well.' }],
    cons: [{ categorySlug: 'organiser', text: 'Sessions could run tighter.' }],
  }
```

Replace with:

```ts
  const summary = {
    primaryType: 'teacher',
    secondaryType: 'motivator',
    narrative: 'You lead with clarity.',
    pros: [{ categorySlug: 'teacher', text: 'You explain things well.' }],
    cons: [{
      categorySlug: 'organiser',
      text: 'Sessions could run tighter. Try timeboxing each drill before you start.',
      resources: [{ title: 'Periodization Training for Sports', description: 'Structuring a season.', url: 'https://openlibrary.org/works/OL1850738W' }],
    }],
  }
```

Then add this test after `'includes a CTA link back to the results page on-site'`:

```ts
  it('includes each focus area\'s curated resources in the email body', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_345' }, error: null })
    await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Periodization Training for Sports'),
    }))
  })
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `cd web && npx vitest run src/lib/email.test.ts`
Expected: FAIL — the implementation doesn't render resources yet, and the `cons` type in `sendCoachDnaSummaryEmail`'s signature doesn't yet accept `resources`.

- [ ] **Step 3: Update the implementation**

In `web/src/lib/email.ts`, replace the `sendCoachDnaSummaryEmail` function:

```ts
export async function sendCoachDnaSummaryEmail(
  to: string,
  summary: { primaryType: string; secondaryType: string | null; pros: { categorySlug: string; text: string }[]; cons: { categorySlug: string; text: string }[] },
  pdfBuffer: Buffer,
): Promise<EmailResult> {
  const typeLine = `${esc(labelFor(summary.primaryType))}${summary.secondaryType ? ` / ${esc(labelFor(summary.secondaryType))}` : ''}`

  const html = layout(`
    ${heading(`You're a ${typeLine} coach.`)}
    ${divider()}
    ${greeting('')}
    ${para('Your Coach DNA self-assessment results are attached to this email as a PDF, and summarised below.')}
    ${featureList(summary.pros.map(pro => `${esc(labelFor(pro.categorySlug))}: ${esc(pro.text)}`))}
    ${para('Focus areas:')}
    ${featureList(summary.cons.map(con => `${esc(labelFor(con.categorySlug))}: ${esc(con.text)}`))}
    ${para('This reflects your self-assessment only, and will update as player and peer feedback comes in.')}
    ${ctaButton('View your full results', `${SITE_URL}/admin/coach-dna`)}
    ${sign()}
  `)

  return send(
    to,
    `You're a ${typeLine} coach — your Coach DNA results`,
    html,
    [{ filename: 'coach-dna-self-assessment.pdf', content: pdfBuffer }],
  )
}
```

with:

```ts
export async function sendCoachDnaSummaryEmail(
  to: string,
  summary: {
    primaryType: string
    secondaryType: string | null
    pros: { categorySlug: string; text: string }[]
    cons: { categorySlug: string; text: string; resources: { title: string; description: string; url: string | null }[] }[]
  },
  pdfBuffer: Buffer,
): Promise<EmailResult> {
  const typeLine = `${esc(labelFor(summary.primaryType))}${summary.secondaryType ? ` / ${esc(labelFor(summary.secondaryType))}` : ''}`

  const consBlocks = summary.cons.map(con => `
    ${para(`<strong style="color:#ffffff;">${esc(labelFor(con.categorySlug))}:</strong> ${esc(con.text)}`)}
    ${con.resources.length > 0 ? featureList(con.resources.map(resource =>
      resource.url
        ? `<a href="${esc(resource.url)}" style="color:#e8560a;">${esc(resource.title)}</a> — ${esc(resource.description)}`
        : `${esc(resource.title)} — ${esc(resource.description)}`,
    )) : ''}
  `).join('')

  const html = layout(`
    ${heading(`You're a ${typeLine} coach.`)}
    ${divider()}
    ${greeting('')}
    ${para('Your Coach DNA self-assessment results are attached to this email as a PDF, and summarised below.')}
    ${featureList(summary.pros.map(pro => `${esc(labelFor(pro.categorySlug))}: ${esc(pro.text)}`))}
    ${para('Focus areas:')}
    ${consBlocks}
    ${para('This reflects your self-assessment only, and will update as player and peer feedback comes in.')}
    ${ctaButton('View your full results', `${SITE_URL}/admin/coach-dna`)}
    ${sign()}
  `)

  return send(
    to,
    `You're a ${typeLine} coach — your Coach DNA results`,
    html,
    [{ filename: 'coach-dna-self-assessment.pdf', content: pdfBuffer }],
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/lib/email.test.ts`
Expected: PASS (all tests, including the new resources test)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/email.ts web/src/lib/email.test.ts
git commit -m "feat(coach-dna): render curated resources under each focus area in the email"
```

---

### Task 8: Full verification

**Files:**
- None created — this task verifies Tasks 1-7 together.

- [ ] **Step 1: Run the full test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npm run test`
Expected: all existing tests plus every changed/new test file from Tasks 1-7 pass, no regressions.

- [ ] **Step 2: Confirm the migration applied live matches the repo**

Run via Supabase MCP (`execute_sql`, `project_id: khslkwspsqyopicxufun`):

```sql
select count(*) from public.assessment_options;
```

Expected: 96 (row count unchanged — this was an UPDATE-only migration, no inserts/deletes).

```sql
select option_text from public.assessment_options where id = 'b0000000-0000-0000-0000-000000000001';
```

Expected: matches the Q1 Teacher row's new text from Task 1 exactly (confirms the live migration actually applied, not just written to the file).

- [ ] **Step 3: Confirm no resource/AI-fabrication leak**

Run: `cd web && grep -rn "resourcesFor\|CATEGORY_RESOURCES" src/app`

Expected: matches only in `summary-actions.ts` (the one place resources are attached) — never inside the AI prompt string itself, and never called from `CoachDnaSummaryPDF.tsx`/`page.tsx`/`email.ts` (those only ever read `.resources` off an already-built `SelfAssessmentSummary`, they never call `resourcesFor` themselves — confirms resources are attached exactly once, in one place).

- [ ] **Step 4: Manual QA (cannot be automated in this environment — report to the human partner instead of claiming it's verified)**

This needs a logged-in admin coach to click through the full flow. Do NOT claim this "works" without doing this:
1. Start a fresh self-assessment (reset the existing attempt's rows, as done previously for this feature, with the human partner's approval).
2. Answer all 24 questions — confirm the 4 options per question now read as genuinely different coaching instincts, not near-duplicates.
3. On the results page, confirm each focus area shows expanded (2-3 sentence) text and a resources list underneath, with working links that open in a new tab.
4. Email the PDF — confirm the PDF shows resources under each focus area, and confirm the email body shows resources under each focus area with clickable links.

If Playwright MCP tools or admin credentials are not available, explicitly report that manual QA was NOT performed and ask the human partner to click through the flow themselves before considering this plan done.

- [ ] **Step 5: Commit (only if Step 1-3 required fixes)**

If any step required a fix, commit it with an appropriate message. If everything passed cleanly, skip this step.
