let {builder, utils, SuperTrend} = require("../engine/BitFox");

(async () =>{
    // Initialize the Engine via options instance 
    //let engine = BitFoxEngine.init(options);
    let engine = builder()
        .requiredCandles(200)
        .sidePreference("biDirectional")
        .backtest(false)
        .pollRate(10)
        .public(true)
        .exchange("bybit")
        .symbol("ADAUSDT")
        .timeframe("15m")
        .amount(100)
        .profitPct(1.02)
        // .fee(0.02)
        .key("FAKE_KEY")
        .secret("FAKE_SECRET")
        .life(false)
        .interval(60)
        .build(); 
        
    // Set up the Exchage Client
    await engine.setupAndLoadClient()
    
    // Leverage A Strategy from botfoxes strategy repository
    engine.applyStrategy(SuperTrend)
    
    // Set Up Event Handlers 
    engine.on('onMessage', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onError', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onOrderPlaced', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onOrderFilled', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onTradeComplete', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onStopLossTriggered', (eventArgs) => {
        console.log(eventArgs)
    });
    // SetUp Custom Event Handler (You need to fire the event yourself BotFox doesn't know about your Custom Event")
    engine.on('MyCustomEvent', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onStrategyResponse', (eventArgs) => {
        console.log(eventArgs)
    });
    
    // Start The BotFox Engine
    try {
        await engine.run();
    } catch (err) {
         console.error(err);
    }
   
})();