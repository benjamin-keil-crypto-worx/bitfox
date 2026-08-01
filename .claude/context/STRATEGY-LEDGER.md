# Strategy Ledger

**The canonical inventory.** These numbers are from the honest engine (realistic fills, aligned indicators). Every research session MUST update this file with its outcome, win or lose — **including the coverage matrix below.**

> ## ⚠️ Read the coverage matrix before trusting any verdict
>
> **A verdict applies ONLY to the cells in the coverage matrix.** This file is silent about every symbol × timeframe it has not measured, and silence is not a negative result.
>
> This is not hypothetical. On 2026-08-01 a session read "no strategy shows a robust edge", concluded that fast timeframes were dead, and specced an entirely different project — without ever running a 15m sweep. The sweep took 30 seconds and found **Bollinger BTC 15m at PF 1.33**. The 2026-07-31 sweep had only ever covered 1h/4h/1d.
>
> If the cell you care about is not in the matrix, **run it before forming an opinion**:
> `node examples/StrategyBenchmark.js <SYM> <TF> 1000 <pollRate>`

Method note: verdicts dated 2026-07-31 use the honest engine (GHBF-26 fills, GHBF-34 alignment), 0.1% taker both legs + 0.05% slippage, biDirectional, `profitPct 1.03 / stopLossPct 0.98`. 1h/4h ≈ 2.3–3.6y Bybit data, 1d ≈ 4.9y. Commands: `node examples/StrategyBenchmark.js <SYM> <TF> 1000 [pollRate]`, `node examples/RegimeWalkForward.js`.

## Coverage matrix — what has actually been measured

All 10 registered strategies were run in each ✅ cell. **Blank = never measured, NOT a negative result.**

| Timeframe | BTC | ADA | SOL | ETH | XRP | Other |
|---|---|---|---|---|---|---|
| 1d | ✅ 07-31 | ✅ 07-31 | ✅ 07-31 | ✅ 07-31 | ✅ 07-31 | 8 symbols, DonchianTrend walk-forward |
| 4h | ✅ 07-31 | ✅ 07-31 | — | — | — | |
| 1h | ✅ 07-31 | ✅ 07-31 | — | — | — | |
| **15m** | **✅ 08-01** | **✅ 08-01** | **✅ 08-01** | — untested | — untested | + full TP/SL grid on BTC/ADA/SOL |
| **5m** | **✅ 08-01** | **✅ 08-01** | **✅ 08-01** | — untested | — untested | + full TP/SL grid on BTC/ADA/SOL |

**15m/5m note:** covered by two runs — the standard 3%/2% sweep and the 7-config TP/SL grid (both 2026-08-01, ~312 days at 15m / ~104 days at 5m). ETH/XRP remain unmeasured at both, so Bollinger's generalization beyond BTC/ADA/SOL is still open.

**Separate from the engine runs:** the 2026-08-01 *offline probes* measured fixed-horizon forward returns (1–48 bars) on raw price. That is a different question from a signal-driven strategy on 5m/15m indicator data — do not cite those probes as a strategy verdict for these cells.

### 15m sweep (2026-08-01, ~312 days, 30k candles, standard config)

| Strategy | BTC PF | BTC Return | ADA PF | ADA Return |
|---|---|---|---|---|
| **Bollinger** | **1.33** (n=113, Sharpe 1.72, DD 15.4%) | **+29.6%** | 0.71 | −28.6% |
| ThorsHammer | 0.75 | −52.7% | 0.98 | −2.7% |
| SuperTrend | 0.68 | −74.6% | 0.90 | −23.9% |
| MfiMacd | 0.86 | −24.0% | 0.77 | −51.1% |
| SmartAccumulate | 0.79 | −55.0% | 0.84 | −63.3% |
| RSITrend | 0.78 | −45.9% | 0.74 | −67.1% |
| ZemaCrossOver | 0.74 | −73.6% | 0.75 | −107.0% |
| EmaTrend | 0.63 | −75.7% | 0.66 | −94.1% |
| DonchianTrend | 0.57 | −85.4% | 0.71 | −70.6% |
| Phoenix | 0.54 | −158.9% | 0.73 | −87.5% |

### Profit-target sweep (2026-08-01) — small/fast targets are dead

Question: do the strategies work at low timeframes with **small, fast profit targets** (scalping) instead of the standard 3%/2%? Swept 9 strategies × 7 TP/SL configs × 6 cells (BTC/ADA/SOL at 5m and 15m), ~378 backtests.

| TP/SL config | Combos with PF > 1.2 |
|---|---|
| 0.3/0.3, 0.5/0.5, 0.5/1.0, 1.0/0.5, 1.0/1.0 | **0** |
| 2.0/1.0 | 0 (best was Bollinger PF **1.00**, exactly breakeven) |
| 3.0/2.0 (control) | 3 — see below |

**Every profitable combo in the entire sweep used the 3%/2% control.** Zero small-target combos cleared PF 1.2.

