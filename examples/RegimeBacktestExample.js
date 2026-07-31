let {Regime} = require("../strategies/Regime");
let {DataLoaderEngine} = require("../engine/DataLoader");
let {BackTestEngine} = require("../engine/BackTest");

// Usage: node examples/RegimeBacktestExample.js ADAUSDT 1h 1000
let symbol = process.argv[2] || "ADAUSDT";
let timeframe = process.argv[3] || "1h";
let amount = parseFloat(process.argv[4]) || 1000;
// optional: number of 200-candle fetches (default 100 = 20k candles); use less for 1d runs
let pollRate = parseInt(process.argv[5]) || 100;

(async () => {
    console.log(`\nRegime Backtest — ${symbol} ${timeframe} | Capital: ${amount} USDT\n`);

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
    let candles = await dataLoader.load();
    console.log(`Loaded ${candles.length} candles\n`);

    let args = {
        symbol: symbol,
        timeframe: timeframe,
        amount: amount,
        // Regime manages its own exits; these are wide disaster backstops only
        profitPct: 10,
        stopLossPct: 0.90,
        sidePreference: "biDirectional",
        public: true,
        exchangeName: "bybit",
    };

    let strategy = Regime.init(args);
    let bt = BackTestEngine.getBackTester(strategy, args);
    await bt.backTest(candles.map(c => [...c]));

    // buy-and-hold over the same window the strategy actually traded (post indicator warm-up)
    let warmup = candles.length - strategy.adx.length;
    let firstClose = candles[warmup][4];
    let lastClose = candles[candles.length - 1][4];
    let buyAndHoldPct = ((lastClose - firstClose) / firstClose) * 100;
    console.log(`\nBuy-and-hold over the same window: ${buyAndHoldPct.toFixed(2)}%`);
    if (bt.metrics) {
        console.log(`Regime total return:               ${bt.metrics.totalReturnPct.toFixed(2)}%`);
        console.log(`Regime vs buy-and-hold:            ${(bt.metrics.totalReturnPct - buyAndHoldPct).toFixed(2)} pts`);
    }
    process.exit(0);
})();
