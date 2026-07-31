---
name: strategy-development
description: How to create, test, and debug BitFox trading strategies — step-by-step with template code
---

## Strategy Lifecycle

1. `static init(args)` — factory, called by `engine.applyStrategy(MyStrategy)`
2. `constructor(args)` — set context, configure params from `args.strategyExtras`
3. `async setup(klineCandles)` — init indicators via `setIndicator()`
4. `async run(_index, isBackTest, ticker)` — called every cycle, return state

## Template

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
        this.setIndicator(klineCandles, {period: 14}, this.indicators.RsiIndicator.className);
        this.rsi = this.getIndicator();
        this.setIndicator(klineCandles, {period: 200}, this.indicators.EMAIndicator.className);
        this.ema200 = this.getIndicator();
        return this;
    }

    async run(_index=0, isBackTest=false, ticker=null) {
        if ([this.states.STATE_ENTER_LONG, this.states.STATE_ENTER_SHORT].includes(this.state)) {
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }
        if (this.state === this.states.STATE_PENDING) {
            let data = this.getIndicator();
            let idx = isBackTest ? _index : data.length - 1;
            let price = this.getApproximateCurrentPrice(isBackTest, _index);
            // signal logic here
            return this.getStrategyResult(this.state, {});
        }
        return this.getStrategyResult(this.state, {});
    }
}
module.exports = {MyStrategy: MyStrategy};
```

## Critical Rules

1. **Set longest-period indicator LAST** — backtest array alignment uses `this.indicator`
2. **Save each indicator ref** — `setIndicator()` overwrites `this.indicator`
3. **Return `getStrategyResult(state, custom)`** — never return raw objects
4. **Use `args.strategyExtras`** for configurable params, not top-level args

## Exits — 3 Approaches

**A: Fixed TP/SL** — Set `profitPct` + `stopLossPct` in builder. Engine manages exits.

**B: Strategy-controlled** — Track `this.inPosition`. Return exit states when conditions met.

**C: Context-independent** — Return `STATE_CONTEXT_INDEPENDENT`. Full control, advanced only.

## Available Indicators

Access via `this.indicators.ClassName.className`:
- RsiIndicator, AtrIndicator, MacdIndicator, BollingerIndicator
- EMAIndicator, Ema4Indicator (8,13,21,55,100,200)
- SuperTrendIndicator, AdxIndicator, StochasticIndicator
- MfiIndicator, CciIndicator, WilliamsRIndicator
- PatternRecognitionIndicator (25 candlestick patterns)
- IndicatorUtils (CrossUp, CrossDown, CrossOver)
