---
name: deployment
description: Deploy BitFox on a Raspberry Pi with PM2, Telegram notifications, and security best practices
---

## One-Command Setup

```bash
git clone <repo> bitfox && cd bitfox
chmod +x setup-pi.sh && ./setup-pi.sh
```

Installs Node.js 20, PM2, dependencies.

## Configuration

Edit `.env`:
```ini
BYBIT_API_KEY=xxx
BYBIT_API_SECRET=xxx
SYMBOL=BTCUSDT
TIMEFRAME=1d
STRATEGY=DonchianTrend

# risk sizing — BOTH required or it falls back to fixed AMOUNT
RISK_PCT=0.01
EQUITY=1000
AMOUNT=50
```

`DonchianTrend` is the recommended default: the only strategy with a positive walk-forward OOS
result (pooled PF 1.456 / 334 trades). It needs `TIMEFRAME=1d` and trades ~8-12x per year.
`trade-live.js` gives self-exiting strategies wide engine backstops automatically — see
`SELF_MANAGED_EXITS` there before adding your own.

## Telegram Alerts

Create bot via [@BotFather](https://t.me/BotFather), get chat ID from `https://api.telegram.org/bot<TOKEN>/getUpdates`:
```ini
NOTIFICATION_TYPE=telegram
TELEGRAM_BOT_TOKEN=123:ABC
TELEGRAM_CHAT_ID=123456
```

## PM2 Commands

```bash
pm2 start ecosystem.config.js    # start
pm2 save                          # persist process list
pm2 startup                       # auto-start on boot
pm2 logs bitfox                   # live logs
pm2 monit                         # dashboard
pm2 restart bitfox                # after config change
```

## Go-Live Checklist

1. ✅ Paper trade 1 week (`life: false`)
2. ✅ Start with $10-20
3. ✅ Telegram notifications on
4. ✅ Bybit API: Trade + Read only (never Withdraw)
5. ✅ Monitor daily first month
6. ✅ PM2 auto-restart configured
