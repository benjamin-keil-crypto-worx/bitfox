# Strategy Ledger

**The canonical inventory.** Read this INSTEAD of re-benchmarking — these numbers are from the honest engine (realistic fills, aligned indicators). Re-run benchmarks only if `engine/BackTest.js` or an indicator changed since the date on a row. Every research session MUST update this file with its outcome, win or lose.

Method note: all verdicts from 2026-07-31, honest engine (GHBF-26 fills, GHBF-34 alignment), 0.1% taker both legs + 0.05% slippage, biDirectional. 1h/4h ≈ 2.3–3.6y Bybit data, 1d ≈ 4.9y. Commands: `node examples/StrategyBenchmark.js <SYM> <TF> 1000 [pollRate]`, `node examples/RegimeWalkForward.js`.

## Verdicts

| Strategy | Status | Best honest result | Notes (2026-07-31) |
|---|---|---|---|
| DonchianTrend | **borderline — 5/6 ship bar** | Pooled OOS PF **1.456** on **334** trades, +43.7% agg | GHBF-40. Walk-forward, 8 symbols 1d, 1% risk sizing. All 8 symbols positive OOS; beats B&H on 4/8; worst-fold DD 4.3%. **Fails "≥3/4 folds non-negative" (2/4)**: folds 2/3 +23.8%/+29.1%, folds 1/4 −3.4%/−5.8%. Do NOT tune to fix this — the failure is the finding |
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

## THE SIZING FINDING (2026-07-31 screening — read this first)

**The engine cannot size positions by risk, and that alone may explain the blanket failure above.** `engine/BackTest.js` trades a fixed notional (`this.args.amount`, reset to `initialFunds / price` at line 481); no strategy can vary size per trade.

Measured on the Donchian candidate below, same trades, only sizing differs:

| Sizing | Result |
|---|---|
| Fixed notional (what BitFox does today) | median MaxDD **63%**, worst 92%, 3 of 8 symbols end negative |
| 1%-of-equity ATR risk sizing | **+122%**, MaxDD **20.4%** |

PF 1.49 and +3.44%/trade under both. Arithmetic edge is not geometric survival. Any future verdict measured under fixed notional is measuring the sizing model as much as the signal. Addressed by GHBF-40.

## Open leads (ranked — start here, not from scratch)

1. **Phoenix @ 4h on high-vol alts** — the one honest positive from the earlier sweep; needs walk-forward + more symbols before it means anything. Untouched by the 2026-07-31 screening.
2. **DonchianTrend fold-1/fold-4 weakness (GHBF-40 follow-up)** — the strategy shipped at 5/6 ship bar; the open question is *why* folds 1 and 4 are negative while 2 and 3 are strongly positive. Fold 4 is the most recent period, which is the uncomfortable direction for the failure. Worth understanding before raising `riskPct` above the 0.01 default. **This is a diagnosis lead, not a licence to re-tune the parameter grid** — the ledger's 2-iteration cap is spent.

**Sizing note for any future candidate:** the DonchianTrend OOS returns (+43.7% aggregate, 1–4% drawdowns) are at the default `riskPct: 0.01`, i.e. ~1% of equity risked per trade. That is a far lower exposure than buy-and-hold's 100%, so "loses to B&H" rows are not like-for-like on absolute return — compare return per unit of drawdown, or state the exposure difference explicitly. Untouched by the 2026-07-31 screening.

## Rejected approaches (do not retry without new evidence)

- Fixed % TP/SL (3%/2%) with ~40% WR signals — structurally negative after costs, regardless of signal.
- Continuous (level-based) trend entries — chase extended trends into stops; edge-triggered was better but insufficient.
- In-sample parameter tuning — walk-forward showed train winners flip fold to fold; any grid > ~10 configs is curve fitting.
- Any 1h signal from the classic indicator set on ADA/BTC — the 0.2% round-trip hurdle eats it.
- **Mean reversion on high-vol alts** (killed 2026-07-31, was lead #1). Bollinger+RSI band-fade, 5 symbols × 4h/1d, entry/stop/target variants: best pooled cell net **−0.04%/trade, PF 0.99, t = −0.10, n=292**. Gross edge before costs was +0.26%/trade — the signal barely clears zero, let alone the 0.3% round trip. Decisively negative at 1d (PF 0.66).
- **Maker-side / limit-order entries** (killed 2026-07-31, was lead #4). A resting limit at the band fills you *on the way down* and the bar keeps going: gross **−0.41%/trade vs +0.53%** for the same signal entered at the bar close. Adverse selection ≈0.94%/trade dwarfs the ≈0.18%/trade fee saving. Note `makerFee` is dead code anyway — accepted and printed (`BackTest.js:106,287`) but never applied to PnL; both legs always charge `takerFee`.
- **Pullback-in-trend on short horizons** (killed 2026-07-31, novel idea). Buy dips in an established uptrend (EMA50>EMA200), 8 symbols × 4h, triggers RSI<30/35/40/45, EMA20 touch, BB1.0/1.5, 3-down-closes. PF decays monotonically as the trigger loosens and sample grows: **2.07 (n=53) → 1.20 (n=170) → 1.04 (n=427) → 0.97 (n=881) → 0.80 (n=1895)** — a textbook noise curve. Long-only inverted the sign (PF 0.67) while bidirectional was 1.04, another noise signature. Best real-sample cell (BB1.5, n=705) was gross +0.53% = 1.8× the cost hurdle, below the 3× rule, t=1.50.

**Method note for the three kills above:** offline statistical probes (no engine), conservative fills — entry at signal-bar close, exit at bar close, 0.2% taker both legs + 0.1% slippage. Probe scripts were scratchpad-only and not committed; the decay tables above are the reusable result.

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
