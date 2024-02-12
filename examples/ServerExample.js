let helper = require("./helpers/helper");

let engine = helper.getEngineForServer();

(async  () =>{
    await engine.setupAndLoadClient()
    await engine.startServer();
})();