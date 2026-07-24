let {builder} = require("../index").bitfox;
let {Phoenix} = require("../strategies/Phoenix");
let {SuperTrend} = require("../strategies/SuperTrend");
let {RSITrend} = require("../strategies/RSITrend");
let {EmaTrend} = require("../strategies/EmaTrend");
let {Bollinger} = require("../strategies/Bollinger");
let {MfiMacd} = require("../strategies/MfiMacd");
let {SmartAccumulate} = require("../strategies/SmartAccumulate");
let {ZemaCrossOver} = require("../strategies/ZemaCrossOver");
let {ThorsHammer} = require("../strategies/ThorsHammer");

const strategies = [
    { name: "Phoenix", cls: Phoenix },
    { name: "SuperTrend", cls: SuperTrend },
    { name: "RSITrend", cls: RSITrend },
    { name: "EmaTrend", cls: EmaTrend },
    { name: "Bollinger", cls: Bollinger },
    { name: "MfiMacd", cls: MfiMacd },
    { name: "SmartAccumulate", cls: SmartAccumulate },
    { name: "ZemaCrossOver", cls: ZemaCrossOver },
    { name: "ThorsHammer", cls: ThorsHammer },
];

let symbol = process.argv[2] || "ADAUSDT";
let timeframe = process.argv[3] || "1h";
let amount = parseFloat(process.argv[4]) || 1000;

async function runStrategy(strategyName, StrategyClass) {
    try {
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
            .stopLossPct(0.98)
            .life(false)
            .interval(10)
            .build();

        await engine.setupAndLoadClient();
        engine.applyStrategy(StrategyClass);

        let startTime = Date.now();
        await engine.run();
        let elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        let bt = engine.backtestEngine;
        if (!bt || bt.tradeHistory.length === 0) {
            return { name: strategyName, trades: 0, returnPct: 0, winRate: 0, pf: 0, sharpe: 0, maxDD: 0, elapsed, error: null };
        }

        let trades = bt.tradeHistory.filter(t => t.exitTimeStamp != null).length;
        let wins = bt.tradeSuccessCount || 0;
        let losses = bt.tradeLossCount || (trades - wins);
        let winRate = trades > 0 ? (wins / trades) * 100 : 0;
        let pf = bt.totalQuoteLoss > 0 ? (bt.totalQuoteProfit / bt.totalQuoteLoss) : (bt.totalQuoteProfit > 0 ? 999 : 0);
        let sharpe = bt.sharpeRatio || 0;
        let maxDD = bt.maxDrawdownPct || 0;
        let startingFunds = bt.initialFunds || amount;
        let endingFunds = bt.funds || startingFunds;
        let returnPct = startingFunds > 0 ? ((endingFunds - startingFunds) / startingFunds) * 100 : 0;

        return { name: strategyName, trades, returnPct, winRate, pf, sharpe, maxDD: maxDD * 100, elapsed, error: null };
    } catch (err) {
        return { name: strategyName, trades: 0, returnPct: 0, winRate: 0, pf: 0, sharpe: 0, maxDD: 0, elapsed: "0.0", error: err.message };
    }
}

(async () => {
    console.log(`\nBitFox Strategy Benchmark — ${symbol} ${timeframe} | Capital: ${amount} USDT\n`);

    let results = [];
    for (let s of strategies) {
        process.stdout.write(`  Testing ${s.name.padEnd(16)}... `);
        let result = await runStrategy(s.name, s.cls);
        results.push(result);
        console.log(result.error ? `FAIL (${result.error})` : `OK (${result.trades} trades, ${result.elapsed}s)`);
    }

    console.log(`\n${"=".repeat(120)}`);
    console.log(`  ${"Strategy".padEnd(16)} ${"Trades".padEnd(8)} ${"Return%".padEnd(10)} ${"WinRate%".padEnd(10)} ${"PF".padEnd(8)} ${"Sharpe".padEnd(8)} ${"MaxDD%".padEnd(8)} ${"Time"}`);
    console.log(`  ${"-".repeat(108)}`);
    results.sort((a, b) => b.returnPct - a.returnPct);
    for (let r of results) {
        let err = r.error ? `ERR` : "";
        let retStr = r.error ? err : `${r.returnPct.toFixed(1)}%`;
        console.log(`  ${r.name.padEnd(16)} ${String(r.trades).padEnd(8)} ${retStr.padEnd(10)} ${r.error ? "".padEnd(10) : `${r.winRate.toFixed(1)}%`.padEnd(10)} ${r.error ? "".padEnd(8) : r.pf === 999 ? "∞".padEnd(8) : r.pf.toFixed(2).padEnd(8)} ${r.error ? "".padEnd(8) : r.sharpe.toFixed(2).padEnd(8)} ${r.error ? "".padEnd(8) : `${r.maxDD.toFixed(1)}%`.padEnd(8)} ${r.elapsed}s`);
    }
    console.log(`  ${"-".repeat(108)}`);
    console.log();
    process.exit(0);
})();
