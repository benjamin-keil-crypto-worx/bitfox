let {DonchianTrend} = require("../strategies/DonchianTrend");
let {DataLoaderEngine} = require("../engine/DataLoader");
let {BackTestEngine} = require("../engine/BackTest");

/**
 * Multi-symbol walk-forward study for the DonchianTrend strategy.
 *
 * Why multi-symbol: a 1d Donchian produces roughly 30-40 trades per symbol over the full
 * history, so a 4-fold split leaves under 10 out-of-sample trades per fold on a single
 * symbol — statistically empty. Pooling the OOS trades of every symbol is the only way to
 * reach the >= 50 OOS trades the ship bar requires. (This is the difference from
 * RegimeWalkForward.js, which is single-symbol.)
 *
 * Method: for each symbol, history is split into K contiguous folds. For fold i >= 1 a small
 * parameter grid is evaluated on the TRAIN window (everything before the fold), the best
 * config by profit factor is selected, and that config is evaluated ONCE on the fold (TEST,
 * out-of-sample). OOS results are then pooled across every symbol and fold. In-sample winners
 * are printed only to expose how unstable they are.
 *
 * Usage: node examples/DonchianWalkForward.js [timeframe] [amount] [pollRate] [folds] [symbols]
 *   e.g. node examples/DonchianWalkForward.js 1d 1000 12 4 SOLUSDT,ADAUSDT,BTCUSDT
 */
let timeframe = process.argv[2] || "1d";
let amount = parseFloat(process.argv[3]) || 1000;
let pollRate = parseInt(process.argv[4]) || 12;
let folds = parseInt(process.argv[5]) || 4;
let symbols = (process.argv[6] || "SOLUSDT,ADAUSDT,DOGEUSDT,BTCUSDT,ETHUSDT,XRPUSDT,LINKUSDT,AVAXUSDT").split(",");

// deliberately tiny grid (8 configs): the ledger caps grids at ~10 — anything larger is curve fitting
const GRID = [];
for (const entryPeriod of [20, 40]) {
    for (const exitPeriod of [10, 20]) {
        for (const stopAtrMult of [3.0, 4.0]) {
            GRID.push({entryPeriod, exitPeriod, stopAtrMult});
        }
    }
}

async function runOnce(symbol, candles, extras) {
    const args = {
        symbol, timeframe, amount,
        // the strategy owns its exits; these are wide disaster backstops only
        profitPct: 10, stopLossPct: 0.90,
        sidePreference: "biDirectional", public: true, exchangeName: "bybit",
        strategyExtras: extras,
    };
    const strategy = DonchianTrend.init(args);
    const bt = BackTestEngine.getBackTester(strategy, args);
    const origLog = console.log; console.log = () => {};   // silence per-run reports
    try {
        await bt.backTest(candles.map(c => [...c]));
    } finally {
        console.log = origLog;
    }
    const m = bt.metrics || {completedTrades: 0, totalReturnPct: 0, profitFactor: 0, winRate: 0, maxDrawdownPct: 0};
    // carry the raw gross totals so profit factor can be pooled across symbols and folds —
    // averaging per-run profit factors would be wrong (a ratio of sums, not a sum of ratios)
    m.grossProfit = bt.totalQuoteProfit || 0;
    m.grossLoss = bt.totalQuoteLoss || 0;
    return m;
}

