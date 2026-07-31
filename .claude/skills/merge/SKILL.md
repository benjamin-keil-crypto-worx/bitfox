---
name: merge
description: Final gate of the GHBF workflow — verify review verdict and CI, merge the PR into develop with a merge commit, confirm issue closure, and clean up branches. Step 4 of the GHBF workflow (spec → build → review → merge).
---

# merge — Gate and Merge a GHBF PR

Input: a PR number (or GHBF ID → resolve the open PR from the branch prefix). This skill merges only; it never fixes, re-reviews, or overrides gates. **Any gate failure → stop, report exactly what failed, do not merge.**

## Setup

1. Read `.claude/skills/shared/conventions.md`.
2. Verify gh account: `gh auth switch --hostname github.com --user benjamin-keil-crypto-worx && gh auth status`.

## Workflow

### 1. Gate checks

```bash
gh pr view <PR#> --repo benjamin-keil-crypto-worx/bitfox \
  --json state,baseRefName,headRefName,title,body,mergeable,statusCheckRollup,comments
```

All of the following must hold:

1. **State** is `OPEN` and `mergeable` is not `CONFLICTING`.
2. **Base** is `develop`.
3. **Naming**: head branch matches `feature/GHBF-<n>-`, title starts `GHBF-<n>:`, body contains `Closes #<n>`.
4. **CI green**: every entry in `statusCheckRollup` concluded `SUCCESS` (or `NEUTRAL`/`SKIPPED`). Pending → wait or stop, report.
5. **Verdict**: scanning `comments` newest-first, the most recent comment whose body starts with `## Review Verdict:` says `APPROVED`. No verdict comment at all → stop, send to `/review`. Latest verdict `CHANGES REQUESTED` → stop, send to `/build`.
6. **Freshness**: if commits were pushed after the APPROVED verdict comment (compare timestamps via `gh pr view --json commits`), the approval is stale → stop, re-run `/review`.

### 2. Merge

```bash
gh pr merge <PR#> --repo benjamin-keil-crypto-worx/bitfox --merge --delete-branch
```

Merge commit style only (repo convention) — never `--squash` or `--rebase`.

### 3. Confirm issue closure

`Closes #<n>` normally auto-closes only when merging to the **default branch (master)** — merging to `develop` will usually NOT auto-close it. Check and close explicitly:

```bash
gh issue view <n> --repo benjamin-keil-crypto-worx/bitfox --json state
gh issue close <n> --repo benjamin-keil-crypto-worx/bitfox --comment "Merged into develop in PR #<PR#>."
```

(Skip the close if the user wants issues to stay open until a master release — ask once if unclear, then remember their preference.)

### 4. Local sync

```bash
git checkout develop && git pull origin develop
git branch -d feature/GHBF-<n>-<FeatureName>   # -d, not -D: fails if unmerged, which is a signal
git fetch --prune
```

### 5. Report

Announce: merged PR, merge commit SHA, issue state, branch cleanup done. Note that `develop` → `master` promotion is a separate release decision, not part of this workflow.
