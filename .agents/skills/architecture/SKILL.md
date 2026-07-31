---
name: bitfox-architecture
description: Understand the BitFox codebase structure, design patterns, engine lifecycle, and how components connect
---

# BitFox Architecture

## Directory Structure

```
bitfox/
├── index.js                 # Entry: exports {bitfox}
├── engine/
│   ├── BitFox.js            # Main engine + EngineBuilder (builder pattern)
│   ├── BackTest.js          # Backtesting engine with fee/slippage/Sharpe
│   ├── DataLoader.js        # Historical OHLCV fetcher
│   └── ProcessManager.js    # Cron-based scheduling
├── service/
│   ├── ExchangeService.js   # CCXT wrapper (public + private API)
│   └── MockService.js       # Paper trading mock (wraps ExchangeService)
├── strategies/              # Each file = one strategy, extends Strategy base
├── alerting/                # Notification channels (Telegram, Slack, Email, Ntfy)
├── lib/
│   ├── states/States.js     # State constants
│   ├── events/EventHandler.js
│   ├── indicators/Indicators.js  # 30+ technical indicators
│   └── utility/util.js
├── server/                  # Express RPC server
├── examples/                # Usage examples
└── test/                    # Mocha + Chai + Sinon tests
```

## Key Patterns

### Builder Pattern
```js
let engine = builder()
    .exchange("bybit").symbol("ADAUSDT").timeframe("1h")
    .amount(100).profitPct(1.03).stopLossPct(0.98)
    .life(false).build();
```

### Strategy Pattern
Every strategy extends `Strategy.js` and implements:
- `static init(args)` — factory
- `constructor(args)` — calls `super(args)`, sets context
- `async setup(klineCandles)` — initialize indicators
- `async run(_index, isBackTest, ticker)` — return `{state, timestamp, custom, context}`

### State Machine
```
STATE_PENDING → STATE_ENTER_LONG/SHORT → STATE_AWAIT_ORDER_FILLED
→ STATE_AWAIT_TAKE_PROFIT → STATE_TAKE_PROFIT / STATE_STOP_LOSS_TRIGGERED → STATE_PENDING
```

### Engine Flow
1. Fetch OHLCV + ticker from exchange (CCXT REST, polling via setInterval)
2. Call `strategy.setup(klineCandles)` first run only
3. Call `strategy.run()` → returns state
4. Fire `onStrategyResponse` event
5. `executeStrategyContext(result)` places/manages orders
6. Wait interval → repeat

### Service Layer
- `ExchangeService` wraps CCXT for live trading
- `MockService` wraps ExchangeService for public data + in-memory order mock
- `BitFox extends Service` — engine IS the service