**Why:** at a 0.25% round trip, a 0.5% TP / 0.5% SL needs a **>75% win rate** to break even (`w·0.5 − (1−w)·0.5 − 0.25 > 0`). These signals produce 35–53%. A 25-point win-rate gap is not closable by strategy selection.

**The conclusion that matters: low timeframe ≠ small target.** The timeframe controls signal frequency; the profit target must stay large enough to clear costs. Trading 15m candles with ~3% targets is viable; taking 0.3–1% profits is not, on any strategy, symbol, or timeframe measured.

The three profitable control cells: **Bollinger BTC 15m PF 1.33** (n=113, +29.6%, WR 53.1%), **Bollinger SOL 5m PF 1.33** (n=58, +19.1%, WR 53.4%), **MfiMacd BTC 5m PF 1.22** (n=62, +13.5%). Bollinger now shows positive on **2 symbols × 2 timeframes**, which satisfies ship-bar criterion 4 — but all of it is in-sample and unvalidated.

Bollinger BTC 15m is **in-sample and single-cell** — a lead, not a verdict. It fails ship-bar criterion 4 (2+ symbols/timeframes) on ADA so far. Note Bollinger is also the least-bad 1h cell and positive at BTC 1d (PF 1.20, n=14), so a BTC-specific mean-reversion story is at least coherent. DonchianTrend at 15m is catastrophic, which is expected — it is a 1d strategy.

## Verdicts

**Every status below is scoped to the coverage matrix.** Unless a row says otherwise, "no-go" means *no-go at 1h/4h/1d on BTC/ADA* — it says nothing about 15m, 5m, or untested symbols. Never quote a status without its scope.

| Strategy | Status | Best honest result | Notes (2026-07-31) |
|---|---|---|---|
| DonchianTrend | **borderline — 5/6 ship bar** | Pooled OOS PF **1.456** on **334** trades, +43.7% agg | GHBF-40. Walk-forward, 8 symbols 1d, 1% risk sizing. All 8 symbols positive OOS; beats B&H on 4/8; worst-fold DD 4.3%. **Fails "≥3/4 folds non-negative" (2/4)**: folds 2/3 +23.8%/+29.1%, folds 1/4 −3.4%/−5.8%. Do NOT tune to fix this — the failure is the finding |
| Phoenix | **no-go (watch)** | ADA 4h PF 1.05 / +39.7% | Only honest positive; BTC 4h PF 0.78 → doesn't generalize. 1h PF 0.75–0.80 |
| Bollinger | **LEAD — best open candidate** | **BTC 15m PF 1.33 / +29.6%, n=113, Sharpe 1.72, DD 15.4%** (2026-08-01) | Was "no-go (watch)" when only 1h/4h/1d were measured. 15m changes the picture: BTC 15m is the strongest in-sample cell in the whole ledger. But ADA 15m is PF 0.71 → **single-cell, in-sample, unvalidated**. Needs walk-forward + generalization sweep before it means anything. Also least-bad at 1h (PF 0.97–0.98) and BTC 1d PF 1.20 (n=14) |
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

1. **Bollinger @ 15m (NEW, 2026-08-01) — the strongest open lead.** BTC 15m PF 1.33 / +29.6% / n=113 / Sharpe 1.72 / MaxDD 15.4% in-sample. Next steps in order, and **do not skip step 1**: (a) generalization sweep — run 15m on SOL/ETH/XRP and more symbols to see whether ADA's PF 0.71 or BTC's 1.33 is the outlier; (b) if it survives, walk-forward OOS per the ship bar; (c) only then consider it a candidate. **This is a measurement lead, not a tuning lead** — do not touch Bollinger's parameters. If it only works on BTC 15m, it is a single-cell wonder and dies under ship-bar criterion 4.

2. **The 15m/5m coverage hole generally.** The 15m sweep exists only for BTC/ADA; 5m has never been run through the engine at all. Cheap to close, and the one time it was closed it immediately produced the lead above. Closing coverage is not "re-benchmarking."

3. **Phoenix @ 4h on high-vol alts** — the one honest positive from the earlier sweep; needs walk-forward + more symbols before it means anything. Untouched by the 2026-07-31 screening.
4. **DonchianTrend fold-1/fold-4 weakness (GHBF-40 follow-up)** — the strategy shipped at 5/6 ship bar; the open question is *why* folds 1 and 4 are negative while 2 and 3 are strongly positive. Fold 4 is the most recent period, which is the uncomfortable direction for the failure. Worth understanding before raising `riskPct` above the 0.01 default. **This is a diagnosis lead, not a licence to re-tune the parameter grid** — the ledger's 2-iteration cap is spent.

**Sizing note for any future candidate:** the DonchianTrend OOS returns (+43.7% aggregate, 1–4% drawdowns) are at the default `riskPct: 0.01`, i.e. ~1% of equity risked per trade. That is a far lower exposure than buy-and-hold's 100%, so "loses to B&H" rows are not like-for-like on absolute return — compare return per unit of drawdown, or state the exposure difference explicitly. Untouched by the 2026-07-31 screening.

