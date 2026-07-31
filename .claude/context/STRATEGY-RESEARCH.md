# BitFox Strategy Research — Verified Findings & New-Strategy Plan Seed

**Date of research:** 2026-07-31 (fresh backtests run against Bybit public data via CCXT).
**Purpose:** This file is the complete bootstrap for a future session. Read it, then plan/build without re-deriving anything. It answers "can BitFox really provide good strategies?", records verified backtest numbers, documents why the reported metrics cannot be trusted, and specs the recommended path: **fix the backtest fill model first (GHBF issue #1), then re-benchmark, then build the new strategy specced below.**

---

## 0. UPDATE 2026-07-31 (later same day): engine fixed, honest baseline established

GHBF-26 (branch `feature/GHBF-26-BacktestRealism`, issue #26) fixed findings (a)–(e), (h), (i) below. Re-running the benchmarks on the fixed engine settles §1's question:

**Under realistic fills, every current strategy loses money.** ADAUSDT 1h: PF 0.74–0.85, Sharpe −0.4 to −3.0, all negative returns. BTCUSDT 1h: PF 0.58–0.86, all negative. ADAUSDT 15m: SuperTrend PF 0.93 (−13%), SuperTrendFull PF 0.64 (−63%, 29.5% WR once its dropped trades are counted). The old headline numbers were 100% fill-model artifact. Full tables in `BENCHMARKS.md` (rewritten with methodology note).

**Regime v1 outcome (built later the same day, GHBF-32, `strategies/Regime.js`):** no edge at 1h with defaults — ADA PF 0.74 (trend sleeve 0.64, range sleeve 0.88), BTC PF 0.57. Edge-triggered SuperTrend entries (fresh flip only) already applied; continuous entries were worse (PF 0.82→0.74 improvement but still negative). Lessons for the next iteration: (a) 1h signals on majors don't clear ~0.2% round-trip costs — test 4h/1d first; (b) the range sleeve on ADA was closest to breakeven (−13.5%) — mean reversion on high-vol alts is the most promising sleeve; (c) any parameter work must be walk-forward (train/test split) or it's curve fitting; (d) Phoenix-style indicator indexing without warm-up offsets is WRONG — use Regime's offset-alignment pattern (`this.offsets`, `valueAt()`).

**GHBF-34/35 outcome (same day, evening):** indicator warm-up alignment fixed everywhere (raw `arr[_index]` reads were stale by the warm-up gap; RSITrend's signal was literally impossible with correct data — comparators flipped). Full 1h/4h/1d sweep + walk-forward study (`examples/RegimeWalkForward.js`) completed: **no strategy/timeframe shows a robust edge**; walk-forward OOS for Regime decisively negative (train winners don't persist); buy-and-hold beat everything. Verdict table in BENCHMARKS.md. The repo's honest positioning: engine/tooling/testing framework, with strategies as reference implementations. Future strategy claims must clear: aligned indicators + honest fills + walk-forward OOS + buy-and-hold comparison. Nearest-to-viable observations if anyone resumes the hunt: Phoenix ADA 4h (PF 1.05), Bollinger BTC 1d (PF 1.20, n=14), Regime BTC 4h (PF 1.07) — all currently within noise.

Consequences for the build session:
- §5 steps 1–3 are DONE. Go straight to building the §6 "Regime" strategy against the fixed engine.
- The honest baseline to beat is now **PF ≈ 0.85 and buy-and-hold**, not the old fictional PF 3+.
- Key insight from the collapse: fixed +3%/−2% TP/SL with ~40% WR is structurally negative-expectancy after costs. The new strategy MUST manage its own exits (ATR-scaled, regime-aware) — finding-driven confirmation of §6's design.
- `examples/StrategyBenchmark.js` was refactored to load data once and run `BackTestEngine` directly (9× fewer API calls, seconds instead of minutes per strategy after the load).
- GHBF-27 (issue #27) covers the remaining findings (f), (g), (j), (k) + repo hardening.

## 1. TL;DR verdict (pre-fix analysis, kept for context)

**The current backtest engine cannot certify ANY strategy as good.** Fresh runs show all 8 runnable strategies wildly profitable (PF 1.6–4.5, avg +0.5–1.2% per trade, on both ADAUSDT and BTCUSDT) — which is not alpha, it's a systematically biased fill model:

> **Every exit — take-profit AND stop-loss, long and short — is filled at the single best price of the exit bar.** Long exits fill at the candle **high** (`engine/BackTest.js` `executeSellOrder`, `exitPrice = currentCandles[2]`), short exits at the candle **low** (`executeBuyOrder`, `exitPrice = currentCandles[3]`). Stop losses route through the same `completeTrade()`, so a "stopped out" long exits at the bar's HIGH — often at a profit.

With TP +3% / SL −2% (the benchmark config), this bias alone plausibly manufactures the entire edge. BENCHMARKS.md's headline numbers (Phoenix +455%, Sharpe 8.01; SuperTrendFull PF 6.59) are artifacts of this model plus a broken Sharpe formula (§4).

**Conclusion:** BitFox's *architecture* (strategy contract, state machine, indicator library, data loading) is solid and pleasant to build on. Its *evidence* is not. Do not build a new strategy until the fill model is fixed — you'd be optimizing against a simulator that rewards everything.

---

## 2. Verified environment & commands

- Backtests need no API keys (public Bybit data). Live trading needs `BYBIT_API_KEY`/`BYBIT_API_SECRET` in `.env`.
- `npm test` — mocha, offline, ~30s, 57 tests. CI does **not** run tests (only `npm ci` + build).
- Backtest entry points:
  - `node examples/StrategyBenchmark.js ADAUSDT 1h 1000` — 9 strategies, sorted table. Uses `profitPct(1.03)`, `stopLossPct(0.98)`, `sidePreference("biDirectional")`.
  - `node examples/PhoenixBacktestExample.js ADAUSDT 1h 1000` — Phoenix with strategyExtras.
  - `node examples/SuperTrendBreakdown.js ADAUSDT 15m 1000` — SuperTrend + SuperTrendFull, long/short/both breakdown.
- Every backtest writes raw trade history to `~/bitfox/<Context>-<YYYY-MM-DD>.json` — **filename has no symbol/timeframe, same-day runs overwrite. Copy the JSON away after each run.**
- Trade JSON schema (per trade): `entryOrder{price,amount,side}`, `exitOrder{...}`, `entryTimestamp`, `exitTimeStamp`, `totalBars`, `funds`, `stopTriggered`, `maxDrawDown`. Trades with `exitTimeStamp == null` never closed.
- The benchmark's third arg (1000) is capital, not candle count; the 1h runs covered **~836 days** (2024-04 → 2026-07), the 15m run ~207 days.

## 3. Fresh backtest results (2026-07-31)

### 3a. As reported by the engine (untrustworthy — see §4)

`StrategyBenchmark.js`, ADAUSDT 1h, ~836 days, TP +3% / SL −2%:

| Strategy | Trades | Return% | WinRate% | PF | Sharpe (printed) | MaxDD% |
|---|---|---|---|---|---|---|
| SmartAccumulate | 1666 | 2726.2 | 41.0 | 4.11 | 0.00 | 5.9 |
| ZemaCrossOver | 1668 | 2673.7 | 40.9 | 4.27 | 0.00 | 3.5 |
| EmaTrend | 990 | 1583.6 | 42.3 | 3.82 | 0.00 | 4.4 |
| MfiMacd | 492 | 806.5 | 42.1 | 4.52 | 0.00 | 3.5 |
| RSITrend | 476 | 638.0 | 37.6 | 3.70 | 0.00 | 4.1 |
| SuperTrend | 446 | 463.3 | 40.4 | 2.57 | 0.00 | 5.4 |
| Phoenix | 382 | 442.9 | 37.7 | 3.40 | 0.00 | 3.8 |
| ThorsHammer | 229 | 229.9 | 43.7 | 2.66 | 0.00 | 6.0 |
| Bollinger | 0 | ERR — `Cannot read properties of undefined (reading 'lookBack')` | | | | |

BTCUSDT 1h (same config): everything still profitable — ZemaCrossOver +624%/PF 2.23 down to Phoenix +110%/PF 1.64. Bollinger ERR again. Sharpe column 0.00 everywhere (bug §4c).

Deep-dives: Phoenix ADAUSDT 1h reported +640%, PF 3.30, "Sharpe 7.96", MaxDD 7.6% (1265 entries, 528 completed). SuperTrendFull ADAUSDT 15m reported +199%, PF 9.33, "Sharpe 20.42", WR 74.5% — **on 145 completed of 386 total trades; 62% of entries never exited and are silently excluded from every metric.**

### 3b. Honest recompute (from the raw trade JSONs, scratchpad `recompute.js`)

Method: replicate the engine's per-trade net return (taker 0.1% both legs, `BackTest.js:171-176`), then: per-trade Sharpe = mean/sd (no annualization); honest annualized Sharpe = per-trade × √(trades/year from actual timestamps); engine-style = per-trade × √365 (what the engine prints).

ADAUSDT 1h (~836 days):

| Strategy | Trades | WR% | Avg/trade | PF | Sharpe/trade | Honest ann. Sharpe | Engine-style √365 |
|---|---|---|---|---|---|---|---|
| ZemaCrossOver | 1668 | 54.7 | +1.15% | 3.83 | 0.52 | 13.9 | 9.84 |
| SmartAccumulate | 1666 | 54.1 | +1.15% | 3.60 | 0.49 | 13.2 | 9.33 |
| EmaTrend | 990 | 52.6 | +1.16% | 3.46 | 0.44 | 9.2 | 8.47 |
| MfiMacd | 492 | 55.5 | +1.21% | 4.11 | 0.55 | 8.1 | 10.51 |
| RSITrend | 476 | 51.7 | +0.98% | 3.10 | 0.44 | 6.3 | 8.34 |
| Phoenix | 382 | 49.0 | +0.92% | 2.89 | 0.41 | 5.3 | 7.77 |
| SuperTrend | 446 | 46.6 | +0.89% | 2.55 | 0.39 | 5.4 | 7.35 |
| ThorsHammer | 229 | 48.9 | +0.97% | 2.70 | 0.42 | 4.2 | 7.96 |

BTCUSDT 1h: same ordering, everything PF 1.65–2.28, avg +0.46–0.80%/trade. SuperTrendFull 15m: PF 9.12, avg +2.20%/trade, Sharpe/trade 1.07 — on the surviving 37% of trades only.

**Key read:** the recompute *confirms the engine's arithmetic* (returns/PF are computed correctly *from the fills*) — the problem is the **fills themselves** (§4a). Even the "honest annualized Sharpe" values of 4–14 are meaningless while every exit prints at the bar's best price. When every strategy including a naive pivot-bounce (SmartAccumulate) and a bare ZEMA cross shows PF > 3.5 on 1600+ trades, the simulator is the edge.

## 4. Metric credibility findings (→ future GHBF issues, NOT yet fixed)

Ordered by severity. File:line refs verified 2026-07-31.

- **(a) Exit fills at best-of-bar price** — `engine/BackTest.js:496-514`: `executeSellOrder` (long exit) uses `currentCandles[2]` (HIGH); `executeBuyOrder` (short exit) uses `currentCandles[3]` (LOW). Applies to TP **and** SL (both route through `completeTrade`, `:472`; `applyStopLoss` `:460` just flags `stopTriggered` then calls it). Fix: TP exits fill at the *target price*, SL exits at the *stop price* (or worse with gap handling: `min(stop, open)` for longs), signal exits at the close.
- **(b) Same-bar TP+SL both execute, TP wins** — `engine/BackTest.js:380-391` (long) / `:336-347` (short): `if (isinProfitRange) completeTrade(); if (isInStopLossRange) applyStopLoss();` — both `if`s can run on one bar (double-processes the last trade: applyStopLoss re-flags and re-executes an exit on an already-completed trade), and the final state ternary prefers TAKE_PROFIT. Conservative fix: check SL first, `else if` TP, or resolve ambiguous bars as losses.
- **(c) Sharpe: √365 over per-trade returns; never stored** — `engine/BackTest.js:229-235`. Annualizing per-trade Sharpe with √365 is wrong unless the strategy trades exactly once per day; use √(trades/year) or daily equity returns. `sharpeRatio` is a local, so `examples/StrategyBenchmark.js:63` (`bt.sharpeRatio`) always prints 0.00.
- **(d) Slippage reported but never applied** — `slippage = 0.0005` is printed in the report (`BackTest.js:263`) but no fill price ever uses it.
- **(e) Incomplete trades silently excluded** — metrics iterate only trades with `exitTimeStamp != null`; SuperTrendFull's 74% WR is on 145/386 trades. Open positions' unrealized PnL should at least be reported.
- **(f) Bollinger crashes the benchmark** — `strategies/Bollinger.js:67` unguarded `args.strategyExtras.lookBack` → TypeError when extras absent. Guard with `args.strategyExtras || {}`.
- **(g) strategyExtras plumbing broken for several strategies** — `strategies/Strategy.js:41` sets `this.custom = args.RSITrend || {}` (leftover; always `{}`), so RSITrend/MarketMaker params are unreachable; SuperTrend/SuperTrendFull read `this.args.period`/`.multiplier` top-level instead of `strategyExtras`. New strategies must read `args.strategyExtras || {}` themselves.
- **(h) Results banner hard-coded** — `BackTest.js:241` prints "PHOENIX BACKTEST RESULTS" for every strategy.
- **(i) Backtest ignores `.requiredCandles()`** — `engine/BitFox.js:1053` hard-codes `requiredCandles: 200` for the DataLoader.
- **(j) Live mode has no engine-side stop-loss** — `engine/BitFox.js` `checkIsLongInProfit`/`checkIsShortInProfit` only check the TP side; `STATE_STOP_LOSS_TRIGGERED` only fires if the *strategy* emits it. Phoenix/SuperTrendFull do; SuperTrend/RSITrend/EmaTrend do **not** → live positions with no stop. (Backtest DOES check SL — live/backtest asymmetry.)
- **(k) DynamicGrid crashes live** — `strategies/DynamicGrid.js:85` references undefined `data` when `isBackTest === false`.
- Minor: drawdown helpers (`calculateLongDrawDown` `BackTest.js:355-371`) compare prices against drawdown accumulators — logic looks wrong; benchmark's `Return%` recomputed from `bt.funds` while banner uses its own math; `applyStrategy` passes eventHandler to constructors that don't accept it (`engine/BitFox.js:850`) so `fireEvent` is a no-op in strategies.

## 5. Recommended path (in order)

1. **GHBF issue: "Realistic backtest fill model"** — fix (a), (b), (d) in `engine/BackTest.js`; smallest change with the biggest credibility payoff. Acceptance: TP fills at target, SL at stop, slippage applied, SL-priority on ambiguous bars; add offline unit tests for `completeTrade`/`handleStateAwaitLongResult` using a synthetic candle fixture (pattern: `test/strategies/strategy-super-trend-test.js`).
2. **GHBF issue: "Honest metrics"** — fix (c), store `sharpeRatio`/metrics on the instance, fix the benchmark table, banner (h), report open positions (e).
3. **Re-run the benchmark suite** (commands in §2) → the *real* ranking. Expect most strategies to collapse toward PF ≈ 1; whatever survives is the actual baseline to beat.
4. **Build the new strategy** (§6) against the fixed engine.
5. Update `BENCHMARKS.md` with honest numbers (it currently front-page-claims Sharpe 8.01).

## 6. Candidate new strategy: **Regime** (regime-adaptive dual-mode)

**Hypothesis:** every current BitFox strategy runs one signal family all the time; none knows whether the market is trending or ranging. A regime filter that *switches* signal families should beat any single-mode strategy on the honest engine — and if it doesn't, the comparison finally means something.

- **Regime detection:** `AdxIndicator` (period 14). ADX ≥ 25 → trending; ADX < 20 → ranging; 20–25 hysteresis band = keep previous regime (prevents flapping).
- **Trending mode:** trade with `SuperTrendIndicator` (period 7, multiplier 3) in the ADX trend direction (+DI vs −DI for side); exit on SuperTrend flip (SuperTrendFull-style reversal exit).
- **Ranging mode:** mean-reversion — long when close ≤ `BollingerIndicator` lower band AND `RsiIndicator`(14) < 30; short when close ≥ upper band AND RSI > 70; exit at Bollinger middle band.
- **Risk (self-managed, Phoenix "approach B"):** ATR(14) stops — SL = entry ∓ 2.0×ATR, emit `STATE_STOP_LOSS_TRIGGERED`; regime flip against position → exit; `minBarsBetweenTrades` cooldown 6.
- **Params** (`args.strategyExtras || {}` with defaults): `adxPeriod:14, adxTrendMin:25, adxRangeMax:20, stPeriod:7, stMultiplier:3, bbPeriod:20, bbStdDev:2, rsiPeriod:14, rsiOversold:30, rsiOverbought:70, atrPeriod:14, stopAtrMult:2.0, minBarsBetweenTrades:6`.
- **States used:** `STATE_PENDING → STATE_ENTER_LONG/SHORT → STATE_AWAIT_TAKE_PROFIT` (tracking internally) → emit `STATE_TAKE_PROFIT` / `STATE_STOP_LOSS_TRIGGERED`; override `setState()` to reset `inPosition` flags on engine resets (copy the pattern from `strategies/Phoenix.js`).
- **Benchmark targets on the FIXED engine:** PF > 1.3, honest annualized Sharpe > 1.0, MaxDD < 20%, and beat buy-and-hold ADAUSDT/BTCUSDT over the same window. (Ignore the AGENTS.md targets of PF>1.5/Sharpe>2 — they were calibrated on the biased engine.)

## 7. Implementation recipe (mechanics)

- File `strategies/Regime.js`, class extends `strategies/Strategy.js`. Contract: `static init(args) → new Regime(args)`; constructor `super(args)`, `this.setContext("Regime")`, read `args.strategyExtras || {}`; `async setup(klineCandles)` calls `this.setIndicator(klineCandles, args, this.indicators.<Class>.className)` per indicator **saving each returned reference** (`setIndicator` overwrites `this.indicator`); `async run(_index=0, isBackTest=false, ticker=null)` returns `this.getStrategyResult(state, custom)`.
- **Indicator ordering rule:** `BackTest.adjustForDelay` (`engine/BackTest.js:276`) aligns candles against the LAST-set indicator's length → initialize the indicator with the FEWEST output rows (longest warm-up) LAST. For this set that's Bollinger(20) or ADX(14) — verify lengths at runtime and order accordingly.
- Current price: `this.kline.o[isBackTest ? _index : this.kline.c.length-1]` via `getApproximateCurrentPrice`; live ticker arrives as `run`'s third arg.
- **Registration checklist (all manual):** ① `require` in `engine/BitFox.js` top (~line 11-31); ② add to `module.exports` (~line 1291-1316); ③ add to `strategyMap` in `trade-live.js:41-47`; ④ optionally `examples/StrategyBenchmark.js:12-22` list; ⑤ example runner `examples/RegimeBacktestExample.js` (copy PhoenixBacktestExample); ⑥ mocha test `test/strategies/strategy-regime-test.js` (offline, fixture `test/resources/ohlcv.json`, pattern: assert indicator non-empty, initial STATE_PENDING, known state transitions at fixture indices, setState round-trip).

## 8. Pitfalls (learned the hard way — don't rediscover)

1. `~/bitfox/<Context>-<date>.json` overwrites per day → copy between runs.
2. `setIndicator` return refs + longest-warm-up-indicator-LAST ordering (§7).
3. Read params from `args.strategyExtras || {}` — nothing else works reliably (§4g).
4. If the strategy self-manages exits, ALSO emit engine-consumable states properly: on `STATE_TAKE_PROFIT`/`STATE_STOP_LOSS_TRIGGERED` the backtest just resets state — the trade record's exit goes through the engine's AWAIT path, so in backtests your internal exit and the engine's TP/SL race; set builder `profitPct`/`stopLossPct` wide (or 0-stop) if the strategy should own exits.
5. Benchmark harness reads `bt.sharpeRatio`/`bt.funds` — until §4c is fixed its Sharpe column is always 0.00.
6. `.env` parsing in `trade-live.js` is hand-rolled; exchange hard-coded to bybit; live TP/SL are `profitPct(1.03)`/`stopLossPct(0.98)` and `strategyExtras` is never set there.
7. Mocha/chai/sinon are in `dependencies` (not devDependencies); Node >= 16.

## 9. Open questions for the build session

1. Fix engine first (recommended, §5) or build Regime against the biased engine and accept meaningless numbers?
2. Same-bar TP+SL resolution policy: SL-first (conservative) vs intra-bar OHLC path heuristic (open→high→low→close for green candles)?
3. Should Regime own its exits entirely (`STATE_CONTEXT_INDEPENDENT`-lite) or cooperate with engine TP/SL as Phoenix does?
4. Keep `SmartAccumulate`/`ZemaCrossOver` headline claims in BENCHMARKS.md during the transition, or add a credibility disclaimer immediately?
5. Do we also want a buy-and-hold baseline column in the benchmark table? (Trivial to add, huge honesty gain.)

---

*Raw artifacts from this session (stdout logs, per-strategy trade JSONs, recompute.js) lived in the session scratchpad; the numbers above are the durable record. Regenerate anytime with the commands in §2.*
