const { Exchange } = require("ccxt");
const {Service}   = require("../service/ExchangeService");
const MockService = require("../service/MockService").Service;


/**
 * 
 * @param {object} req - The Request Object
 * @param {Array<string>} keys - The Keys to check on the object
 * @returns {boolean} - weather the request is a valid request with proper fields
 */

const isValidRequest = (req, keys) =>{
    isValid = true; 
    keys.forEach(key =>{ 
        if(!req.hasOwnProperty(key)){ isValid =false;}
   })
   return isValid;  
}

/**
 * 
 * @param {object} req - The Request Object
 * @param {requiredCredentials} credentials 
 * @returns {exchangeOptions}
 */
const getExchangeArgs = (req, credentials) =>{
    return {
        life:req.life || false,
        public:req.public || true,
        exchangeName:req.exchangeName || "bybit",
        symbol:req.symbol || "BTCUSDT",
        timeframe:req.timeframe || "4h",
        requiredCredentials:credentials,
        options:req.options || {'defaultType': 'spot', 'adjustForTimeDifference': true,'recvWindow':7000 }
    }
}

/**
 * 
 * @param {object} req - The Request Object
 * @returns {ExchangeService} - The Exchange Client Service implementation
 */
const determineService =(req) =>{
    return ( req && (req.mock || req.public || !req.life)) ? MockService : Service;
}

/**
 * 
 * @param {object} args - The Request Body 
 * @returns {exchangeOptions} - The exchange Arguments
 */
const getExchangeService = (args) =>{
    return   determineService(args).getService(args)

}

/**
 * 
 * @returns {object} - The Ping Response 
 */
module.exports.ping = () =>{ return {message:"pong", code:200,success:true}};

/**
 * 
 * @param {object} - server instance  
 * @returns {object} - Server Health and endpoint information
 */
module.exports.health    = async (server) =>{
    console.log(server)
    return {
        message:`Server running at : ${server.address} port : ${server.port}`,
        endpoints:{
            ping:"Ping the server to see if it online",
            health:"Simple Health check",
            ballance:"Returns available ballance on target exchange",
            ticker:"Returns the current Ticker information of selected Currency Pair",
            orderbook:"Returns the Current Order Book for a given Currency Pair",
            candles:"Returns Historical Candle data from exchange for given  trading pair",
            buy:"Execute a Market buy order ",
            sell:"Execute a market Sell order",
            shutdown:"Emergency Shut Down"
        },

        code:200, 
        success:true
   }
};

/**
 * 
 * @param {object} req - The Request
 * @param {requiredCredentials} credentials - Credentials for API access 
 * @returns {Object} - The API Response 
 */
module.exports.ballance  = async (req, credentials) =>{
    
    if(!isValidRequest(req.body, ["exchangeName"])){ return {code:400, message:"Bad request"}}
    let args = getExchangeArgs(req.body, credentials)
    let service = getExchangeService(args);
    await service.setUpClient(args.exchangeName, args);
    return await service.getBalance();

};

/**
 * 
 * @param {object} req - The Request
 * @param {requiredCredentials} credentials - Credentials for API access 
 * @returns {Promise<ticker>} A Ticker object please ccxt documentation for object structure we are lazy here!
 */
module.exports.ticker    = async (req, credentials=null) =>{
    if(!isValidRequest(req.body, ["exchangeName"])){ return {code:400, message:"Bad request"}}
    let args = getExchangeArgs(req.body, credentials)
    let service = getExchangeService(args);
    await service.setUpClient(args.exchangeName, args);
    return await service.fetchTicker(args.symbol);
};

/**
 * 
 * @param {object} req - The Request
 * @param {requiredCredentials} credentials - Credentials for API access 
 * @returns {Promise<Array<Array<Number>>>} An Array of Arrays with order book information
 */
module.exports.orderBook = async (req, credentials=null) =>{
    if(!isValidRequest(req.body, ["exchangeName"])){ return {code:400, message:"Bad request"}}
    let args = getExchangeArgs(req.body, credentials)
    let service = getExchangeService(args);
    await service.setUpClient(args.exchangeName, args);
    return await service.fetchOrderBook(args.symbol, 200,{} );
};

/**
 * 
 * @param {object} req - The Request
 * @param {requiredCredentials} credentials - Credentials for API access 
 * @returns  {Promise<*>} An Array of Arrays with open,close,highs,low and volume data
 */
module.exports.candles = async (req, credentials=null) =>{
    if(!isValidRequest(req.body, ["exchangeName"])){ return {code:400, message:"Bad request"}}
    let args = getExchangeArgs(req.body, credentials)
    let service = getExchangeService(args);
    await service.setUpClient(args.exchangeName, args);
    return await service.fetchOHLCV(args.symbol,args.timeframe);
};

/**
 * 
 * @param {object} req - The Request
 * @param {requiredCredentials} credentials - Credentials for API access 
 * @returns {Promise<order>} Returns an order object see ccxt documentation for object structure
 */
module.exports.buy = async (req, credentials) =>{
    if(!isValidRequest(req.body, ["exchangeName","symbol","amount"])){ return {code:400, message:"Bad request"}}
    let args = getExchangeArgs(req.body, credentials)
    let service = getExchangeService(args);
    await service.setUpClient(args.exchangeName, args);
    return await service.marketBuyOrder(args.symbol,req.body.amount,{});
};

/**
 * 
 * @param {object} req - The Request
 * @param {requiredCredentials} credentials - Credentials for API access 
 * @returns {Promise<order>} Returns an order object see ccxt documentation for object structure
 */
module.exports.sell      = async (req, credentials) =>{
    if(!isValidRequest(req.body, ["exchangeName","symbol","amount"])){ return {code:400, message:"Bad request"}}
    let args = getExchangeArgs(req.body, credentials)
    let service = getExchangeService(args);
    await service.setUpClient(args.exchangeName, args);
    return await service.marketSellOrder(args.symbol,req.body.amount,{});
};

/**
 * 
 * @param {object} req - The Request
 * @returns {objecy} - Sends back an acknowledge message and shuts down the Server
 */
module.exports.shutdown  =  (req) =>{ 
    return {message:"Shutting Down Server", code:200 };
};


