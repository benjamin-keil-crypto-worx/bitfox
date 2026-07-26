---
name: bitfox-backtest
description: How to run backtests, interpret results, and avoid common pitfalls in BitFox
---

# Backtesting in BitFox

## Running a Backtest

```js
let {builder} = require("bitfox").bitfox;
let {Phoenix} = require("bitfox").bitfox;

let engine = builder()
    .requiredCandles(500)        // candles per poll iteration
    .sidePreference("biDirectional")  // "long" | "short" | "biDirectional"
    .backtest(true)
    .pollRate(100)               // number of historical polls
    .public(true)                // no API keys needed for backtest
    .exchange("bybit")
    .symbol("ADAUSDT")
    .timeframe("1h")
    .amount(1000)                // starting capital in quote currency
    .profitPct(1.03)             // take-profit multiplier
    .stopLossPct(0.98)           // stop-loss multiplier
    .strategyExtras({})           // strategy-specific params
    .life(false)
    .build();

await engine.setupAndLoadClient();
engine.applyStrategy(Phoenix);
await engine.run();
```

## Understanding Results

The enhanced backtest engine outputs:

| Metric | What it means | Good |
|--------|--------------|------|
| **Total Return** | PnL as % of starting capital | >20% annual |
| **Profit Factor** | Gross profit / gross loss | >1.5 |
| **Sharpe Ratio** | Risk-adjusted return (annualized) | >2.0 |
| **Max Drawdown** | Largest peak-to-trough decline | <15% |
| **Win Rate** | % of profitable trades | 30-50% is fine |
| **Avg Return/Trade** | Mean return per completed trade | >0.3% |

## Key: Profit Factor over Win Rate

A strategy with 35% win rate and 2.5 PF is BETTER than 60% win rate with 1.1 PF. 
- PF > 2.0 = excellent risk management
- PF 1.5-2.0 = good
- PF < 1.2 = not worth trading (fees will kill it)

## Common Pitfalls

### 1. Look-ahead bias
The backtest uses **previous candle data** for entries and exits. Entries happen at close price, exits at next candle's high/low. This is realistic but slightly optimistic.

### 2. Slippage and fees
Fees are 0.1% taker by default. Slippage is 0.05%. These are conservative estimates for liquid pairs. For illiquid pairs, increase slippage.

### 3. Overfitting
Don't optimize parameters to maximize backtest returns. Test on multiple symbols and timeframes. If it only works on one symbol with one specific setting, it's overfit.

### 4. Survivorship bias
Historical data includes assets that survived. Past performance doesn't guarantee future results, especially in crypto.

## Quick Benchmark

```bash
# Compare all strategies on the same data
node examples/StrategyBenchmark.js ADAUSDT 1h 1000

# Test specific strategy
node examples/PhoenixBacktestExample.js ADAUSDT 1h 1000

# Long/short breakdown
node examples/SuperTrendBreakdown.js ADAUSDT 15m 1000
```
