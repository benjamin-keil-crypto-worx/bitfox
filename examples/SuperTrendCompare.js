let {builder} = require("../index").bitfox;
let {SuperTrend} = require("../strategies/SuperTrend");
let {SuperTrendFull} = require("../strategies/SuperTrendFull");

let symbol = process.argv[2] || "ADAUSDT";
let timeframe = process.argv[3] || "15m";
let amount = parseFloat(process.argv[4]) || 1000;

async function runTest(name, StrategyClass) {
    let engine = builder()
        .requiredCandles(500)
        .sidePreference("biDirectional")
        .backtest(true)
        .pollRate(100)
        .public(true)
        .exchange("bybit")
        .symbol(symbol)
        .timeframe(timeframe)
        .amount(amount)
        .profitPct(1.03)
        .strategyExtras({period:10, multiplier:3})
        .stopLossPct(0.98)
        .life(false)
        .interval(10)
        .build();

    await engine.setupAndLoadClient();
    engine.applyStrategy(StrategyClass);
    await engine.run();

    let bt = engine.backtestEngine;
    if (!bt || bt.tradeHistory.length === 0) {
        console.log(`  ${name}: No trades`);
        return null;
    }
    let trades = bt.tradeHistory.filter(t => t.exitTimeStamp != null).length;
    let wins = bt.tradeSuccessCount || 0;
    let pf = bt.totalQuoteLoss > 0 ? (bt.totalQuoteProfit / bt.totalQuoteLoss) : (bt.totalQuoteProfit > 0 ? 999 : 0);
    let ret = bt.initialFunds > 0 ? ((bt.funds - bt.initialFunds) / bt.initialFunds) * 100 : 0;
    let dd = (bt.maxDrawdownPct || 0) * 100;

    console.log(`  ${name.padEnd(16)} Trades:${String(trades).padEnd(5)} Return:${ret.toFixed(1).padEnd(8)} PF:${pf.toFixed(2).padEnd(8)} MaxDD:${dd.toFixed(1)}%`);
    return { trades, ret, pf, dd };
}

(async () => {
    console.log(`\nSuperTrend vs SuperTrendFull — ${symbol} ${timeframe}\n`);
    let r1 = await runTest("SuperTrend", SuperTrend);
    let r2 = await runTest("SuperTrendFull", SuperTrendFull);
    console.log();
    process.exit(0);
})();
