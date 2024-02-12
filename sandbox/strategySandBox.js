let {SuperTrend} = require("../engine/BitFox");
let modules = require("./sandbox-modules");

let engine = modules.getTestEngineForBackTest();

(async  () =>{

    await engine.setupAndLoadClient()
    engine.applyStrategy(SuperTrend)

    // Set Up Event Handlers 
    engine.on('MultiDivergence', (eventArgs) => {
        console.log(":::::::::::::::::::::::::::::::::::::",eventArgs)
    });
    // Set Up Event Handlers 
    engine.on('onStrategyResponse', (eventArgs) => {
        console.log(":::::::::::::::::::::::::::::::::::::",eventArgs)
    });

    engine.on('onMessage', (eventArgs) => {
        console.log(":::::::::::::::::::::::::::::::::::::",eventArgs)
    });
    engine.on('onError', (eventArgs) => {
        console.log(":::::::::::::::::::::::::::::::::::::",eventArgs)
    });
    engine.on('onOrderPlaced', (eventArgs) => {
        console.log(":::::::::::::::::::::::::::::::::::::",eventArgs)
    });
    engine.on('onOrderFilled', (eventArgs) => {
        console.log(":::::::::::::::::::::::::::::::::::::",eventArgs)
    });
    engine.on('onTradeComplete', (eventArgs) => {
        console.log(":::::::::::::::::::::::::::::::::::::",eventArgs)
    });
    engine.on('onStopLossTriggered', (eventArgs) => {
        console.log(":::::::::::::::::::::::::::::::::::::",eventArgs)
    });

    await engine.run();
})();