(async () => {
    console.log(`\nDonchianTrend Walk-Forward — ${symbols.length} symbols @ ${timeframe} | ${folds} folds | grid of ${GRID.length}\n`);

    let oosReturns = [];
    let oosTrades = 0, oosWins = 0;
    let foldTotals = new Array(folds).fill(0);
    let foldTrades = new Array(folds).fill(0);
    let worstDd = 0;
    let bhBeaten = [];
    let pooledGrossProfit = 0, pooledGrossLoss = 0;

    for (const symbol of symbols) {
        const loader = DataLoaderEngine.getInstance({
            exchangeName: "bybit", symbol, requiredCandles: 200, pollRate, timeframe, verbose: false
        });
        await loader.setUpClient({public: true, options: {defaultType: 'spot', adjustForTimeDifference: true, recvwindow: 7000}});
        const candles = await loader.load();

        const foldSize = Math.floor(candles.length / (folds + 1)); // fold 0 is the initial train window
        let symOos = 0, symTrades = 0;

        for (let f = 1; f <= folds; f++) {
            const trainEnd = f * foldSize;
            const testEnd = Math.min((f + 1) * foldSize, candles.length);
            const train = candles.slice(0, trainEnd);
            // 400-candle overlap so the EMA200 warm-up is covered inside the test window
            const test = candles.slice(Math.max(0, trainEnd - 400), testEnd);

            let best = null;
            for (const cfg of GRID) {
                const m = await runOnce(symbol, train, cfg);
                if (m.completedTrades >= 5 && (!best || m.profitFactor > best.m.profitFactor)) best = {cfg, m};
            }
            if (!best) continue;

            const oos = await runOnce(symbol, test, best.cfg);
            oosReturns.push(oos.totalReturnPct);
            oosTrades += oos.completedTrades;
            oosWins += Math.round((oos.winRate / 100) * oos.completedTrades);
            foldTotals[f - 1] += oos.totalReturnPct;
            foldTrades[f - 1] += oos.completedTrades;
            symOos += oos.totalReturnPct;
            symTrades += oos.completedTrades;
            if (oos.maxDrawdownPct > worstDd) worstDd = oos.maxDrawdownPct;
            pooledGrossProfit += oos.grossProfit;
            pooledGrossLoss += oos.grossLoss;

            console.log(`${symbol} fold ${f}: train-best ${JSON.stringify(best.cfg)} (train PF ${best.m.profitFactor.toFixed(2)})`
                + ` -> OOS trades=${oos.completedTrades} ret=${oos.totalReturnPct.toFixed(1)}%`
                + ` PF=${Number.isFinite(oos.profitFactor) ? oos.profitFactor.toFixed(2) : '∞'}`
                + ` DD=${(oos.maxDrawdownPct * 100).toFixed(1)}%`);
        }

        // buy-and-hold over the same out-of-sample span (first test fold start -> end of data)
        const bhStart = candles[Math.min(foldSize, candles.length - 1)][4];
        const bhEnd = candles[candles.length - 1][4];
        const bh = ((bhEnd / bhStart) - 1) * 100;
        const beat = symOos > bh;
        bhBeaten.push({symbol, symOos, bh, beat});
        console.log(`${symbol} TOTAL OOS ${symOos.toFixed(1)}% over ${symTrades} trades | buy&hold ${bh.toFixed(1)}% | ${beat ? 'BEATS B&H' : 'loses to B&H'}\n`);
    }

    const totalOos = oosReturns.reduce((a, b) => a + b, 0);
    const nonNegFolds = foldTotals.filter(v => v >= 0).length;
    const beatCount = bhBeaten.filter(b => b.beat).length;

    console.log(`\n================ POOLED OOS RESULT ================`);
    console.log(`aggregate return : ${totalOos.toFixed(1)}%   (sum of per-symbol per-fold OOS returns)`);
    console.log(`OOS trades       : ${oosTrades}   win rate ${oosTrades > 0 ? ((oosWins / oosTrades) * 100).toFixed(1) : 0}%`);
    console.log(`folds non-negative: ${nonNegFolds} / ${folds}`);
    foldTotals.forEach((v, i) => console.log(`   fold ${i + 1}: ${v.toFixed(1)}% over ${foldTrades[i]} trades`));
    const pooledPf = pooledGrossLoss > 0 ? pooledGrossProfit / pooledGrossLoss : (pooledGrossProfit > 0 ? Infinity : 0);
    console.log(`pooled OOS PF    : ${Number.isFinite(pooledPf) ? pooledPf.toFixed(3) : '∞'}   (gross profit ${pooledGrossProfit.toFixed(2)} / gross loss ${pooledGrossLoss.toFixed(2)})`);
    console.log(`worst fold MaxDD : ${(worstDd * 100).toFixed(1)}%`);
    console.log(`beats buy&hold on: ${beatCount} / ${symbols.length} symbols`);

    console.log(`\n---- ship bar ----`);
    const bar = [
        [`OOS aggregate positive`, totalOos > 0],
        [`>= 3 of 4 folds non-negative`, nonNegFolds >= 3],
        [`>= 50 OOS trades`, oosTrades >= 50],
        [`pooled OOS PF >= 1.2`, pooledPf >= 1.2],
        [`beats buy-and-hold on >= 1 symbol`, beatCount >= 1],
        [`worst-fold MaxDD < 30%`, worstDd < 0.30],
    ];
    bar.forEach(([label, ok]) => console.log(`   [${ok ? 'PASS' : 'FAIL'}] ${label}`));
    const allPass = bar.every(([, ok]) => ok);
    console.log(`\nVERDICT: ${allPass ? 'clears the ship bar' : 'DOES NOT clear the ship bar'} — record the outcome in .claude/context/STRATEGY-LEDGER.md either way.`);
})();
