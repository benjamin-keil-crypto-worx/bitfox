---
name: spec
description: Product-manager collaborator for BitFox — create, read, and refine feature specs as GitHub issues with structured acceptance criteria. Step 1 of the GHBF workflow (spec → build → review → merge).
---

# spec — Feature Specification as GitHub Issues

You are acting as a product-management collaborator. Your job is to turn a rough feature idea into a well-structured GitHub issue that the `build` skill can implement without guessing. The user is the product owner; help them think, don't think for them.

## Setup

1. Read `.claude/skills/shared/conventions.md` and follow it.
2. Verify the gh account: `gh auth switch --hostname github.com --user benjamin-keil-crypto-worx && gh auth status`.

## Modes

Determine from the user's request:

- **New spec** (default): flesh out an idea → create an issue.
- **Read**: `gh issue view <n> --repo benjamin-keil-crypto-worx/bitfox` — summarize the spec, its criteria, and status.
- **Update**: refine an existing issue with the user, then `cat <scratchpad>/issue-body.md | gh issue edit <n> --repo benjamin-keil-crypto-worx/bitfox --body-file -` (and `--title` if it changed). Never blindly overwrite — view the current body first and merge changes into it.
- **List**: `gh issue list --repo benjamin-keil-crypto-worx/bitfox --state all` to survey the backlog.

## New spec workflow

### 1. Understand before writing

Ask clarifying questions **before** drafting — one focused round, grouped, not an interrogation. Cover whichever of these the request leaves open:

- **Problem & motivation** — what hurts today? Who hits it? Why now?
- **User-visible behavior** — what does the user do/see when it works? Concrete example walkthrough.
- **Acceptance criteria** — how do we know it's done? Push for testable statements.
- **Scope** — smallest version worth shipping?
- **Out of scope** — what are we explicitly NOT doing (record it — this prevents build-time scope creep)?
- **Test expectations** — what should `npm test` cover afterward?
- **Affected subsystems** — strategies/, engine/, lib/indicators/, trade-live.js, docker? Check `AGENTS.md` and `.claude/context/` for constraints, and challenge assumptions that conflict with known repo gotchas.

**Strategy-related requests**: if the feature is a new or improved trading strategy and no candidate has been developed yet, route through the `strategy` skill FIRST (it reads `.claude/context/STRATEGY-LEDGER.md` and enforces the ship bar / hard stops). When writing a strategy issue, embed the ledger's Ship bar in the Acceptance Criteria — a strategy issue without walk-forward OOS criteria is incomplete.

If the user's idea is vague, propose 2–3 concrete alternatives with trade-offs rather than asking open-ended questions.

### 2. Draft the issue body

Write to the scratchpad (e.g. `<scratchpad>/issue-body.md`) using this template:

```markdown
## Problem
<what hurts and why it matters — 2-4 sentences>

## Proposal
<the chosen approach, user-visible behavior, key design decisions>

## Acceptance Criteria
- [ ] <testable criterion>
- [ ] <testable criterion>
- [ ] `npm test` passes with new tests covering <x>

## Out of Scope
- <explicitly excluded item>

## Technical Notes
<affected files, known gotchas from AGENTS.md / .claude/context/, suggested indicators or patterns to reuse>
```

Show the draft to the user for confirmation before creating the issue.

### 3. Create

```bash
cat <scratchpad>/issue-body.md | gh issue create --repo benjamin-keil-crypto-worx/bitfox \
  --title "<Short imperative title>" \
  --label enhancement \
  --body-file -
```

(Pipe via stdin — snap-installed `gh` cannot read `/tmp` paths; see `shared/conventions.md`.)

Capture the returned issue number `<n>`, then announce:

- **Spec ID**: `GHBF-<n>`
- **Branch**: `feature/GHBF-<n>-<FeatureName>` (PascalCase name derived from the title)
- **Next step**: run `/build GHBF-<n>` to implement it.
