# AI Usage

This solution was built by **Emmanuel**, using **Claude Code** as a directed pair-programming tool. Every architectural constraint, process rule, and acceptance check below was set and enforced by Emmanuel; Claude executed within those constraints and was corrected/redirected where its output fell short of them.

## Planning and prompt engineering

The build followed a deliberate, staged sequence rather than one open-ended request:

1. **Audit** - a review pass scoped narrowly to cleaning up and standardizing the existing work, not adding scope.
2. **Strategic review** - a request for a prioritized list of gaps and next steps, used to surface issues against the assessment brief before committing more effort in any one direction.
3. **Constrained rebuild** - a directive to rebuild the git history end-to-end as a step-by-step TDD journey rather than one bulk commit, specifying both the methodology (TDD) and the granularity (sequential, not all at once) up front, with the commit history itself as the artifact that had to prove it.
4. **Completeness verification** - a direct check on whether the assessment was actually finished, used as a closing gate rather than assuming the build was complete. This caught that CI's actual green status on GitHub's runners (not just locally) had not yet been confirmed.
5. **Ownership and attribution correction** - noticing GitHub's contributor list and directing a thorough fix once it didn't reflect who is actually accountable for this work.

Each stage's output was reviewed before the next stage was authorized - nothing here is a single unreviewed generation.

## Code standards mandated and enforced

- **Red-green-refactor per behavior.** Every feature commit has a preceding failing-test commit; refactors are their own commits, made only once the test suite was green before and after.
- **Nothing committed without local verification.** `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test` were run before every commit in this history - not just at the end.
- **Honesty over a clean narrative.** Where a test passed without needing new code (e.g. the concurrency test in `tests/concurrency`), the commit message says so explicitly rather than presenting it as a red-green pair it wasn't. A fabricated "red" step was rejected as dishonest.
- **Docs before code.** `docs/architecture.md` was written and agreed before any implementation, so later commits built against a stated design rather than an improvised one.
- **Clean-checkout discipline.** The finished repository was validated from a fresh `git clone` (not the working directory) - install, typecheck, lint, format, test, build - which is how the `.gitattributes` line-ending bug was actually caught: a fresh Windows clone failed `format:check` even though CI on GitHub's Linux runners was green. That distinction, and the decision to fix it rather than ignore a "works in CI" result, was Emmanuel's call.

## Technical decision-making

Decisions with real trade-offs were surfaced as explicit choices, not made silently by Claude:

- **Reset and rebuild git history vs. start a fresh project** - chosen over the alternative (new directories, old history kept as backup) to keep the two live GitHub repositories as the canonical record.
- **Two repositories vs. a monorepo** - chosen to keep the backend's history and CI (the assessment's stated primary focus) free of frontend churn.
- **Manual GitHub repo creation vs. installing and authenticating the `gh` CLI** - chosen to avoid an unnecessary tool install and an interactive browser login neither party could fully automate.
- **Interface segregation on `WalletReader`/`WalletRepository`** - `GetBalance` was scoped to depend only on `findById`, not the full repository, as a concrete applied design decision reviewed during the rebuild.
- **Wiring the outbox worker into `server.ts`** - the transactional outbox and its publisher already existed and were tested, but nothing in the running server ever called them; this was identified in the completeness review and fixed with a scheduler, verified live (server started, withdrawal submitted, publish confirmed in logs), not just unit-tested.

The underlying technology choices for the project - Node.js/TypeScript, Fastify, SQLite with the transactional outbox pattern, React/Vite on the client - were Emmanuel's starting point for this assessment; this build preserved, hardened, and completed them rather than replacing them.

## What AI did not do

- No code was committed without being run and verified locally first.
- No design decision with a real trade-off was made without being surfaced for a decision.
- No custom subagents, skills, or automation beyond the standard Claude Code CLI were used - every change went through the same directed, human-reviewed loop described above.
- The author is responsible for, and can explain, every line, every commit, and every decision in this repository.
