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
- **Smoke/E2E** — not yet configured; gstack `/qa` and `/design-review` cover browser-level verification for now.

## Conventions

- File naming: co-located `foo.test.ts` / `Component.test.tsx` (matched by `src/**/*.test.{ts,tsx}`).
- Assert real behavior with meaningful matchers — never `expect(x).toBeDefined()` filler.
- One `describe` per unit; test names state the behavior ("returns false for an admin of a different club").
- Never import secrets or real credentials in tests; mock service clients.
- When fixing a bug, add a regression test in the same commit.
