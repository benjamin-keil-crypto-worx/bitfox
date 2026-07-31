---
name: strategy
description: Strategy ideation companion for BitFox — turns "add/explore a better strategy" into ONE disciplined candidate with pros/cons, hard targets, and hard stops, then hands off to /spec. Reads the strategy ledger instead of re-investigating. Step 0 of the GHBF workflow for strategy work.
---

# strategy — Disciplined Strategy Ideation

Use when the user says anything like "add a better strategy", "explore strategy ideas", or "can we make X profitable". Your job is to get from vague ambition to ONE well-argued candidate — or to an honest "nothing worth building right now" — without re-deriving known results or spiraling into tuning.

## Hard start (do this, skip everything it makes redundant)

1. Read `.claude/context/STRATEGY-LEDGER.md` — the canonical verdicts, open leads, rejected approaches, ship bar, and hard stops. **Never re-benchmark existing strategies**; their honest numbers are in the ledger. Re-run only if the engine or indicators changed since a row's date.
2. Read `.claude/skills/shared/conventions.md` (workflow rules) and skim `.claude/context/STRATEGY-RESEARCH.md` §0 only if you need the deeper history.
3. Confirm the scope with the user: **one candidate per session** (ledger hard stop). If they name an idea, start from it; otherwise start from the ledger's **Open leads** — never from a blank page.

## Candidate development

Present 2–3 candidates maximum (from the leads + at most one novel idea), each with this pros/cons frame, then converge on ONE with the user:

- **Hypothesis** — who is on the other side of the trade and why do they lose? One sentence. No hypothesis, no candidate.
- **Cost-hurdle math** — expected move captured per trade vs the ~0.2% taker round-trip (or ~0.1% maker). If avg capture < 3× costs, say so and kill it here. This is the cheapest possible test and it killed every 1h idea to date.
- **Sample** — how many trades will the tested window produce? < 50 OOS trades = statistically empty (see Bollinger 1d, n=14).
- **Regime dependence** — does it need trending/ranging/high-vol conditions, and how does it detect them?
- **Overfitting surface** — how many parameters? More than ~5 tunable numbers is a red flag.
- **Feasibility** — which of the 39 indicators in `lib/indicators/Indicators.js` it needs; anything missing?
- **Prior art in the ledger** — is this a Rejected Approach wearing a new hat? Say so explicitly.

Use AskUserQuestion to pick the candidate if the user hasn't; recommend one.

## Hard targets and hard stops (non-negotiable, copy into the issue)

The ledger's **Ship bar** is the acceptance bar: positive walk-forward OOS (≥3/4 folds), pooled OOS PF ≥ 1.2 on ≥ 50 trades, beats buy-and-hold, MaxDD < 30%, holds on 2+ symbols or timeframes.

The ledger's **Hard stops** bound the session: max 2 design iterations, grids ≤ ~10 configs walk-forward only, failed OOS → record and stop. State these to the user up front so nobody is surprised when you stop.

## Handoff

1. `/spec` — write the GHBF issue for the chosen candidate. The issue's Acceptance Criteria MUST embed the ship bar and reference the validation commands (`examples/StrategyBenchmark.js`, `examples/RegimeWalkForward.js` as the walk-forward template). Registration + offline tests per `.claude/context/STRATEGY-RESEARCH.md` §7.
2. `/build GHBF-<n>` implements; validation = benchmark + walk-forward on the honest engine.
3. **Always update `.claude/context/STRATEGY-LEDGER.md`** at the end — new verdict row, moved/removed leads, new rejected approaches. A negative result recorded is a success of the process; the ledger is why the next session starts ahead of this one.

## Anti-patterns (refuse these politely)

- "Let's just tweak the parameters and re-run" → that's the tuning spiral; point at the walk-forward evidence in the ledger.
- "Test it on the last 3 months" → cherry-picked windows; use the standard spans.
- Skipping the cost-hurdle math because the idea is exciting.
- Building two candidates at once.
