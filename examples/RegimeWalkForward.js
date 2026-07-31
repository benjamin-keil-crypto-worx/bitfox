let {Regime} = require("../strategies/Regime");
let {DataLoaderEngine} = require("../engine/DataLoader");
let {BackTestEngine} = require("../engine/BackTest");

/**
 * Walk-forward study for the Regime strategy.
 *
 * Splits history into K contiguous folds. For each fold i >= 1, a small parameter grid
 * is evaluated on the TRAIN window (all data before the fold), the best config by
 * profit factor is selected, and that config is evaluated ONCE on the fold (TEST,
 * out-of-sample). Aggregated OOS results are what matter — in-sample winners are
 * reported only to expose how unstable they are.
 *
 * Usage: node examples/RegimeWalkForward.js ADAUSDT 4h 1000 [pollRate] [folds]
 */
let symbol = process.argv[2] || "ADAUSDT";
let timeframe = process.argv[3] || "4h";
let amount = parseFloat(process.argv[4]) || 1000;
let pollRate = parseInt(process.argv[5]) || 100;
let folds = parseInt(process.argv[6]) || 4;

// deliberately tiny grid: enough to demonstrate the method without deep curve fitting
const GRID = [];
for (const stopAtrMult of [2.0, 3.0]) {
    for (const trailAtrMult of [2.5, 4.0]) {
        for (const adxTrendMin of [25, 30]) {
            GRID.push({stopAtrMult, trailAtrMult, adxTrendMin});
        }
    }
}

async function runOnce(candles, extras) {
    const args = {
        symbol, timeframe, amount,
        profitPct: 10, stopLossPct: 0.90,
        sidePreference: "biDirectional", public: true, exchangeName: "bybit",
        strategyExtras: extras,
    };
    const strategy = Regime.init(args);
    const bt = BackTestEngine.getBackTester(strategy, args);
    const origLog = console.log; console.log = () => {};   // silence per-run reports
    try {
        await bt.backTest(candles.map(c => [...c]));
    } finally {
        console.log = origLog;
    }
    return bt.metrics || {completedTrades: 0, totalReturnPct: 0, profitFactor: 0, winRate: 0};
}

(async () => {
    console.log(`\nRegime Walk-Forward — ${symbol} ${timeframe} | ${folds} folds | grid of ${GRID.length}\n`);

    const loader = DataLoaderEngine.getInstance({
        exchangeName: "bybit", symbol, requiredCandles: 200, pollRate, timeframe, verbose: false
    });
    await loader.setUpClient({public: true, options: {defaultType: 'spot', adjustForTimeDifference: true, recvwindow: 7000}});
    const candles = await loader.load();
    console.log(`Loaded ${candles.length} candles`);

    const foldSize = Math.floor(candles.length / (folds + 1)); // fold 0 is the initial train window
    let oosReturns = [];
    let oosTrades = 0, oosWins = 0, oosGrossW = 0, oosGrossL = 0;

    for (let f = 1; f <= folds; f++) {
        const trainEnd = f * foldSize;
        const testEnd = Math.min((f + 1) * foldSize, candles.length);
        const train = candles.slice(0, trainEnd);
        const test = candles.slice(trainEnd - 400, testEnd); // 400-candle overlap for indicator warm-up

        let best = null;
        for (const cfg of GRID) {
            const m = await runOnce(train, cfg);
            if (m.completedTrades >= 5 && (!best || m.profitFactor > best.m.profitFactor)) best = {cfg, m};
        }
        if (!best) { console.log(`fold ${f}: no config produced >=5 train trades — skipped`); continue; }

        const oos = await runOnce(test, best.cfg);
        oosReturns.push(oos.totalReturnPct);
        oosTrades += oos.completedTrades;
        oosWins += Math.round((oos.winRate / 100) * oos.completedTrades);
        if (Number.isFinite(oos.profitFactor) && oos.profitFactor > 0) {
            // approximate gross win/loss reconstruction for pooled PF
            const l = 1, w = oos.profitFactor;
            oosGrossW += w * Math.abs(oos.totalReturnPct) / (w + l || 1);
            oosGrossL += l * Math.abs(oos.totalReturnPct) / (w + l || 1);
        }
        console.log(`fold ${f}: train-best ${JSON.stringify(best.cfg)} (train PF ${best.m.profitFactor.toFixed(2)})`
            + ` -> OOS: trades=${oos.completedTrades} ret=${oos.totalReturnPct.toFixed(1)}% PF=${Number.isFinite(oos.profitFactor) ? oos.profitFactor.toFixed(2) : '∞'} WR=${oos.winRate.toFixed(1)}%`);
    }

    const totalOos = oosReturns.reduce((a, b) => a + b, 0);
    console.log(`\n=== OOS aggregate: folds=${oosReturns.length} totalReturn=${totalOos.toFixed(1)}% trades=${oosTrades} winRate=${oosTrades > 0 ? ((oosWins / oosTrades) * 100).toFixed(1) : 0}% ===`);
    console.log(`Verdict guidance: positive aggregate OOS return across most folds = worth pursuing; otherwise the edge is not real.`);
    process.exit(0);
})();
