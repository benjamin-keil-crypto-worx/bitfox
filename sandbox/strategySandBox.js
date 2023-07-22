let {ThorsHammer} = require("../engine/BitFox");
let modules = require("./sandbox-modules");

let engine = modules.getTestEngineForBackTest();

(async  () =>{

    await engine.setupAndLoadClient()
    engine.applyStrategy(ThorsHammer)

    // Set Up Event Handlers 
    engine.on('SmartAccumulate', (eventArgs) => {
        console.log(eventArgs)
    });

    await engine.run();
})();
