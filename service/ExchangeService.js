const ccxt = require("ccxt");

/**
 * class ExchangeService
 <pre>
 * This class is just a wrapper around the ccxt client
 * please see: https://docs.ccxt.com/#/  for more info
 </pre>
 */

/**
* @typedef {Object} requiredCredentials The Required Credentials object for Exchanges
* @property {String} apiKey The apiKey ,(Common auth method across exchanges)
* @property {String} secret the secret key, (Common auth method across exchanges)
* @property {any} uid Exchange dependent see ccxt documentation or consult with your target exchange
* @property {any} login Exchange dependent see ccxt documentation or consult with your target exchange
* @property {any} password Exchange dependent see ccxt documentation or consult with your target exchange
* @property {any} twofa Exchange dependent see ccxt documentation or consult with your target exchange
* @property {any} privateKey Exchange dependent see ccxt documentation or consult with your target exchange
* @property {any} walletAddress Exchange dependent see ccxt documentation or consult with your target exchange
* @property {any} token Exchange dependent see ccxt documentation or consult with your target exchange
*/

/**
 * @typedef {Object} options HTTP configuration for API calls only tinker with this if you now what you are doing
 * @property {String} defaultType The target for trading activities spot|futures|options|margin
 * @property {Boolean} adjustForTimeDifference Time difference adjustments
 * @property {Number} recvwindow the receive windows for responses!
 */

/**
 * @typedef {Object} exchangeOptions Exchange configuration options
 * @property {Boolean} life Exchange property,flag to determine if this execution context should make real trade orders
 *
 * @property {Boolean} Public Exchange property, flag to make sure only public API calls are made and Private API calls are mocked
 * @property {String} exchangeName Exchange property, the name of the traget exchange to use
 * @property {String} symbol Exchange property, the name of your trading pair i.e. BTCUSDT ETHUSDT etc.
 * @property {String} timeframe Exchange property, the time frame to choose for Historical Data Fetching
 *                          (Exchange dependent and Exchange must support historical Data retrieval)
 * @property requiredCredentials Exchange property, The Required credentials the Exchange is asking for. (Exchange dependent)
 * @property options Exchange property, Http and Exchange  configuration
 *
 */
class ExchangeService {

    /**
     *
     * @param args {exchangeOptions} The Configuration options that supplied through the BitFoxEngine
     * @returns {ExchangeService}
     */
    static getService( args ){ return new ExchangeService(args)}


    /**
     *
     * @param args {exchangeOptions} The Configuration options that supplied through the BitFoxEngine
     */
    constructor( args ) {
        this.life = args.life || false;
        this.client = null;
        this.requiredCandles = args.requiredCandles || 5000
    }

    /**
     *
     * @param exchange {String} The exchange name
     * @param args {exchangeOptions} The Configuration options that supplied through the BitFoxEngine
     * @returns {Promise<ExchangeService>} Sets up the exchange Client and loads the market structures
     */
    async setUpClient(exchange,args){
        this.client = new ccxt[exchange]();
        if(args.public){
            this.client.options =args.options || {'adjustForTimeDifference': true,'recvWindow':7000 };
            await this.client.loadTimeDifference()
            await this.client.loadMarkets();
            return this;
        }
        Object.keys(args.requiredCredentials).forEach( key => this.client[key] = args.requiredCredentials[key])
        this.client.options =args.options || {'defaultType': 'spot', 'adjustForTimeDifference': true,'recvWindow':7000 };
        await this.client.loadTimeDifference()
        await this.client.loadMarkets();
        return this;
    }

    /**
     *
     * @returns {Array<String>} The Available Exchanges
     * */
    static exchanges(){
        return ccxt.exchanges
    }

    /**
     *
     * @returns {ExchangeService} The Exchange Service instance used by the BitFoxEngine to make requests to target exchange
     */
    getContext(){ return this;}

    /**
     *
     * @returns {requiredCredentials} A object containing the required credentials for the given target exchange please see ccxt documentation for structure
     *
     */
    requiredCredentials(){
        return this.client.requiredCredentials;
    }

    /**
     *
     * @param date a Date instance to parse into 8610 format
     * @returns {Number} 8610 Date format
     */
    parse8601(date){
        return this.client.parse8601(date.toISOString());
    }

    /**
     *
     * @returns {timeframe} A object containing the available timeframes on the given target exchange please see ccxt documentation for structure
     * */
    timeFrames(){
        return this.client.timeframes;
    }

