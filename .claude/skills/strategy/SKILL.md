---
name: strategy
description: Strategy ideation companion for BitFox — turns "add/explore a better strategy" into ONE disciplined candidate with pros/cons, hard targets, and hard stops, then hands off to /spec. Checks measured coverage before trusting any verdict. Step 0 of the GHBF workflow for strategy work.
---

# strategy — Disciplined Strategy Ideation

Use when the user says anything like "add a better strategy", "explore strategy ideas", or "can we make X profitable". Your job is to get from vague ambition to ONE well-argued candidate — or to an honest "nothing worth building right now" — without re-deriving known results or spiraling into tuning.

## The distinction this skill exists to protect

**"Tested and failed" ≠ "never tested."** The ledger records verdicts for the cells that were actually run. It is silent about every cell that was not. Treating that silence as a negative verdict is the single most expensive mistake available here — it once sent a session into speccing an entirely different project on the strength of a timeframe nobody had ever benchmarked.

Two budgets, and they are not the same:

| Budget | Cost | Rule |
|---|---|---|
| **Measurement** — running a benchmark on an untested cell | ~30s, no risk | **Effectively unlimited. Never skip a cheap measurement to save time.** |
| **Design iteration** — changing signal logic, tuning params | expensive, overfits | Capped at 2 per session (see Hard stops) |

The old version of this skill said "never re-benchmark." That was meant to stop re-deriving *known* numbers. It was read as "don't measure," and it caused exactly the failure above. Measuring an untested cell is not re-benchmarking.

## Hard start

1. Read `.claude/context/STRATEGY-LEDGER.md` — verdicts, **coverage matrix**, open leads, rejected approaches, ship bar, hard stops.
2. **Coverage gate (mandatory, before any ideation).** Identify the symbol × timeframe cells the user's request implies. For each one, check the ledger's coverage matrix:
   - **In the matrix** → use the recorded number. Do not re-run unless the engine or an indicator changed since that row's date.
   - **Not in the matrix** → **run it now**, before forming any opinion. `node examples/StrategyBenchmark.js <SYM> <TF> 1000 <pollRate>` takes ~30 seconds and settles the question that a summary cannot.
   - Report which cells were already known and which you had to measure. The user should never have to guess whether a claim is measured or inherited.
3. Read `.claude/skills/shared/conventions.md`; skim `.claude/context/STRATEGY-RESEARCH.md` §0 only for deeper history.
4. Confirm scope: **one candidate per session**. If the user names an idea, start there; otherwise start from the ledger's **Open leads** — never from a blank page.

## Scope discipline for claims

Every verdict you state, write, or repeat must carry the scope it was measured at.

- ✅ "SuperTrend is no-go at 1h/4h/1d on BTC/ADA."
- ❌ "SuperTrend is no-go."

Before telling a user an idea is dead, ask yourself: *dead where?* If the answer isn't in the coverage matrix, you have not established it and must say so plainly — "untested at 15m; I can measure that in about 30 seconds" is the correct response, not a hedge.

This applies with equal force to negative results you generated earlier in the same session.

## Candidate development

Present 2–3 candidates maximum (from the leads + at most one novel idea), each with this frame, then converge on ONE with the user:

- **Hypothesis** — who is on the other side and why do they lose? One sentence. No hypothesis, no candidate.
- **Cost-hurdle math** — expected capture per trade vs the ~0.2–0.3% taker round trip (or maker, if the exit is passive). If avg capture < 3× costs, kill it here. Cheapest possible test.
  - State the **holding horizon** the math assumes. Capture scales with hold time; a hurdle calculation without a stated horizon is meaningless. Never illustrate the hurdle against a single bar's range — it invites the reading that you priced a one-bar trade, and it is not the load-bearing evidence anyway.
  - Distinguish **fixed-horizon** exits from **signal-driven** exits. They produce different capture distributions and a probe of one says little about the other.
- **Sample** — how many trades will the window produce? < 50 OOS trades = statistically empty (see Bollinger 1d, n=14).
- **Regime dependence** — needs trending/ranging/high-vol? How is that detected?
- **Overfitting surface** — more than ~5 tunable numbers is a red flag.
- **Feasibility** — which of the 39 indicators in `lib/indicators/Indicators.js`; anything missing?
- **Prior art in the ledger** — is this a Rejected Approach wearing a new hat? Say so explicitly. Check the *scope* of that rejection before applying it.

Use AskUserQuestion to pick the candidate if the user hasn't; recommend one.

## Statistical hygiene

- **Overlapping windows are not independent observations.** A probe that samples forward returns every bar over an H-bar horizon inflates its t-stat by roughly √H. Use non-overlapping samples, or discount accordingly and say which you did.
- **Sign flips across symbols are a noise signature**, not a pair of findings. If a signal is positive on BTC and negative on SOL, the honest reading is "no edge," not "works on BTC."
- **Monotonic decay as sample grows** (PF falling as the trigger loosens) is a textbook noise curve — record it and stop.
- **In-sample positives are leads, never verdicts.** A single positive cell earns a walk-forward run, nothing more.

## Hard targets and hard stops (non-negotiable, copy into the issue)

The ledger's **Ship bar**: positive walk-forward OOS (≥3/4 folds), pooled OOS PF ≥ 1.2 on ≥ 50 trades, beats buy-and-hold, MaxDD < 30%, holds on 2+ symbols or timeframes.

**Hard stops** bound the session: max **2 design iterations**, grids ≤ ~10 configs walk-forward only, failed OOS → record and stop. State these up front so nobody is surprised when you stop.

These cap *design*, not *measurement*. Running the benchmark across ten symbols to test whether a positive cell generalizes is measurement — it costs minutes and is always worth it. Changing the entry rule because the first version lost is a design iteration and counts against the cap.

## Handoff

1. `/spec` — write the GHBF issue. Acceptance Criteria MUST embed the ship bar and reference `examples/StrategyBenchmark.js` + `examples/RegimeWalkForward.js` (walk-forward template). Registration + offline tests per `.claude/context/STRATEGY-RESEARCH.md` §7.
2. `/build GHBF-<n>` implements; validation = benchmark + walk-forward on the honest engine.
3. **Always update `.claude/context/STRATEGY-LEDGER.md`** — new verdict rows, **new coverage-matrix cells (including the ones that came back negative)**, moved leads, new rejected approaches. Recording a negative result is a success of the process. Recording *coverage* is what stops the next session from mistaking silence for a verdict.

## Anti-patterns (refuse these politely)

- **Treating an untested cell as a tested failure.** The most costly error this skill can make. Measure it.
- **Answering a coverage question from a summary** when a 30-second command would settle it.
- **Stating a verdict without its scope** ("X doesn't work" instead of "X doesn't work at 1h/4h/1d on BTC/ADA").
- "Let's just tweak the parameters and re-run" → tuning spiral; point at the walk-forward evidence.
- "Test it on the last 3 months" → cherry-picked window; use standard spans.
- Skipping the cost-hurdle math because the idea is exciting.
- Building two candidates at once.
