let {Phoenix} = require("../strategies/Phoenix");
let {SuperTrend} = require("../strategies/SuperTrend");
let {RSITrend} = require("../strategies/RSITrend");
let {EmaTrend} = require("../strategies/EmaTrend");
let {Bollinger} = require("../strategies/Bollinger");
let {MfiMacd} = require("../strategies/MfiMacd");
let {SmartAccumulate} = require("../strategies/SmartAccumulate");
let {ZemaCrossOver} = require("../strategies/ZemaCrossOver");
let {ThorsHammer} = require("../strategies/ThorsHammer");
let {DonchianTrend} = require("../strategies/DonchianTrend");
let {DataLoaderEngine} = require("../engine/DataLoader");
let {BackTestEngine} = require("../engine/BackTest");

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
    { name: "DonchianTrend", cls: DonchianTrend },
];

let symbol = process.argv[2] || "ADAUSDT";
let timeframe = process.argv[3] || "1h";
let amount = parseFloat(process.argv[4]) || 1000;
// optional: number of 200-candle fetches (default 100 = 20k candles); use less for 1d runs
let pollRate = parseInt(process.argv[5]) || 100;

async function runStrategy(strategyName, StrategyClass, candles) {
    try {
        let args = {
            symbol: symbol,
            timeframe: timeframe,
            amount: amount,
            profitPct: 1.03,
            stopLossPct: 0.98,
            sidePreference: "biDirectional",
            public: true,
            exchangeName: "bybit",
        };

        let strategy = StrategyClass.init(args);
        let bt = BackTestEngine.getBackTester(strategy, args);

        let startTime = Date.now();
        // backTest() consumes the candle buffer, so every strategy gets its own copy
        await bt.backTest(candles.map(c => [...c]));
        let elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (!bt.metrics || bt.tradeHistory.length === 0) {
            return { name: strategyName, trades: 0, returnPct: 0, winRate: 0, pf: 0, sharpe: 0, maxDD: 0, elapsed, error: null };
        }

        let m = bt.metrics;
        return {
            name: strategyName,
            trades: m.completedTrades,
            returnPct: m.totalReturnPct,
            winRate: m.winRate,
            pf: m.profitFactor,
            sharpe: m.sharpeRatio,
            maxDD: m.maxDrawdownPct * 100,
            elapsed,
            error: null
        };
    } catch (err) {
        return { name: strategyName, trades: 0, returnPct: 0, winRate: 0, pf: 0, sharpe: 0, maxDD: 0, elapsed: "0.0", error: err.message };
    }
}

(async () => {
    console.log(`\nBitFox Strategy Benchmark — ${symbol} ${timeframe} | Capital: ${amount} USDT\n`);

    // load historical data ONCE and reuse it for every strategy (9x fewer API calls)
    let dataLoader = DataLoaderEngine.getInstance({
        exchangeName: "bybit",
        symbol: symbol,
        requiredCandles: 200,
        pollRate: pollRate,
        timeframe: timeframe,
        verbose: false
    });
    await dataLoader.setUpClient({
        public: true,
        options: {'defaultType': 'spot', 'adjustForTimeDifference': true, 'recvwindow': 7000}
    });
    process.stdout.write(`  Loading up to ${200 * pollRate} ${timeframe} candles from bybit... `);
    let candles = await dataLoader.load();
    console.log(`done (${candles.length} candles)\n`);

    let results = [];
    for (let s of strategies) {
        process.stdout.write(`  Testing ${s.name.padEnd(16)}... `);
        let result = await runStrategy(s.name, s.cls, candles);
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
        console.log(`  ${r.name.padEnd(16)} ${String(r.trades).padEnd(8)} ${retStr.padEnd(10)} ${r.error ? "".padEnd(10) : `${r.winRate.toFixed(1)}%`.padEnd(10)} ${r.error ? "".padEnd(8) : r.pf === Infinity ? "∞".padEnd(8) : r.pf.toFixed(2).padEnd(8)} ${r.error ? "".padEnd(8) : r.sharpe.toFixed(2).padEnd(8)} ${r.error ? "".padEnd(8) : `${r.maxDD.toFixed(1)}%`.padEnd(8)} ${r.elapsed}s`);
    }
    console.log(`  ${"-".repeat(108)}`);
    console.log();
    process.exit(0);
})();
