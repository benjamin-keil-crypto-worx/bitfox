const ccxt = require("ccxt");
class ExchangeService {

    /**
     *
     * @param args {any} The Configuration options that supplied through the BitFoxEngine
     * @returns {ExchangeService}
     */
    static getService( args ){ return new ExchangeService(args)}


    /**
     *
     * @param args {any} The Configuration options that supplied through the BitFoxEngine
     */
    constructor( args ) {
        this.life = args.life || false;
        this.client = null;
        this.requiredCandles = args.requiredCandles || 5000
    }

    /**
     *
     * @param exchange {String} The exchange name
     * @param args {any} The Configuration options that supplied through the BitFoxEngine
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
     * @returns {any} A object containing the required credentials for the given target exchange please see ccxt documentation for structure
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
     * @returns {any} A object containing the available timeframes on the given target exchange please see ccxt documentation for structure
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
     * @returns {any} API Request Limit on the target exchange
     */
    rateLimit(){ return this.client.rateLimit }

    /**
     *
     * @returns {any} Returns the market structure of the given exchange
     */
    markets(){return this.client.markets}

    /**
     *
     * @returns {Array<string>} A list of available Symbols on the target exchange
     */
    symbols(){return this.client.symbols}

    /**
     *
     * @returns {any} A object with available currencies on the exchange please ccxt for object structure
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
     * @returns {Promise<*>} Returns an order object see ccxt documentation for object structure
     */
    async getFilledOrder(id,symbol,price) {
        return await this.client.fetchOrder(id, symbol, {});
    }

    /**
     *
     * @param symbol {String} The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @returns {Promise<*>} Returns All order for given symbol
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
     * @returns {Promise<*>} Returns an order object see ccxt documentation for object structure
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
     * @returns {Promise<*>} Returns an order object see ccxt documentation for object structure
     */
    async limitSellOrder(symbol,amount,orderPrice,params){
        return await this.client.createOrder(symbol,'limit','sell',amount,orderPrice,params);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param params {any} Optional not used yet
     * @returns {Promise<*>} Returns an order object see ccxt documentation for object structure
     */
    async marketBuyOrder(symbol,amount,params){
        return await this.client.createOrder(symbol,'market','buy',amount,params);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param params {any} Optional not used yet
     * @returns {Promise<*>} Returns an order object see ccxt documentation for object structure
     */
    async marketSellOrder(symbol,amount,params){
        return await this.client.createOrder(symbol,'market','sell',amount,params);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @param limit {String} The Limit or amount of candles to fetch
     * @param params {any} Optional not used yet
     * @returns {Promise<*>} An Array of Arrays with open,close,highs,low and volume data
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
     * @returns {Promise<*>} A Ticker object please ccxt documentation for object structure we are lazy here!
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
