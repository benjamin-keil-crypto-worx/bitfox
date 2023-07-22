let {SuperTrend} = require("../engine/BitFox");
let modules = require("./sandbox-modules");

let engine = modules.getLifeEngine();

(async  () =>{

    await engine.setupAndLoadClient()
    engine.applyStrategy(SuperTrend)

    // Set Up Event Handlers 
    engine.on('onStrategyResponse', (eventArgs) => {
        console.log(eventArgs)
    });

    await engine.run();
})();
