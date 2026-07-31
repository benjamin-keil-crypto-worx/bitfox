# BitFox Strategy Benchmarks

> **🐳 Docker quick-start:** `docker compose up -d` deploys Phoenix (1h) + SuperTrend (15m) side by side. See [README.md](README.md) for details.

All benchmarks run against **real Bybit historical data** via CCXT (~2.3 years of 1h candles, ~200 days of 15m candles). Results include 0.1% taker fees on both legs and 0.05% slippage applied to every fill.

## ⚠️ Methodology (updated 2026-07-31)

Earlier versions of this file reported spectacular results (Phoenix +455%, SuperTrendFull PF 6.59, Sharpe 8+). Those numbers were artifacts of an unrealistic fill model: the old backtest engine filled **every** exit — take-profit *and* stop-loss — at the best price of the exit bar, never applied slippage, dropped strategy-managed exits from the accounting, and annualized Sharpe incorrectly. The engine has been fixed (GHBF-26):

- Take-profits fill at the target price, stop-losses at the stop price, gaps at the bar open, signal exits at the bar close
- Stop-loss is evaluated before take-profit; a bar touching both resolves as a loss
- Slippage is applied against the trader on entry and exit
- Strategy-managed exits complete their trades (nothing dropped from metrics)
- Sharpe is annualized by actual trade frequency (√ trades/year); win rate = net PnL > 0

The honest numbers below are the real baseline. They are bad — and that is far more useful than flattering fiction.

Note on Return%: the engine trades a fixed position size (no compounding, no bankruptcy stop), so losses can exceed −100% of starting capital.

---

## Honest results — engine-managed exits (3% TP / 2% SL, biDirectional)

`node examples/StrategyBenchmark.js <SYMbol> 1h 1000` — 2026-07-31, ~20,000 1h candles (≈ 2.3 years).

**ADA/USDT 1h:**

| Strategy | Trades | Return% | WinRate% | PF | Sharpe | 
|----------|--------|---------|----------|-----|--------|
| ThorsHammer | 223 | −57.5% | 43.9% | 0.82 | −0.36 |
| MfiMacd | 493 | −133.7% | 41.6% | 0.84 | −1.20 |
| SuperTrend | 446 | −172.1% | 39.0% | 0.75 | −1.89 |
| Phoenix | 654 | −181.5% | 41.9% | 0.75 | −2.77 |
| RSITrend | 476 | −214.4% | 37.2% | 0.74 | −2.51 |
| EmaTrend | 1000 | −280.1% | 41.8% | 0.83 | −1.68 |
| SmartAccumulate | 1639 | −413.7% | 40.7% | 0.85 | −2.72 |
| ZemaCrossOver | 1665 | −582.6% | 40.1% | 0.80 | −3.01 |

**BTC/USDT 1h:** same picture — every strategy PF 0.58–0.86, negative Sharpe (best: MfiMacd −64.8%, PF 0.86).

**ADA/USDT 15m:** SuperTrend −13.4% (PF 0.93); SuperTrendFull (trend-reversal exits, all trades accounted) −62.8% (PF 0.64, 29.5% win rate).

## Regime (GHBF-32) — regime-adaptive dual-mode, self-managed ATR exits

`node examples/RegimeBacktestExample.js <SYMBOL> 1h 1000` — ADX regime filter switching between edge-triggered SuperTrend trend-following (ATR trailing stops) and Bollinger/RSI mean reversion. All exits strategy-managed; engine TP/SL as wide disaster backstops.

| Symbol (1h) | Trades | Return% | WR% | PF | Sleeve breakdown |
|---|---|---|---|---|---|
| ADA/USDT | 231 | −100.7% | 33.8% | 0.74 | trend-only PF 0.64 · range-only PF 0.88 (−13.5%) |
| BTC/USDT | 257 | −134.4% | 27.2% | 0.57 | trend-only PF 0.68 · range-only PF 0.36 |

Buy-and-hold over the same window: ADA +63%. **Honest verdict: Regime v1 has no edge with default parameters at 1h.** The regime architecture and exit discipline are sound engineering, but the underlying signals (SuperTrend flips, band fades) don't clear ~0.2% round-trip costs on these pairs at this timeframe — consistent with the baseline table above. Follow-up direction: higher timeframes (4h/1d, where average moves dwarf costs) and a disciplined walk-forward parameter study, tracked as a separate issue.

