---
name: bitfox-architecture
description: Understand the BitFox codebase architecture, design patterns, and how components connect
---

# BitFox Architecture

## Directory Structure

```
bitfox/
├── index.js                 # Entry: exports {bitfox}
├── engine/
│   ├── BitFox.js            # Main engine class + EngineBuilder (builder pattern)
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

### Builder Pattern (EngineBuilder)
Every engine is built via the builder in `BitFox.js`:
```js
let engine = builder()
    .exchange("bybit").symbol("ADAUSDT").timeframe("1h")
    .amount(100).profitPct(1.03).stopLossPct(0.98)
    .life(false).build();
```

### Strategy Pattern
Every strategy extends `Strategy.js` and implements:
- `static init(args)` — factory, returns new instance
- `constructor(args)` — calls `super(args)`, sets context
- `async setup(klineCandles)` — initializes indicators via `this.setIndicator()`
- `async run(_index, isBackTest, ticker)` — returns `{state, timestamp, custom, context}`

### State Machine
Strategies communicate intent via states from `States.js`:
- `STATE_PENDING` → `STATE_ENTER_LONG` / `STATE_ENTER_SHORT` → `STATE_AWAIT_ORDER_FILLED` → `STATE_AWAIT_TAKE_PROFIT` → `STATE_TAKE_PROFIT` / `STATE_STOP_LOSS_TRIGGERED` → `STATE_PENDING`

### Service Layer
- `ExchangeService` wraps CCXT for live trading
- `MockService` wraps ExchangeService for public data + in-memory Mock for orders
- `BitFox extends Service` — the engine IS the service

## Engine Flow (run loop)
1. Fetch OHLCV + ticker from exchange
2. Call `strategy.setup()` (first time only)
3. Call `strategy.run()` → get result state
4. Fire `onStrategyResponse` event
5. If entry state → `executeStrategyContext()` places order via exchange/mock
6. If TP/SL state → engine manages exit via exchange/mock
7. Wait interval → repeat
