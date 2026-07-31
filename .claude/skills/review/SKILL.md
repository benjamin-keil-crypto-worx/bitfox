---
name: review
description: Review a GHBF feature PR against its GitHub issue's acceptance criteria and post a structured verdict comment via gh. Step 3 of the GHBF workflow (spec → build → review → merge).
---

# review — Verify a PR Against Its Spec

Input: a PR number, or a GHBF ID (resolve via `gh pr list --repo benjamin-keil-crypto-worx/bitfox --head feature/GHBF-<n>- --state open` / matching branch prefix). The review's reference point is the **GitHub issue**, not your own taste: does the diff deliver every acceptance criterion, and nothing beyond scope?

## Setup

1. Read `.claude/skills/shared/conventions.md` — especially the review-verdict protocol.
2. Verify gh account: `gh auth switch --hostname github.com --user benjamin-keil-crypto-worx && gh auth status`.

## Workflow

### 1. Gather

```bash
gh pr view <PR#> --repo benjamin-keil-crypto-worx/bitfox --json title,baseRefName,headRefName,body,state
gh pr diff <PR#> --repo benjamin-keil-crypto-worx/bitfox
gh pr checks <PR#> --repo benjamin-keil-crypto-worx/bitfox
gh issue view <n> --repo benjamin-keil-crypto-worx/bitfox   # <n> from the PR's Closes line / branch name
```

### 2. Conventions check

- Branch matches `feature/GHBF-<n>-<FeatureName>`; PR title `GHBF-<n>: ...`; base is `develop`; body contains `Closes #<n>`. Any miss is a finding.

### 3. Verify locally

```bash
gh pr checkout <PR#>    # requires clean tree; if dirty, stop and ask
npm test
```

Then walk the diff:

- **Criterion by criterion**: for each `## Acceptance Criteria` checkbox in the issue, find the code that satisfies it. Unmet or partially met → finding.
- **Scope**: anything in the diff not traceable to the issue (drive-by refactors, unrelated files) → finding. Check the issue's Out of Scope list explicitly.
- **Quality**: real defects only — logic errors, missing null guards, broken state transitions, tests that don't actually assert the behavior. For strategy code, check the known gotchas (indicator ordering — longest period LAST; `args.strategyExtras` guarded access; registration completeness in `engine/BitFox.js` + `trade-live.js`). Don't nitpick style the repo itself doesn't follow.

### 4. Post the verdict

Write the review to the scratchpad and post it:

```bash
cat <scratchpad>/review.md | gh pr comment <PR#> --repo benjamin-keil-crypto-worx/bitfox --body-file -
```

(Pipe via stdin — snap-installed `gh` cannot read `/tmp` paths; see `shared/conventions.md`.)

Format (first line is machine-read by the merge skill — exact text matters):

```markdown
## Review Verdict: APPROVED        <!-- or: ## Review Verdict: CHANGES REQUESTED -->

### Acceptance criteria
| Criterion | Status | Evidence |
|---|---|---|
| <criterion> | ✅ / ❌ | <file/lines or failing reason> |

### Findings
1. <finding with file:line>   <!-- omit section if none -->

### Tests
npm test: <pass/fail, count>
```

**APPROVED** only when: every criterion is met, `npm test` passes locally, no scope creep, no unresolved findings. Otherwise **CHANGES REQUESTED** with concrete, actionable findings.

### 5. Guardrails & handoff

- Never push fixes to the branch — requested changes go back through `/build GHBF-<n>` (it resumes the existing branch).
- Restore the user's previous branch after review (`git checkout -`).
- Handoff: APPROVED → "next: `/merge <PR#>`"; CHANGES REQUESTED → "next: `/build GHBF-<n>` to address findings, then re-run `/review`".
