# Strategy Ledger

**The canonical inventory.** Read this INSTEAD of re-benchmarking — these numbers are from the honest engine (realistic fills, aligned indicators). Re-run benchmarks only if `engine/BackTest.js` or an indicator changed since the date on a row. Every research session MUST update this file with its outcome, win or lose.

Method note: all verdicts from 2026-07-31, honest engine (GHBF-26 fills, GHBF-34 alignment), 0.1% taker both legs + 0.05% slippage, biDirectional. 1h/4h ≈ 2.3–3.6y Bybit data, 1d ≈ 4.9y. Commands: `node examples/StrategyBenchmark.js <SYM> <TF> 1000 [pollRate]`, `node examples/RegimeWalkForward.js`.

## Verdicts

| Strategy | Status | Best honest result | Notes (2026-07-31) |
|---|---|---|---|
| Phoenix | **no-go (watch)** | ADA 4h PF 1.05 / +39.7% | Only honest positive; BTC 4h PF 0.78 → doesn't generalize. 1h PF 0.75–0.80 |
| Bollinger | **no-go (watch)** | BTC 1d PF 1.20 / +7.1% (n=14!) | Closest to breakeven at 1h (PF 0.97–0.98); tiny 1d sample |
| Regime | **no-go** | BTC 4h PF 1.07 (vs B&H +272%) | Walk-forward OOS decisively negative (−70% 1h, −201% 4h); train winners unstable |
| SuperTrend | no-go | BTC 4h PF 0.97 | PF 0.75–0.97 everywhere |
| SuperTrendFull | no-go | ADA 15m PF 0.64 | Old headline PF 9.33 was fill-model artifact + 62% dropped trades |
| RSITrend | no-go | — | Signal was impossible pre-GHBF-34 (inverted comparators); now true mean reversion, PF 0.40–0.76 |
| EmaTrend | no-go | — | PF 0.38–0.91 |
| MfiMacd | no-go | ADA 1h PF 0.84 | Least bad at 1h pre-alignment; PF 0.39–0.91 aligned |
| ThorsHammer | no-go | — | PF 0.25–0.87; 1d sample sizes tiny |
| ZemaCrossOver | no-go | — | PF 0.53–0.81, huge churn |
| SmartAccumulate | no-go | — | PF 0.61–0.86, huge churn |
| DynamicGrid | untested | — | Live crash fixed (GHBF-27); never seriously benchmarked |
| MultiDivergence | untested | — | console.log spam in hot loop; never benchmarked |
| MarketMaker | n/a | — | STATE_CONTEXT_INDEPENDENT — incompatible with the backtest engine |
| Buy-and-hold | **benchmark** | ADA window +63% (1h span) | Beat every strategy in every tested window |

## Open leads (ranked — start here, not from scratch)

1. **Mean reversion on high-vol alts** — consistently the closest-to-breakeven sleeve (Bollinger 1h PF 0.97–0.98; Regime range-sleeve ADA PF 0.88). Untested: other alts (SOL, DOGE), volatility-filtered entries, limit-order entries (maker fees halve the cost hurdle).
2. **Phoenix @ 4h on high-vol alts** — the one honest positive; needs walk-forward + more symbols before it means anything.
3. **Longer-horizon trend following (1d+, Donchian-style)** — untested with proper ATR position sizing; daily samples are small, needs multi-symbol pooling.
4. **Maker-side execution** — every verdict above assumes taker fees both legs; limit entries change the cost math materially. Engine support for maker-fee backtests exists (`makerFee` arg) but no strategy uses it.

## Rejected approaches (do not retry without new evidence)

- Fixed % TP/SL (3%/2%) with ~40% WR signals — structurally negative after costs, regardless of signal.
- Continuous (level-based) trend entries — chase extended trends into stops; edge-triggered was better but insufficient.
- In-sample parameter tuning — walk-forward showed train winners flip fold to fold; any grid > ~10 configs is curve fitting.
- Any 1h signal from the classic indicator set on ADA/BTC — the 0.2% round-trip hurdle eats it.

## Ship bar (hard targets — ALL required before a strategy is called good)

1. Walk-forward OOS aggregate return **positive**, with ≥ 3 of 4 folds non-negative
2. Pooled OOS **PF ≥ 1.2** on **≥ 50 OOS trades**
3. **Beats buy-and-hold** on at least one tested symbol/timeframe over the same window
4. MaxDD < 30%; results hold on at least 2 symbols or 2 timeframes (no single-cell wonders)
5. Honest engine only: aligned indicators (`Strategy.valueAt`), realistic fills, costs on

## Hard stops (when to quit — update the ledger and stop)

- **One candidate per session.** Max **2 design iterations** on it (signal-logic changes, not param nudges).
- Parameter grids capped at **~10 configs**, walk-forward only.
- Walk-forward OOS fails → record the verdict here, close the idea, stop. No "one more tweak."
- If the idea can't articulate its cost-hurdle math (expected move per trade vs ~0.2% round-trip) before coding, it doesn't get coded.
