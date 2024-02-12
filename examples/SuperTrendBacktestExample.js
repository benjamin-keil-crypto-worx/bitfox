let {SuperTrend} = require("bitfox").bitfox;
let helper = require("./helpers/helper");

let engine = helper.getTestEngineForBackTest();

(async  () =>{

    await engine.setupAndLoadClient()
    engine.applyStrategy(SuperTrend)
    await engine.run();
})();
