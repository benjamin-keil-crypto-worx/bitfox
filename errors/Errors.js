
const {Log} = require("../lib/utility/Log");

class Errors{
    static finalize() {
        if (process.env.NODE_ENV === "test") { process.emitWarning("Warning Execution Context in a bad state");}
        else{process.exit(0)};
    }

    static EngineInitializationError(cause, code=null, error=null){
        console.log(`Error Initializing BitFox Engine, cannot proceed with execution context ( Cause: ${cause} , code: ${ (code !== null) ? code : 1000 } )`) 
        if(error){
            Log.error(error)
        }
        Errors.finalize();
    }

    

    static ExchangeInitializationError(cause, code=null, error=null){
        console.log(`Error Initializing Exchange, cannot proceed with execution context( Cause: ${cause} , code:${ (code !== null) ? code : 2000 } )`) 
        if(error){
            Log.error(error)
        }
        Errors.finalize();
    }

    static FatalRuntimeError(cause, code=null, error=null){
        console.log(`Fatal Runtime Error, cannot proceed with execution context ( Cause: ${cause} , code:${ (code !== null) ? code : 3000 } )`) 
        if(error){
            Log.error(error)
        }
        Errors.finalize();
    }

    static UnsupportedExchangeOptionError(cause, code=null, error=null){
        console.log(`Error Unsupported Exchnage Option, cannot proceed with execution context ( Cause: ${cause} , code:${ (code !== null) ? code : 3000 } ) `) 
        if(error){
            Log.error(error)
        }
       Errors.finalize();
    }
}


module.exports = {Errors:Errors}