let helper = require("./helpers/helper");

let {Bollinger, ProcessManager} = require("bitfox").bitfox


/**
 * retrieve the test engine
*/

let engine = helper.getLifePaperTradeEngine();

(async  () =>{

    await engine.setupAndLoadClient()
    engine.applyStrategy(Bollinger)
    // Set Up Event Handlers
    engine.on('onStrategyResponse', (eventArgs) => {
        console.log(eventArgs)
    });
    
    engine.setAsProcess(ProcessManager.getProcessManager().setProcessSchedule("1m"))
})();
