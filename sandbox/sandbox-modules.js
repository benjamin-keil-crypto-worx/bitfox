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
            .symbol("ADAUSDT")
            .timeframe("5m")
            .amount(200)
            .profitPct(0.03)
            //.strategyExtras({periodFast:9, periodSlow:12})
            .stopLossPct(0.015)
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

module.exports.getEngineForServer = () =>{
   return builder()
       .requiredCandles(150)
       .public(true)
       .exchange("bybit")
       .symbol("ADAUSDT")
       .timeframe("5m")
       .key("FAKE_KEY")
       .secret("FAKE_SECRET")
       .life(false)
       .build();
}

module.exports.getLifeEngine = () =>{
   return builder()
   .requiredCandles(200)
   .pollRate(10)
   .sidePreference("biDirectional")
   .timeframe("5m")
   .public(false)
   .exchange("bybit")
   .symbol("ADAUSDC")
   .amount(150)
   .profitPct(0.03)
   .useLimitOrder(true)
   //.strategyExtras({periodFast:9, periodSlow:13})
   .stopLossPct(0.015)
   .key("M43vldt066oLS2CBJB")
   .secret("XcLWWaPPikZMYk0VXkfzDeZxL75nuuo9J8VD")
   .life(true)
   .interval(30)
   .notifyOnly(false)
   .build();
}
