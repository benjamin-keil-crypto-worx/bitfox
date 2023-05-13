let {builder, utils} = require("../engine/BitFox");

/**
 * Instantiate a BitFox Engine
 */
module.exports.getTestEngineForBackTest = () =>{
   return builder()
            .requiredCandles(200)
            .sidePreference("biDirectional")
            .backtest(true)
            .pollRate(50)
            .public(true)
            .exchange("bybit")
            .symbol("BTCUSDT")
            .timeframe("5m")
            .amount(0.05)
            .profitPct(0.03)
            .strategyExtras({periodFast:50, periodSlow:200})
            //.stopLossPct(0.015)
            .fee(0.002)
            .key("FAKE_KEY")
            .secret("FAKE_SECRET")
            .life(false)
            .interval(10)
            .build();
}

module.exports.getTestEngine = () =>{
   return builder()
       .requiredCandles(200)
       .sidePreference("short")
       .backtest(true)
       .pollRate(100)
       .public(true)
       .exchange("bybit")
       .symbol("ADAUSDT")
       .timeframe("5m")
       .amount(1000)
       .profitPct(0.003)
       .strategyExtras({periodFast:55, periodSlow:200})
       //.stopLossPct(0.02)
       .fee(0.002)
       .key("FAKE_KEY")
       .secret("FAKE_SECRET")
       .life(false)
       .interval(10)
       .build();
}
