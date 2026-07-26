---
name: backtesting
description: How to run backtests, interpret results, and avoid common pitfalls in BitFox
---

## Running a Backtest

```js
let engine = builder()
    .exchange("bybit").symbol("ADAUSDT").timeframe("1h")
    .backtest(true).pollRate(100).public(true)
    .amount(1000).profitPct(1.03).stopLossPct(0.98)
    .build();
await engine.setupAndLoadClient();
engine.applyStrategy(Phoenix);
await engine.run();
```

## Key Metrics

| Metric | What it means | Target |
|--------|--------------|--------|
| **Profit Factor** | Gross profit / gross loss | >1.5 |
| **Sharpe Ratio** | Risk-adjusted return (annualized) | >2.0 |
| **Max Drawdown** | Largest peak-to-trough loss | <15% |
| **Win Rate** | % of profitable trades | 30-50% |

## Profit Factor > Win Rate

35% win rate with PF 2.5 beats 60% with PF 1.1. Low win rate + high PF means small losses, big wins.

## Common Pitfalls

1. **Look-ahead bias** — entries at close, exits at next candle high/low. Slightly optimistic.
2. **Slippage/fees** — 0.1% taker, 0.05% slippage by default. Adjust for illiquid pairs.
3. **Overfitting** — test on multiple symbols/timeframes. One-trick ponies fail live.
4. **Survivorship bias** — past ≠ future in crypto.

## Quick Commands

```bash
node examples/StrategyBenchmark.js ADAUSDT 1h 1000   # compare all strategies
node examples/PhoenixBacktestExample.js ADAUSDT 1h 1000  # single strategy
node examples/SuperTrendBreakdown.js ADAUSDT 15m 1000  # long/short breakdown
```
