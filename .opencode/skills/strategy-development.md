---
name: bitfox-strategy
description: How to create, test, and debug trading strategies in BitFox
---

# Creating a BitFox Strategy

## Strategy Lifecycle

1. `static init(args)` — factory method, called by `engine.applyStrategy(MyStrategy)`
2. `constructor(args)` — set context name, configure params from `args.strategyExtras`
3. `async setup(klineCandles)` — initialize indicators via `setIndicator()` 
4. `async run(_index, isBackTest, ticker)` — called every cycle, return state

## Template

```js
const {Strategy} = require("./Strategy");

class MyStrategy extends Strategy {
    static init(args) { return new MyStrategy(args); }

    constructor(args) {
        super(args);
        this.setContext("MyStrategy");
        // Read custom params from strategyExtras
        const extras = args.strategyExtras || {};
        this.myParam = extras.myParam || 14;
    }

    async setup(klineCandles) {
        // Initialize indicators. SAVE each reference before the next call.
        // The LAST indicator set determines array alignment in backtests.
        this.setIndicator(klineCandles, {period: 14}, this.indicators.RsiIndicator.className);
        this.rsi = this.getIndicator();  // save before next setIndicator()

        this.setIndicator(klineCandles, {period: 200}, this.indicators.EMAIndicator.className);
        this.ema200 = this.getIndicator();  // longest period LAST

        return this;
    }

    async run(_index=0, isBackTest=false, ticker=null) {
        // 1) Handle entry confirmation (engine places orders)
        if ([this.states.STATE_ENTER_LONG, this.states.STATE_ENTER_SHORT].includes(this.state)) {
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }

        // 2) Handle pending state — check for entry signals
        if (this.state === this.states.STATE_PENDING) {
            let data = this.getIndicator();  // returns last indicator set
            let idx = isBackTest ? _index : data.length - 1;
            let currentPrice = this.getApproximateCurrentPrice(isBackTest, _index);

            // Access saved indicators
            let rsiVal = this.rsi[idx];
            let ema200Val = this.ema200[idx];
            let prevRSI = this.rsi[Math.max(0, idx - 1)];

            // Signal logic
            if (rsiVal > 50 && currentPrice > ema200Val) {
                this.state = this.states.STATE_ENTER_LONG;
                return this.getStrategyResult(this.state, {price: currentPrice});
            }
            if (rsiVal < 50 && currentPrice < ema200Val) {
                this.state = this.states.STATE_ENTER_SHORT;
                return this.getStrategyResult(this.state, {price: currentPrice});
            }
            return this.getStrategyResult(this.state, {});
        }

        // 3) Pass through other states unchanged
        return this.getStrategyResult(this.state, {});
    }
}

module.exports = {MyStrategy: MyStrategy};
```

## Important Rules

1. **Set the longest-period indicator LAST** for backtest array alignment
2. **Save indicator references** after each `setIndicator()` call — it overwrites `this.indicator`
3. **Return `getStrategyResult(state, custom)`** — never return raw objects
4. **Track position internally** using `this.inPosition`, `this.barsSinceEntry` for exit logic
5. **Use `args.strategyExtras`** for configurable params, not top-level args

## Available Indicators (30+)

Accessed via `this.indicators.ClassName.className`:
- RsiIndicator, AtrIndicator, MacdIndicator, BollingerIndicator
- EMAIndicator (single), Ema4Indicator (8,13,21,55,100,200)
- SuperTrendIndicator, AdxIndicator, StochasticIndicator
- MfiIndicator, CciIndicator, WilliamsRIndicator
- PatternRecognitionIndicator (25 candlestick patterns)
- IndicatorUtils (CrossUp, CrossDown, CrossOver, Highest, Lowest)
- And more in `lib/indicators/Indicators.js`

## Exits Management

**Option A: Fixed TP/SL** (simplest)
Set `profitPct` and `stopLossPct` in the builder. Engine manages all exits.

**Option B: Strategy-controlled exits**
Track position in `this.inPosition`. When state is `STATE_AWAIT_TAKE_PROFIT`, check your exit conditions in `run()` and return `STATE_TAKE_PROFIT` or `STATE_STOP_LOSS_TRIGGERED`.

**Option C: Context-independent** (full control)
Return `STATE_CONTEXT_INDEPENDENT`. Strategy manages everything. Use only if you need full control over order placement.

## Testing

```js
// Quick backtest:
let engine = builder()
    .exchange("bybit").symbol("ADAUSDT").timeframe("1h")
    .backtest(true).pollRate(100).public(true)
    .amount(1000).profitPct(1.03).stopLossPct(0.98)
    .strategyExtras({myParam: 14})
    .build();
await engine.setupAndLoadClient();
engine.applyStrategy(MyStrategy);
await engine.run();
```