## Rejected approaches (do not retry without new evidence)

- Fixed % TP/SL (3%/2%) with ~40% WR signals — structurally negative after costs, regardless of signal.
- Continuous (level-based) trend entries — chase extended trends into stops; edge-triggered was better but insufficient.
- In-sample parameter tuning — walk-forward showed train winners flip fold to fold; any grid > ~10 configs is curve fitting.
- Any 1h signal from the classic indicator set on ADA/BTC — the 0.2% round-trip hurdle eats it.
- **Mean reversion on high-vol alts** (killed 2026-07-31, was lead #1). Bollinger+RSI band-fade, 5 symbols × 4h/1d, entry/stop/target variants: best pooled cell net **−0.04%/trade, PF 0.99, t = −0.10, n=292**. Gross edge before costs was +0.26%/trade — the signal barely clears zero, let alone the 0.3% round trip. Decisively negative at 1d (PF 0.66).
- **Maker-side / limit-order entries** (killed 2026-07-31, was lead #4). A resting limit at the band fills you *on the way down* and the bar keeps going: gross **−0.41%/trade vs +0.53%** for the same signal entered at the bar close. Adverse selection ≈0.94%/trade dwarfs the ≈0.18%/trade fee saving. Note `makerFee` is dead code anyway — accepted and printed (`BackTest.js:106,287`) but never applied to PnL; both legs always charge `takerFee`.
- **Pullback-in-trend on short horizons** (killed 2026-07-31, novel idea). Buy dips in an established uptrend (EMA50>EMA200), 8 symbols × 4h, triggers RSI<30/35/40/45, EMA20 touch, BB1.0/1.5, 3-down-closes. PF decays monotonically as the trigger loosens and sample grows: **2.07 (n=53) → 1.20 (n=170) → 1.04 (n=427) → 0.97 (n=881) → 0.80 (n=1895)** — a textbook noise curve. Long-only inverted the sign (PF 0.67) while bidirectional was 1.04, another noise signature. Best real-sample cell (BB1.5, n=705) was gross +0.53% = 1.8× the cost hurdle, below the 3× rule, t=1.50.

- **Fixed-horizon micro-holds on 5m/15m** (probed 2026-08-01). Three ideas, all far below the 3× cost gate: volatility-expansion/liquidation-cascade continuation (best cell BTC k=3/H=12, gross 0.191% vs 0.30% cost = 0.64×, t=1.28, n=175 — and the sign **flips** to −0.230% on SOL); volatility-gated momentum (best bucket was lowest-vol on BTC, mid on SOL, highest on ADA — no consistent story); intraday seasonality (14:00–15:00 UTC positive on BTC/ADA/SOL, but as independent daily trades every window is net negative, t < 2, and the effect decays or flips in the second half of the sample).
  **SCOPE — read this before citing it:** these probes tested **fixed-horizon** exits (3/6/12 bar holds) on raw price, *not* signal-driven strategies using 5m/15m indicator data. They do **not** constitute a 15m or 5m strategy verdict — the 15m engine sweep run the same day found Bollinger BTC at PF 1.33. A probe of fixed-horizon forward returns and a benchmark of a signal-driven strategy are different questions.
  **Methodological caveat worth keeping:** the initial hourly seasonality scan showed t up to 4.03 using *overlapping* 6-bar windows, which are not independent observations and inflate t by roughly √H. Measured as independent daily trades the significance vanished. Any future probe must use non-overlapping samples.

**Method note for the three kills above:** offline statistical probes (no engine), conservative fills — entry at signal-bar close, exit at bar close, 0.2% taker both legs + 0.1% slippage. Probe scripts were scratchpad-only and not committed; the decay tables above are the reusable result.

## Ship bar (hard targets — ALL required before a strategy is called good)

1. Walk-forward OOS aggregate return **positive**, with ≥ 3 of 4 folds non-negative
2. Pooled OOS **PF ≥ 1.2** on **≥ 50 OOS trades**
3. **Beats buy-and-hold** on at least one tested symbol/timeframe over the same window
4. MaxDD < 30%; results hold on at least 2 symbols or 2 timeframes (no single-cell wonders)
5. Honest engine only: aligned indicators (`Strategy.valueAt`), realistic fills, costs on

## Hard stops (when to quit — update the ledger and stop)

- **These caps bound DESIGN, not MEASUREMENT.** Running the benchmark on an untested symbol/timeframe cell is free, always allowed, and always worth it — it does not count against any budget. Changing signal logic because the last version lost is a design iteration and does count. Confusing the two is what produced the 2026-08-01 miss described at the top of this file.
- **One candidate per session.** Max **2 design iterations** on it (signal-logic changes, not param nudges).
- Parameter grids capped at **~10 configs**, walk-forward only.
- Walk-forward OOS fails → record the verdict here, close the idea, stop. No "one more tweak."
- If the idea can't articulate its cost-hurdle math (expected move per trade vs ~0.2% round-trip) before coding, it doesn't get coded.
