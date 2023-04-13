let {BitFoxEngine, ThorsHammer, builder} = require("../engine/BitFox");


(async  () =>{

    // Alternatively initialize engine via the builder interface (Recommended instantiation flow!!)
    let engine = builder()
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
        
    // Set up the Exchage Client
    await engine.setupAndLoadClient()
    
    // Leverage A Strategy from bitfoxes strategy repository
    engine.applyStrategy(ThorsHammer)
    
    // Set Up Event Handlers 
    engine.on('onStrategyResponse', (eventArgs) => {
        console.log(eventArgs)
    });

    await engine.run();
})();
