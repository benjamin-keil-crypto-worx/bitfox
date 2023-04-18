let modules = require("./sandbox-modules");

let {BitFoxEngine, Bollinger, ProcessManager} = require("../engine/BitFox");


/**
 * retrieve the test engine
 */

let engine = modules.getTestEngine();

(async  () =>{

    await engine.setupAndLoadClient()
    engine.applyStrategy(Bollinger)
    // Set Up Event Handlers
    engine.on('onStrategyResponse', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.setAsProcess(ProcessManager.getProcessManager().setProcessSchedule("1m"))
})();
