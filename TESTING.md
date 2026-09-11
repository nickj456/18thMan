# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

- **Vitest 3** with **@testing-library/react 16** (jsdom 25 environment) for the Next.js app in `web/`.
- Config: [web/vitest.config.mts](web/vitest.config.mts) · setup: [web/vitest.setup.ts](web/vitest.setup.ts) (jest-dom matchers + auto cleanup).

## Running tests

```bash
cd web
npm run test        # single run (CI mode)
npm run test:watch  # watch mode
```

CI runs typecheck + tests on every push/PR via [.github/workflows/test.yml](.github/workflows/test.yml).

## Test layers

- **Unit tests** — pure logic in `web/src/lib/` (e.g. `ssrf.test.ts`, `clubs.test.ts`). Co-located next to the source file as `<name>.test.ts`. Use `// @vitest-environment node` for server-only modules.
- **Integration/component tests** — React components in `web/src/components/` as `<Name>.test.tsx`, rendered with Testing Library and driven with `userEvent`. Mock network with `vi.stubGlobal('fetch', …)` and Supabase with `vi.mock('@/lib/supabase/…')`.
- **Source-scanning guards** — tests that walk the source tree instead of exercising one unit, catching mistakes the compiler can't see. [web/src/lib/ai/groq-models.test.ts](web/src/lib/ai/groq-models.test.ts) walks `web/src` and fails if a decommissioned Groq model id appears anywhere outside `lib/ai/`, if a model id is hardcoded at a `groq(...)` call site instead of imported from `@/lib/ai/groq-models`, or if a constant exported from `groq-models.ts` itself falls outside the allowlist. It also pins six call sites to their intended tier constant. Groq model ids only fail at call time — never at `next build`, never in typecheck — so this suite (via `npm test` and CI, not the Next build) is the only thing standing between a retired id and a dead feature in production. The scanning helpers live in [web/src/lib/ai/groq-model-scan.ts](web/src/lib/ai/groq-model-scan.ts) so the test can feed them a synthetic corpus with a known violation and assert the scanner *reports* it — a guard only ever observed passing is not a guard.
- **Smoke/E2E** — not yet configured; gstack `/qa` and `/design-review` cover browser-level verification for now.

## Conventions

- File naming: co-located `foo.test.ts` / `Component.test.tsx` (matched by `src/**/*.test.{ts,tsx}`).
- Assert real behavior with meaningful matchers — never `expect(x).toBeDefined()` filler.
- One `describe` per unit; test names state the behavior ("returns false for an admin of a different club").
- Never import secrets or real credentials in tests; mock service clients.
- When fixing a bug, add a regression test in the same commit.
