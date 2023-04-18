let {builder, utils} = require("../engine/BitFox");

/**
 * Instantiate a BitFox Engine
 */
module.exports.getTestEngineForBackTest = () =>{
   return builder()
            .requiredCandles(200)
            .sidePreference("short")
            .backtest(false)
            .pollRate(10)
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

module.exports.getTestEngine = () =>{
   return builder()
       .requiredCandles(200)
       .sidePreference("short")
       .backtest(true)
       .pollRate(10)
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

this.lookBack = args.lookBack || 20
this.probabiltyFactorLong = args.probabiltyFactorLong || 0.6;
this.probabiltyFactorShort = args.probabiltyFactorShort || 0.4;
this.squeezeFactor = args.squeezeFactor || 1.9;
