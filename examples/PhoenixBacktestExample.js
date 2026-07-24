let {builder} = require("../index").bitfox;
let {Phoenix} = require("../strategies/Phoenix");

let symbol = process.argv[2] || "ADAUSDT";
let timeframe = process.argv[3] || "1h";
let amount = parseFloat(process.argv[4]) || 1000;

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
    .strategyExtras({
        atrPeriod: 10,
        rsiPeriod: 10,
        atrTPScaler: 2.0,
        atrSLScaler: 1.2,
        minATRFilter: 0,
        minScore: 10,
        confidenceMargin: 4,
        minBarsBetweenTrades: 8
    })
    .stopLossPct(0.98)
    .life(false)
    .interval(10)
    .build();

(async () => {
    console.log(`\nPhoenix Strategy Backtest`);
    console.log(`Symbol: ${symbol}  Timeframe: ${timeframe}  Capital: ${amount} USDT\n`);

    await engine.setupAndLoadClient();
    engine.applyStrategy(Phoenix);
    await engine.run();

    console.log(`\nBacktest complete.`);
    process.exit(0);
})();
