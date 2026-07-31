# BitFox GHBF Workflow Conventions

Shared rules for the `spec`, `build`, `review`, and `merge` skills. Every skill reads this file first and follows it. These rules override defaults; if a rule cannot be satisfied, stop and report — do not improvise around it.

## GitHub account

All `gh` operations use the repo-owner account:

```bash
gh auth switch --hostname github.com --user benjamin-keil-crypto-worx
gh auth status
```

Verify the active account is `benjamin-keil-crypto-worx` before any issue, push, PR, or merge operation. Repo: `benjamin-keil-crypto-worx/bitfox`.

## Branch model

- `master` — release branch. Never commit or push to it.
- `develop` — integration branch. All feature PRs target `develop`. Never commit or push to it directly.
- `feature/GHBF-<n>-<FeatureName>` — the only branches you create, commit to, and push.

`<n>` is the GitHub issue number (the GHBF ID **is** the issue number — there is no separate counter). `<FeatureName>` is short PascalCase derived from the issue title, e.g. issue #123 "Add regime filter strategy" → `feature/GHBF-123-RegimeFilter`.

**Push guardrail** — run before every `git push`:

```bash
git branch --show-current | grep -qE '^feature/GHBF-[0-9]+-' || { echo "REFUSING: not on a GHBF feature branch"; }
```

If the check fails, do not push. No exceptions, including "just this once" fixes on develop.

## IDs, commits, PRs

- Commit messages and PR titles: `GHBF-<n>: <summary>` (e.g. `GHBF-123: Add ADX regime filter strategy`).
- PR body must contain `Closes #<n>` so the issue auto-closes on merge.
- PRs always target `develop` (`gh pr create --base develop`).
- Merge style: **merge commit** (`gh pr merge --merge`) — matches this repo's history. Never squash or rebase-merge.
- `develop` → `master` promotion is a release decision, out of scope for these skills.

## Review-verdict protocol

The same account authors and reviews PRs, and GitHub blocks formal self-approval (`gh pr review --approve` fails on your own PR). Verdicts are therefore **structured PR comments**:

- First line exactly `## Review Verdict: APPROVED` or `## Review Verdict: CHANGES REQUESTED`, followed by the findings.
- The `merge` skill reads the **latest** verdict comment; a later `CHANGES REQUESTED` invalidates an earlier `APPROVED`.
- Reviewers never push fixes to the branch — requested changes go back through the `build` skill.

## gh + body files (snap confinement)

On this machine `gh` is snap-installed and **cannot read files under `/tmp`** (including the session scratchpad). Never pass a `/tmp` path to `--body-file`. Always pipe instead:

```bash
cat <scratchpad>/body.md | gh issue create ... --body-file -
```

This applies to `gh issue create/edit`, `gh pr create`, and `gh pr comment`.

## Quality gate

`npm test` (mocha, offline, ~30s) must pass before any commit is pushed. CI (`bitfox-ci.yml`) runs `npm ci` + build on feature/develop pushes but does **not** run tests — the local test run is the only test gate, so it is mandatory.

## Naming note

These skills are intentionally named `spec`, `build`, `review`, `merge`. If `review` ever collides confusingly with the built-in `/review` command, rename the directory to `ghbf-review` (frontmatter `name:` too) — nothing else depends on the directory name.
