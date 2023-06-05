let modules = require("./sandbox-modules");

let engine = modules.getEngineForServer();

(async  () =>{

    await engine.setupAndLoadClient()
    await engine.startServer();
})();