let {builder} = require("../index").bitfox;
let {SuperTrend} = require("../strategies/SuperTrend");
let {SuperTrendFull} = require("../strategies/SuperTrendFull");

let symbol = process.argv[2] || "ADAUSDT";
let timeframe = process.argv[3] || "15m";

async function runTest(name, StrategyClass, side) {
    let engine = builder()
        .requiredCandles(500)
        .sidePreference(side)
        .backtest(true)
        .pollRate(100)
        .public(true)
        .exchange("bybit")
        .symbol(symbol)
        .timeframe(timeframe)
        .amount(1000)
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
        return { trades: 0, ret: 0, pf: 0, dd: 0, wins: 0, losses: 0 };
    }
    let completed = bt.tradeHistory.filter(t => t.exitTimeStamp != null).length;
    let wins = bt.tradeSuccessCount || 0;
    let losses = completed - wins;
    let pf = bt.totalQuoteLoss > 0 ? (bt.totalQuoteProfit / bt.totalQuoteLoss) : (bt.totalQuoteProfit > 0 ? 999 : 0);
    let ret = bt.initialFunds > 0 ? ((bt.funds - bt.initialFunds) / bt.initialFunds) * 100 : 0;
    let dd = (bt.maxDrawdownPct || 0) * 100;

    return { trades: completed, ret, pf, dd, wins, losses };
}

(async () => {
    console.log(`\n${symbol} ${timeframe} — Long vs Short breakdown\n`);
    
    for (let [name, cls] of [["SuperTrend", SuperTrend], ["SuperTrendFull", SuperTrendFull]]) {
        console.log(`  ${name}:`);
        let both = await runTest(name, cls, "biDirectional");
        let longs = await runTest(name, cls, "long");
        let shorts = await runTest(name, cls, "short");

        console.log(`    Both: Trades:${String(both.trades).padEnd(5)} Return:${both.ret.toFixed(1).padEnd(8)} PF:${both.pf.toFixed(2).padEnd(8)} MaxDD:${both.dd.toFixed(1)}%`);
        console.log(`    Long: Trades:${String(longs.trades).padEnd(5)} Return:${longs.ret.toFixed(1).padEnd(8)} PF:${longs.pf.toFixed(2).padEnd(8)} MaxDD:${longs.dd.toFixed(1)}%`);
        console.log(`    Short:Trades:${String(shorts.trades).padEnd(5)} Return:${shorts.ret.toFixed(1).padEnd(8)} PF:${shorts.pf.toFixed(2).padEnd(8)} MaxDD:${shorts.dd.toFixed(1)}%`);
        console.log();
    }
    process.exit(0);
})();
