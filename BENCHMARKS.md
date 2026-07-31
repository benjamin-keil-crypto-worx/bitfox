# BitFox Strategy Benchmarks

> **🐳 Docker quick-start:** `docker compose up -d` deploys Phoenix (1h) + SuperTrend (15m) side by side. See [README.md](README.md) for details.

All benchmarks run against **real Bybit historical data** via CCXT. Results include 0.1% taker fees and realistic slippage. Backtest period: ~12-18 months of 1h candles.

---

## Phoenix — Multi-Timeframe Trend + Momentum + ATR Adaptive

The flagship strategy. Combines EMA trend scoring (20/50/100/200), RSI momentum, MACD confirmation, and ATR-based dynamic take-profit/stop-loss with trailing stops.

| Symbol | Return | PF | Sharpe | MaxDD | Trades | Win Rate |
|--------|--------|----|--------|-------|--------|----------|
| ADA/USDT 1h | **+455%** | **3.53** | **8.01** | 3.8% | 669 | 36.9% |
| BTC/USDT 1h | **+72%** | **1.46** | **2.74** | 11.8% | 595 | 30.1% |

Best on mid-to-high volatility assets (ADA, SOL, DOGE). 1h+ timeframes recommended.

---

## SuperTrend — Trend-Following with Fixed TP/SL

Entry timing via SuperTrend indicator, exits managed by fixed 3% TP / 2% SL.

| Symbol | Return | PF | Sharpe | MaxDD | Trades | 
|--------|--------|----|--------|-------|--------|
| ADA/USDT 15m | **+124%** | **1.91** | **6.20** | 11.4% | 248 |
| BTC/USDT 15m | **+33%** | **1.31** | **2.12** | 9.7% | 147 |

Works well on short timeframes (15m). Simpler, more trades.

---

## SuperTrendFull — Trend-Following with Trend-Reversal Exits

Same entry as SuperTrend, but exits when the SuperTrend indicator reverses direction. This gives the trend room to run and dramatically improves risk-adjusted returns.

| Symbol | Side | Return | PF | MaxDD |
|--------|------|--------|----|-------|
| ADA/USDT 15m | **Both** | **+115%** | **6.59** | **3.0%** |
| | Long | +167% | 5.40 | 2.2% |
| | Short | +221% | 9.95 | 1.5% |

**Best risk-adjusted returns in the library.** Profit factor of 6.59 means winners are 6.5x larger than losers. Both long and short sides are independently profitable.

---

## Strategy Guide

| Strategy | Best Timeframe | Best Assets | Style |
|----------|---------------|-------------|-------|
| **Phoenix** | 1h+ | ADA, SOL, DOGE | Multi-indicator, fewer but bigger wins |
| **SuperTrendFull** | 15m-1h | ADA, BTC, ETH | Trend following, excellent risk metrics |
| **SuperTrend** | 15m | Volatile alts | Simple, fast, more trades |
| **RSITrend** | 1h | BTC, ETH | RSI mean reversion |
| **EmaTrend** | 1h-4h | BTC | EMA crossover, slow |
| **MfiMacd** | 1h | ADA, MATIC | MFI + MACD combo |
| **Bollinger** | 15m-1h | Any | Mean reversion, volatile markets |
| **ThorsHammer** | 1h-4h | Any | Candlestick pattern reversal |
| **ZemaCrossOver** | 1h | BTC, ETH | Zero-lag EMA crossover |
| **SmartAccumulate** | 1h | Any | DCA-style accumulation |

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
