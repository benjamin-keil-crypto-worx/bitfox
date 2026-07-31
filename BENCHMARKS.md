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

## What this means

With a ~40% win rate and a fixed +3%/−2% TP/SL, expectancy is ~zero *before* costs — fees and slippage then make every strategy a net loser. **No current BitFox strategy has a demonstrated edge under realistic fills.** The prior "results" came from the simulator, not the signals.

This is the honest starting line. The path forward (see `.claude/context/STRATEGY-RESEARCH.md`):

1. Strategies need real exit logic (ATR-scaled, regime-aware) instead of fixed 3%/2% targets — the engine now rewards it honestly.
2. New strategies should beat this baseline and buy-and-hold, not the old fictional numbers.
3. Treat any strategy result without a stated fill model with suspicion — here and everywhere else.

## Strategy Guide

| Strategy | Style | Honest status (2026-07-31) |
|----------|-------|----------------------------|
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
SYMBOL=ADAUSDT
TIMEFRAME=1h
AMOUNT=50
STRATEGY=Phoenix
```

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

Edit `.env` and change `STRATEGY`:

```ini
STRATEGY=SuperTrendFull   # Best risk-adjusted returns
STRATEGY=Phoenix           # Best absolute returns on 1h+
STRATEGY=SuperTrend        # Simpler, more trades on 15m
```

Then restart: `pm2 restart bitfox`

### Going Live

1. **Paper trade first** — the bot defaults to paper mode when `life` is not explicitly set. Run for at least a week to verify signals match expectations.
2. **Start small** — when going live, use $10-20 per trade.
3. **Monitor daily** — check logs, verify positions, watch for exchange API changes.
4. **Don't overtune** — the strategies are already optimized. Small parameter tweaks won't improve results and may cause overfitting.

### Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `bybit GET ... fetch failed` | Network or API endpoint | Check internet, CCXT version |
| `Invalid API key` | Wrong keys in .env | Regenerate on Bybit, update .env |
| No trades executing | Paper mode, or strategy not finding signals | Check logs, verify symbol exists |
| PM2 not starting on boot | `pm2 startup` not run | Run `pm2 startup` and follow instructions |
| Memory usage high | Old Node version | Use Node 20+, check for memory leaks |
