let {builder} = require("../index").bitfox;
let {SuperTrend} = require("../strategies/SuperTrend");

let symbol = process.argv[2] || "ADAUSDT";
let timeframe = process.argv[3] || "15m";
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
    .strategyExtras({period:10, multiplier:3})
    .stopLossPct(0.98)
    .life(false)
    .interval(10)
    .build();

(async () => {
    console.log(`\nSuperTrend 15m Backtest — ${symbol}\n`);
    await engine.setupAndLoadClient();
    engine.applyStrategy(SuperTrend);
    await engine.run();
    process.exit(0);
})();
