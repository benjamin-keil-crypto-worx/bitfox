let {ZemaCrossOver} = require("../engine/BitFox");
let modules = require("./sandbox-modules");

let engine = modules.getTestEngineForBackTest();

(async  () =>{

    await engine.setupAndLoadClient()
    engine.applyStrategy(ZemaCrossOver)

    // Set Up Event Handlers 
    engine.on('onStrategyResponse', (eventArgs) => {
        console.log(eventArgs)
    });

    await engine.run();
})();
