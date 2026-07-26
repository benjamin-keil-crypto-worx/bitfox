# BitFox — Agent Guide

This file helps AI coding agents understand the BitFox codebase. Most AI tools (Claude Code, Cursor, Copilot, Cline, Windsurf) read this automatically.

## Project Overview

Multi-exchange cryptocurrency trading bot library, data analysis toolkit, and strategy backtesting engine in Node.js.

**Stack:** Node.js >= 16, plain JavaScript, CCXT v3, Express, Mocha/Chai/Sinon tests

## Quick Start

```js
let {builder} = require("bitfox").bitfox;
let {Phoenix} = require("bitfox").bitfox;

let engine = builder()
    .exchange("bybit").symbol("ADAUSDT").timeframe("1h")
    .amount(100).profitPct(1.03).stopLossPct(0.98)
    .life(false).build();

await engine.setupAndLoadClient();
engine.applyStrategy(Phoenix);
await engine.run();
```

## Directory Map

| Path | Purpose |
|------|---------|
| `engine/BitFox.js` | Main engine + EngineBuilder (builder pattern, ~1310 lines) |
| `engine/BackTest.js` | Backtesting engine with fee/slippage/Sharpe calculations |
| `service/ExchangeService.js` | CCXT wrapper (public + private API calls) |
| `service/MockService.js` | Paper trading mock (wraps ExchangeService) |
| `lib/states/States.js` | State machine constants |
| `lib/indicators/Indicators.js` | 30+ technical indicators (2151 lines) |
| `lib/events/EventHandler.js` | Event emitter wrapper |
| `lib/utility/util.js` | Utilities (pivot points, math, helpers) |
| `lib/model/Mock.js` | Mock order generation |
| `strategies/*.js` | Each file = one strategy extending Strategy base |
| `alerting/*.js` | Notification channels (Telegram, Slack, Email, Ntfy) |
| `server/` | Express RPC server with trading endpoints |
| `test/` | Mocha/Chai/Sinon tests |
| `examples/` | Usage examples and benchmark scripts |
| `trade-live.js` | Production live trading entry point |

## Architecture: Builder + Strategy + State Machine

### EngineBuilder
```js
builder()
    .exchange("bybit").symbol("ADAUSDT").timeframe("1h")
    .amount(100).profitPct(1.03).stopLossPct(0.98)
    .key(apiKey).secret(apiSecret).life(true)
    .build()
```

### Strategy Interface
Every strategy extends `Strategy.js` and implements 3 methods:

```js
static init(args)           // Factory, returns new instance
async setup(klineCandles)   // Initialize indicators via this.setIndicator()
async run(_index, isBackTest, ticker)  // Return {state, timestamp, custom, context}
```

### State Machine (lib/states/States.js)
```
STATE_PENDING
  ├── STATE_ENTER_LONG ──┐
  └── STATE_ENTER_SHORT ─┤
                         ▼
              STATE_AWAIT_ORDER_FILLED
                         ▼
              STATE_AWAIT_TAKE_PROFIT
                    ↙        ↘
     STATE_TAKE_PROFIT   STATE_STOP_LOSS_TRIGGERED
                    ↘        ↙
                 STATE_PENDING
```

Other states: STATE_AWAIT_CROSS_UP/DOWN, STATE_AWAIT_CONFIRMATION, STATE_TREND_UP/DOWN, STATE_CONTEXT_INDEPENDENT

### Engine Lifecycle
1. Fetch OHLCV + ticker from exchange (CCXT REST, polling via setInterval)
2. Call `strategy.setup(klineCandles)` on first run
3. Call `strategy.run()` → returns state object
4. Fire `onStrategyResponse` event
5. Call `executeStrategyContext(result)` to handle state:
   - ENTER_LONG/SHORT → places market/limit order via exchange
   - AWAIT_ORDER_FILLED → checks if limit order filled
   - AWAIT_TAKE_PROFIT → checks TP/SL conditions
   - TAKE_PROFIT → places exit order, resets to PENDING
   - STOP_LOSS_TRIGGERED → places stop-loss exit order
6. Wait interval → repeat

## Creating a New Strategy