    /**
     *
     * @returns {Number} HTTP request Timout
     */
    timeout(){ return this.client.timeout }

    /**
     *
     * @returns {number} API Request Limit on the target exchange
     */
    rateLimit(){ return this.client.rateLimit }

    /**
     *
     * @returns {marketStructure} Returns the market structure of the given exchange
     */
    markets(){return this.client.markets}

    /**
     *
     * @returns {Array<string>} A list of available Symbols on the target exchange
     */
    symbols(){return this.client.symbols}

    /**
     *
     * @returns {currency} A object with available currencies on the exchange please ccxt for object structure
     */
    currencies(){return this.client.currencies}

    /**
     *
     * @returns {Promise<unknown>} Helper method to enforce rate limit wait periods during excessive api usage
     */
    waitForRateLimit(){
        let me = this;
        return new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve(false);
            }, me.rateLimit() || 500)
        })
    }

    /**
     *
     * @param key {String} The method handle on ccxt client to check if a exchange supports a method call like fetchOHLCV
     * @returns {Boolean}
     */
    has(key){
        return this.client.has[key];
    }

    /**
     *
     * @returns {Promise<any>} Returns an available balance object see ccxt documentation for object structure
     */
    async getBalance(){
        return await this.client.fetchBalance ({});
    }

    /**
     *
     * @param id {String} The Order ID
     * @param symbol {String} The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param price {String} Not used not sure why this is here
     * @returns {Promise<order>} Returns an order object see ccxt documentation for object structure
     */
    async getFilledOrder(id,symbol,price) {
        return await this.client.fetchOrder(id, symbol, {});
    }

    /**
     *
     * @param symbol {String} The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @returns {Promise<order>} Returns All orders for given symbol
     */

    async allOrders(symbol){
        return await this.client.fetchClosedOrders(symbol)
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param orderPrice {number} the order price to set the limit order
     * @param params {any} Optional not used yet
     * @returns {Promise<order>} Returns an order object see ccxt documentation for object structure
     */
    async limitBuyOrder(symbol,amount,orderPrice,params){
        return await this.client.createOrder(symbol,'limit','buy',amount,orderPrice,params);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param orderPrice {number} the order price to set the limit order
     * @param params {any} Optional not used yet
     * @returns {Promise<order>} Returns an order object see ccxt documentation for object structure
     */
    async limitSellOrder(symbol,amount,orderPrice,params){
        return await this.client.createOrder(symbol,'limit','sell',amount,orderPrice,params);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param params {any} Optional not used yet
     * @returns {Promise<order>} Returns an order object see ccxt documentation for object structure
     */
    async marketBuyOrder(symbol,amount,params){
        return await this.client.createOrder(symbol,'market','buy',amount,params);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param params {any} Optional not used yet
     * @returns {Promise<order>} Returns an order object see ccxt documentation for object structure
     */
    async marketSellOrder(symbol,amount,params){
        return await this.client.createOrder(symbol,'market','sell',amount,params);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @param limit {String} The Limit or amount of candles to fetch
     * @param params {any} Optional not used yet
     * @returns {Promise<Array<Array<Number>>>} An Array of Arrays with open,close,highs,low and volume data
     */

    async fetchOrderBook(symbol, limit,params){
        return await this.client.fetchOrderBook(symbol,limit,params);
    }

    /**
     *
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @param timeframe {String} The timeframe or candle period to fetch
     * @returns {Promise<*>} An Array of Arrays with open,close,highs,low and volume data
     */
    async fetchOHLCV(symbol,timeframe){
        //this.client.parse8601("");
        return await this.client.fetchOHLCV(symbol, timeframe, null, this.requiredCandles);
    }

    /**
     *
     * @param since {Date} a Date indicating the starting period for the Historical Data
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @param timeframe {String} The timeframe or candle period to fetch
     * @returns {Promise<*>} An Array of Arrays with open,close,highs,low and volume data
     */
    async fetchOHLCVSince(symbol,timeframe, since){
        return await this.client.fetchOHLCV(symbol, timeframe, since, this.requiredCandles);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @returns {Promise<ticker>} A Ticker object please ccxt documentation for object structure we are lazy here!
     */
    async fetchTicker( symbol ){
        return await this.client.fetchTicker( symbol)
    }
}

/**
 *
 * @type {{Service: ExchangeService}}
 */
module.exports = { Service:ExchangeService }
