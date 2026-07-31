---
name: bitfox-deployment
description: How to deploy BitFox on a Raspberry Pi, configure PM2, set up notifications, and go live
---

# Pi Deployment

## One-Command Setup

```bash
git clone <repo> bitfox && cd bitfox
chmod +x setup-pi.sh && ./setup-pi.sh
```

This installs Node.js 20, PM2, and dependencies.

## Configuration

Edit `.env`:
```ini
BYBIT_API_KEY=xxx
BYBIT_API_SECRET=xxx
SYMBOL=ADAUSDT
TIMEFRAME=1h
AMOUNT=50
STRATEGY=Phoenix
```

## Notifications (Telegram)

Get a bot token from [@BotFather](https://t.me/BotFather), find your chat ID via `https://api.telegram.org/bot<TOKEN>/getUpdates`, then add:

```ini
NOTIFICATION_TYPE=telegram
TELEGRAM_BOT_TOKEN=123:ABC
TELEGRAM_CHAT_ID=123456
```

## Starting the Bot

```bash
pm2 start ecosystem.config.js    # start with PM2
pm2 save                          # save process list
pm2 startup                       # enable auto-start on boot
```

## Commands

| Command | Purpose |
|---------|---------|
| `pm2 logs bitfox` | View live logs |
| `pm2 monit` | Dashboard (CPU, memory) |
| `pm2 restart bitfox` | Restart after config change |
| `pm2 stop bitfox` | Stop trading |
| `git pull && npm install && pm2 restart bitfox` | Update bot |

## Going Live Checklist

1. ✅ Paper trade for 1 week (`life: false`)
2. ✅ Start with $10-20
3. ✅ Telegram notifications configured
4. ✅ Bybit API keys: Trade + Read only (never Withdraw)
5. ✅ Monitor daily for first month
6. ✅ PM2 configured with auto-restart