## Higher timeframes & walk-forward study (GHBF-35)

With aligned indicators (GHBF-34), the full sweep across 1h/4h/1d on ADA and BTC:

**4h** (`node examples/StrategyBenchmark.js <SYM> 4h 1000 40`, ~7,960 candles ≈ 3.6 years):

| Strategy | ADA 4h | BTC 4h |
|---|---|---|
| Phoenix | **+39.7% · PF 1.05** | −383.7% · PF 0.78 |
| Bollinger | −2.0% · PF 0.98 | −107.6% · PF 0.66 |
| SuperTrend | −71.2% · PF 0.82 | −22.8% · PF 0.97 |
| everything else | PF 0.45–0.85 | PF 0.70–0.81 |

**1d** (`... 1d 1000 15`, ~1,795 candles ≈ 4.9 years): ADA — everything negative (best Bollinger −4.9% · PF 0.71; ThorsHammer's "+2.7%" is a single trade). BTC — Bollinger +7.1% · PF 1.20 on only **14 trades**; Phoenix −2.2% · PF 0.99; rest negative.

**Regime at 4h/1d**: ADA 4h PF 0.76, BTC 4h **PF 1.07 (+40%)** but vs +272% buy-and-hold; ADA 1d PF 0.29.

**Walk-forward (Regime, `node examples/RegimeWalkForward.js`)** — the decisive test. 4 folds, train-select by PF, evaluate once out-of-sample:

- ADA 1h: OOS aggregate **−69.9%** (all 4 folds negative); a fold with train PF 2.27 delivered OOS PF 0.95
- ADA 4h: OOS aggregate **−201.4%** (3 of 4 folds negative); train-best params flip fold to fold

## DonchianTrend (GHBF-40) — the one strategy with a positive walk-forward result

Everything above is short-horizon oscillator signals, and all of them fail. `DonchianTrend` is a
different family: **daily breakout trend-following** with ATR stops and **risk-based position sizing**.

`node examples/DonchianWalkForward.js 1d 1000 12 4` — 8 symbols (SOL/ADA/DOGE/BTC/ETH/XRP/LINK/AVAX),
4 folds, 8-config grid selected on train windows only, results pooled across symbols:

| Metric | Result | Ship bar |
|---|---|---|
| Pooled OOS profit factor | **1.456** (334 trades) | ≥ 1.2 on ≥ 50 — **pass** |
| Aggregate OOS return | **+43.7%** | positive — **pass** |
| Folds non-negative | **2 of 4** | ≥ 3 of 4 — **FAIL** |
| Worst-fold max drawdown | **4.3%** | < 30% — **pass** |
| Beats buy-and-hold | **4 of 8 symbols** | ≥ 1 — **pass** |
| Win rate | 30.5% | low WR is expected here |

Per-fold: −3.4% / **+23.8%** / **+29.1%** / −5.8%. All 8 symbols are individually positive
out-of-sample (SOL +10.4%, DOGE +7.8%, ETH +7.2%, AVAX +6.1%, ADA +4.7%, BTC +3.0%, LINK +3.0%, XRP +1.5%).

**Read the failure honestly.** Folds 1 and 4 are negative, and fold 4 is the *most recent* period —
the uncomfortable direction for a robustness failure. The edge is also tail-dependent: in screening,
excluding the best 5 of 276 trades dropped the profit factor to 0.96. That concentration is the
genuine signature of trend following, but it means a user can trade this correctly for a year and
still be down while waiting for the few moves that pay.

**Why position sizing is half the story.** Identical trades, only the sizing differs:

| Sizing | Median max drawdown | Symbols ending negative |
|---|---|---|
| Fixed notional (what every older strategy uses) | **63%** | 3 of 8 |
| 1% equity risk per trade | **20.4%** | 0 of 8 |

Profit factor is 1.49 either way. A fixed size risks a wildly different fraction of equity on a
tight stop than a wide one, and the wide-stop trades are what create the deep drawdowns. This is a
plausible partial explanation for why every other strategy in this file failed — they were all
measured under a sizing model that turns a positive per-trade edge into a wrecked equity curve.

> The OOS returns above are at `riskPct: 0.01` — about 1% of equity risked per trade, hence the
> 1–4% drawdowns. That is far less exposure than buy-and-hold's 100%, so the symbols where it
> "loses" to buy-and-hold are **not** a like-for-like comparison of absolute return.

### Go / no-go verdicts

| Candidate | Verdict | Why |
|---|---|---|
| **DonchianTrend @ 1d** | **Borderline — the best available** | Pooled OOS PF 1.456 on 334 trades, positive on all 8 symbols; fails only the ≥3/4-folds robustness check |
| Any strategy @ 1h | **No-go** | All PF < 1 on both symbols, aligned data |
| Phoenix @ ADA 4h | **No-go (watch)** | PF 1.05 is within noise; PF 0.78 on BTC 4h shows it doesn't generalize |
| Bollinger @ BTC 1d | **No-go (watch)** | PF 1.20 but n=14 trades — no statistical power |
| Regime (any TF) | **No-go** | Walk-forward OOS decisively negative; train winners don't persist |
| Buy-and-hold | Benchmark | Beat every strategy except DonchianTrend in every tested window |

**Bottom line:** under honest fills, none of the *classic oscillator* signals in this library shows an
edge over costs at any tested timeframe. One strategy — `DonchianTrend`, daily breakout trend-following
with risk sizing — does clear five of the six ship-bar criteria out-of-sample, and it is the only one
worth running. BitFox's core value is still the **engine, tooling, and honest testing framework**; treat
every other bundled strategy as a reference implementation, not an income source. Any future strategy
claim must clear: aligned indicators, honest fills, walk-forward OOS, and a buy-and-hold comparison.

## What this means

With a ~40% win rate and a fixed +3%/−2% TP/SL, expectancy is ~zero *before* costs — fees and slippage then make every such strategy a net loser. The prior "results" came from the simulator, not the signals.

What actually changed the picture (see `.claude/context/STRATEGY-LEDGER.md`):

1. Strategies need real exit logic (ATR-scaled, regime-aware) instead of fixed 3%/2% targets — the engine now rewards it honestly.
2. **Position sizing is not a detail.** A positive per-trade edge still produces a 63% drawdown under fixed notional. Risk-based sizing is what makes an edge survivable.
3. The winning horizon was longer and the trade count lower than anyone was looking for — daily breakouts, ~8-12 trades per symbol per year, not 1h oscillators.
4. Treat any strategy result without a stated fill model with suspicion — here and everywhere else.

## Strategy Guide

| Strategy | Style | Honest status (2026-07-31) |
|----------|-------|----------------------------|
| **DonchianTrend** | Daily breakout trend following, ATR stop + channel exit, risk-sized | **The only one with a positive walk-forward OOS result** — pooled PF 1.456 on 334 trades. Fails the ≥3/4-folds robustness check. Needs `TIMEFRAME=1d` and patience |
| **Phoenix** | Multi-indicator trend scoring, ATR exits | No edge under realistic fills (PF 0.58–0.75) |
| **SuperTrendFull** | Trend following, reversal exits | No edge; previous headline numbers were fill-model artifacts |
| **SuperTrend** | Trend following, fixed TP/SL | Closest to breakeven on 15m (PF 0.93) |
| **RSITrend** | RSI mean reversion | No edge |
| **EmaTrend** | EMA crossover | No edge |
| **MfiMacd** | MFI + MACD combo | Least bad on 1h (PF 0.84–0.86) |
| **Bollinger** | Squeeze mean reversion | Crashes without strategyExtras (fix tracked in GHBF-27) |
| **ThorsHammer** | Candlestick pattern reversal | No edge |
| **ZemaCrossOver** | Zero-lag EMA crossover | No edge |
| **SmartAccumulate** | Pivot-based accumulation | No edge |

---

## Pi Deployment Tutorial

### What You'll Need

- Raspberry Pi 3B+ or 4 (any model works, this is lightweight)
- Bybit account with API keys
- (Optional) Telegram bot for trade notifications

### Step 1: Prepare the Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Verify
node --version   # Should be v20.x
npm --version
```

### Step 2: Get the Bot

```bash
git clone <your-repo-url> bitfox
cd bitfox

# Install dependencies
npm install

# Install PM2 process manager
sudo npm install -g pm2
```

### Step 3: Configure API Keys

```bash
# Create your .env file
cp .env.example .env

# Edit with your keys
nano .env
```

Fill in at minimum:
```ini
BYBIT_API_KEY=your_key_here
BYBIT_API_SECRET=your_secret_here

SYMBOL=BTCUSDT
TIMEFRAME=1d
STRATEGY=DonchianTrend

# risk-based sizing — BOTH are required, or the bot falls back to fixed AMOUNT
RISK_PCT=0.01      # risk 1% of equity per trade
EQUITY=1000        # your account size in USDT
AMOUNT=50          # fallback fixed size
```

`DonchianTrend` is the recommended default and the only strategy with a positive walk-forward
out-of-sample result. Two things to understand before you start it:

- **It trades daily and rarely.** Expect roughly 8–12 trades per symbol per year and a ~30% win
  rate. Long quiet stretches are normal behaviour, not a broken bot. Do not switch it to 1h — the
  edge does not exist there, and that is measured, not assumed.
- **It is not a sure thing.** It fails one of the six ship-bar criteria (two of four walk-forward
  folds are negative, including the most recent one), and most of its return comes from a handful
  of large winners. Read the DonchianTrend section above in full.

> **Security**: Bybit API keys should only have Trade and Read permissions. Never enable Withdraw.

### Step 4: Configure Notifications (Telegram)

1. Create a Telegram bot via [@BotFather](https://t.me/BotFather) — send `/newbot` and follow prompts
2. Get your bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
3. Find your chat ID — send a message to your bot, then visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Add to `.env`:

```ini
NOTIFICATION_TYPE=telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=123456789
```

### Step 5: Run the Bot

```bash
# Test run (paper trade mode first!)
node trade-live.js

# If that works, start with PM2 (auto-restart on crash/reboot)
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Follow the instructions it gives you
```

### Managing the Bot

```bash
pm2 logs bitfox        # Watch live logs
pm2 monit              # Dashboard (CPU, memory, uptime)
pm2 restart bitfox     # Restart after config change
pm2 stop bitfox        # Stop trading
pm2 delete bitfox      # Remove from PM2

# To update the bot:
git pull
npm install
pm2 restart bitfox
```

### Switching Strategies

Edit `.env` and change `STRATEGY`, then restart with `pm2 restart bitfox`:

```ini
STRATEGY=DonchianTrend   # Recommended. Daily trend following. The only positive OOS result
STRATEGY=Regime          # Reference implementation — walk-forward OOS was negative
STRATEGY=Phoenix         # Reference implementation — no edge under honest fills
STRATEGY=SuperTrend      # Reference implementation — no edge under honest fills
```

Only the first is worth running with money. The others are kept as working examples of the strategy
contract; their honest numbers are in the table above, and none of them clears costs.

**Match the timeframe to the strategy.** `DonchianTrend` needs `TIMEFRAME=1d`. Running it on 1h does
not make it trade more profitably, it makes it lose — every 1h signal in this library fails the cost
hurdle, which is a measured result rather than an opinion.

`trade-live.js` automatically gives strategies that manage their own exits (`DonchianTrend`, `Regime`,
`Phoenix`, `SuperTrendFull`) wide engine backstops instead of the 3%/2% take-profit and stop-loss. If
you add your own self-exiting strategy, add it to `SELF_MANAGED_EXITS` in `trade-live.js` or the engine
will close your positions before your own exit logic ever runs.

### Going Live

1. **Paper trade first** — the bot defaults to paper mode when `life` is not explicitly set. On a daily
   strategy, "a week" is only one or two trades; run it long enough to see several signals before
   trusting it.
2. **Start small** — when going live, use $10-20 per trade, or set `RISK_PCT` low (0.005 = 0.5%).
3. **Monitor** — check logs, verify positions, watch for exchange API changes.
4. **Don't tune the parameters.** This is not because they are already optimal — it is because
   walk-forward testing showed that parameter sets which win on training data flip to losers on the
   next fold. Tweaking numbers until a backtest looks good is the single most reliable way to build a
   strategy that loses money live.
5. **Expect drawdown.** Even the recommended configuration has losing folds, and its return is carried
   by a few large winners. Never allocate money you need.

### Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `bybit GET ... fetch failed` | Network or API endpoint | Check internet, CCXT version |
| `Invalid API key` | Wrong keys in .env | Regenerate on Bybit, update .env |
| No trades executing | Paper mode, or strategy not finding signals | Check logs, verify symbol exists |
| PM2 not starting on boot | `pm2 startup` not run | Run `pm2 startup` and follow instructions |
| Memory usage high | Old Node version | Use Node 20+, check for memory leaks |