```js
const {Strategy} = require("./Strategy");

class MyStrategy extends Strategy {
    static init(args) { return new MyStrategy(args); }

    constructor(args) {
        super(args);
        this.setContext("MyStrategy");
        const extras = args.strategyExtras || {};
        this.period = extras.period || 14;
    }

    async setup(klineCandles) {
        // IMPORTANT: Save indicator references after each setIndicator() call
        // The LAST indicator set determines backtest array alignment
        this.setIndicator(klineCandles, {period: 14}, this.indicators.RsiIndicator.className);
        this.rsi = this.getIndicator();

        this.setIndicator(klineCandles, {period: 200}, this.indicators.EMAIndicator.className);
        this.ema200 = this.getIndicator();  // longest period LAST

        return this;
    }

    async run(_index=0, isBackTest=false, ticker=null) {
        if ([this.states.STATE_ENTER_LONG, this.states.STATE_ENTER_SHORT].includes(this.state)) {
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }
        if (this.state === this.states.STATE_PENDING) {
            let idx = isBackTest ? _index : this.getIndicator().length - 1;
            let price = this.getApproximateCurrentPrice(isBackTest, _index);
            // ... signal logic ...
            return this.getStrategyResult(this.state, {});
        }
        return this.getStrategyResult(this.state, {});
    }
}
module.exports = {MyStrategy: MyStrategy};
```

**Register** in `engine/BitFox.js`:
1. Add `const {MyStrategy} = require("../strategies/MyStrategy");` at top
2. Add `MyStrategy:MyStrategy,` to the module.exports

## Available Indicators (30+)

Access via `this.indicators.ClassName.className`. Key ones:
- RsiIndicator, AtrIndicator, MacdIndicator, BollingerIndicator
- EMAIndicator (single), Ema4Indicator (8,13,21,55,100,200)
- SuperTrendIndicator, AdxIndicator, StochasticIndicator
- MfiIndicator, CciIndicator, WilliamsRIndicator
- IndicatorUtils (CrossUp, CrossDown, CrossOver)
- PatternRecognitionIndicator (25 candlestick patterns)
- Full list in `lib/indicators/Indicators.js`

## Key Implementation Rules

### IMPORTANT: Multiple Indicators
`setIndicator()` **overwrites** `this.indicator`. Save each reference before calling it again. Set the **longest-period indicator LAST** for backtest array alignment.

```js
// CORRECT
this.setIndicator(klines, {}, this.indicators.RsiIndicator.className);
this.rsi = this.getIndicator();
this.setIndicator(klines, {}, this.indicators.Ema4Indicator.className);
this.ema = this.getIndicator();  // ema200 has longest period = last
```

### Exits - 3 Approaches

**A: Fixed TP/SL** (simplest) — Set `profitPct` and `stopLossPct` in builder. Engine manages all exits.

**B: Strategy-controlled** — Track `this.inPosition`. Return `STATE_TAKE_PROFIT` or `STATE_STOP_LOSS_TRIGGERED` when exit conditions met. Engine executes the exit.

**C: Context-independent** — Return `STATE_CONTEXT_INDEPENDENT`. Strategy manages everything including order placement. Only for advanced use.

## Running Tests

```bash
npm test                    # 57 tests, mocha, ~30s
node examples/PhoenixBacktestExample.js ADAUSDT 1h 1000
node examples/StrategyBenchmark.js ADAUSDT 1h 1000
```

## Backtest Results Interpretation

| Metric | Target | What it measures |
|--------|--------|-----------------|
| Profit Factor | >1.5 | Gross profit / gross loss |
| Sharpe Ratio | >2.0 | Risk-adjusted return (annualized) |
| Max Drawdown | <15% | Largest peak-to-trough loss |
| Win Rate | 30-50% | % of profitable trades (low is OK with high PF) |

**Profit Factor > Win Rate.** A 35% win rate with PF 2.5 beats 60% with PF 1.1.

## Deployment (Pi + PM2)

```bash
./setup-pi.sh                    # installs Node 20, PM2, dependencies
nano .env                        # set API keys, symbol, strategy
pm2 start ecosystem.config.js    # start with auto-restart
pm2 save && pm2 startup          # enable reboot auto-start
```

Edit `.env` to configure:
- `STRATEGY=Phoenix|SuperTrendFull|SuperTrend|RSITrend|EmaTrend`
- `SYMBOL=ADAUSDT`, `TIMEFRAME=1h`, `AMOUNT=50`
- Optional: `NOTIFICATION_TYPE=telegram`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

## Known Bugs / Gotchas

- `DynamicGrid.js` has a crash bug (references undefined `data` variable)
- `MarketMaker.js` uses `STATE_CONTEXT_INDEPENDENT` — won't work with standard backtest
- `strategyExtras()` passes values to `args.strategyExtras`, but some older strategies read from `args` directly (e.g., `args.period` instead of `args.strategyExtras.period`)
- Examples used `require("bifox")` (typo) — now fixed to `require("../index")`
- Backtest engine uses candle close for entry, low/high for exit — slightly optimistic for entries
