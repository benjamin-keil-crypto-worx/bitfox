---
name: build
description: Builder loop for BitFox — implement a GHBF GitHub issue on its dedicated feature branch, test, self-review, push, and open a PR to develop. Step 2 of the GHBF workflow (spec → build → review → merge).
---

# build — Implement a GHBF Issue

Input: a GHBF ID (`GHBF-<n>`, or a bare issue number, or an issue URL). The GitHub issue is the contract — implement what it says, nothing more.

## Setup

1. Read `.claude/skills/shared/conventions.md` and follow it — especially the push guardrail.
2. Verify gh account: `gh auth switch --hostname github.com --user benjamin-keil-crypto-worx && gh auth status`.
3. Require a clean working tree: `git status --porcelain` must be empty. If it isn't, stop and ask the user how to handle the pending changes — never stash or commit someone else's work-in-progress.

## Workflow

### 1. Load the contract

```bash
gh issue view <n> --repo benjamin-keil-crypto-worx/bitfox
```

Extract the acceptance criteria checklist and the Out of Scope list. If the issue has no `## Acceptance Criteria` section, stop and send the user to `/spec` — do not invent criteria.

### 2. Branch

Derive `feature/GHBF-<n>-<FeatureName>` (PascalCase from the issue title). Then:

```bash
git fetch origin
git checkout develop && git pull origin develop
git checkout -b feature/GHBF-<n>-<FeatureName>
```

If the branch already exists (resuming work), check it out and rebase-free continue from where it is.

### 3. Implement

- Follow the repo patterns in `AGENTS.md` (strategy contract, builder pattern, state machine) and `.agents/skills/` guidance.
- For strategy work, read `.claude/context/STRATEGY-RESEARCH.md` first — it has verified backtest numbers, metric gotchas, and the registration checklist.
- Respect the Out of Scope list. If you discover the issue's approach is wrong mid-build, stop and report back rather than silently redesigning.

### 4. Quality gate

- `npm test` — must pass (mocha, offline, ~30s). This is the only test gate; CI does not run tests.
- New behavior needs new/updated tests under `test/` (strategy tests follow `test/strategies/strategy-super-trend-test.js`: offline fixture from `test/resources/ohlcv.json`, assert indicator setup, state transitions at known indices, setState round-trip).
- Self-review: `git diff develop...HEAD`, walking each acceptance criterion and confirming the diff satisfies it. Also check for scope creep and drive-by changes.

### 5. Commit & push

```bash
git add <files>   # explicit paths — never `git add .` (may catch unrelated local work)
git commit -m "GHBF-<n>: <summary>"
git branch --show-current | grep -qE '^feature/GHBF-[0-9]+-' && git push -u origin $(git branch --show-current)
```

If the guardrail grep fails, do not push — report why.

### 6. Open the PR

```bash
cat <scratchpad>/pr-body.md | gh pr create --repo benjamin-keil-crypto-worx/bitfox \
  --base develop \
  --title "GHBF-<n>: <Title>" \
  --body-file -
```

(Pipe via stdin — snap-installed `gh` cannot read `/tmp` paths; see `shared/conventions.md`.)

PR body must contain:
- `Closes #<n>`
- The acceptance-criteria checklist, each item annotated with how/where the diff satisfies it
- Test evidence (test count / relevant new test names)

Announce the PR number and hand off: **next step `/review <PR#>`**.
