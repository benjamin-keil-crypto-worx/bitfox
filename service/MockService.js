let ExchangeService = require("./ExchangeService").Service;
let {Mock} = require("../lib/model/Mock");

const ccxt = require("ccxt");

/**
 * Class Mock Service
 <pre>
 * This clas provides the same service as the Exchange Service but instead of placing real trades,
 * this class mocks or simulates executing exchange actions that would normally require a API Key!
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
 * @typedef {Object} mockExchangeProperties  MockExchange  configuration options
 * @property {Boolean} life MockExchange property,flag to determine if this execution context should make real trade orders
 *
 * @property {Boolean} Public MockExchange property, flag to make sure only public API calls are made and Private API calls are mocked
 * @property {String} exchangeName MockExchange property, the name of the traget exchange to use
 * @property {String} symbol MockExchange property, the name of your trading pair i.e. BTCUSDT ETHUSDT etc.
 * @property {String} timeframe MockExchange property, the time frame to choose for Historical Data Fetching
 *                          (Exchange dependent and Exchange must support historical Data retrieval)
 * @property {requiredCredentials} requiredCredentials property, The Required credentials the Exchange is asking for. (Exchange dependent)
 * @property options Exchange property, Http and Exchange  configuration
 *
 */

class MockService {

    /**
     *
     * @param args {mockExchangeProperties} The Configuration options that supplied through the BitFoxEngine
     * @returns {MockService}
     */
    static getService(args){
        return new MockService(args);
    }

    /**
     *
     * @param args {mockExchangeProperties} The Configuration options that supplied through the BitFoxEngine
     * @param exchangeService
     */

    constructor(args, exchangeService=null) {
        this.exchange = (exchangeService === null) ? ExchangeService.getService(args) : exchangeService;
        this.mock = Mock.mocker();
    }

    /**
     *
     * @param exchange {String} The exchange name
     * @param args {mockExchangeProperties} The Configuration options that supplied through the BitFoxEngine
     * @returns {Promise<MockService>}
     */

    async setUpClient(exchange,args){
        await this.exchange.setUpClient(exchange,args);
        return this;
    }

    /**
     *
     * @returns {Array<String>} The Available Exchanges*/
    exchanges(){
        return ccxt.exchanges
    }

    /**
     *
     * @returns {requiredCredentials} A object containing the required credentials for the given target exchange please see ccxt documentation for structure
     */
    requiredCredentials(){
        return this.exchange.requiredCredentials;
    }

    /**
     *
     * @returns {timeframe} A object containing the available timeframes on the given target exchange please see ccxt documentation for structure
     * */
    timeFrames(){
        return this.exchange.timeFrames;
    }

    /**
     *
     * @returns {Number} HTTP request Timout
     */

    timeout(){ return super.timeout() }

    /**
     *
     * @returns {Number} API Request Limit on the target exchange
     */
    rateLimit(){ return super.rateLimit() }

    /**
     *
     * @returns {marketStructure} Returns the market structure of the given exchange
     */
    markets(){return super.markets() }

    /**
     *
     * @returns {Array<string>} A list of available Symbols on the target exchange
     */
    symbols(){return super.symbols() }

    /**
     *
     * @returns {currency} A object with available currencies on the exchange please ccxt for object structure
     */
    currencies(){return super.currencies() }

    /**
     *
     * @returns {Promise<unknown>} Helper method to enforce rate limit wait periods during excessive api usage
     */
    waitForRateLimit(){
       return super.waitForRateLimit()
    }

    /**
     *
     * @param key {String} The method handle on ccxt client to check if a exchange supports a method call like fetchOHLCV
     * @returns {Boolean}
     */
    has(key){
        return this.exchange.has(key);
    }

    /**
     *
     * @param quote {String} The Quote currency i.e USDT
     * @param base {String} The Base Currency i.e. BTC
     * @param quoteAmount The Quote amount
     * @param baseAmount the base amount
     * @returns {{BTC: {total: *, used: number, free: *}, datetime: string, USD: {total: *, used: number, free: *}, free: {}, timestamp: number}}
     */
    getBalance(quote, base, quoteAmount, baseAmount){
        return this.mock.getBalance(quote, base, quoteAmount, baseAmount)
    }

    /**
     *
     * @param id {String} The Order ID
     * @param symbol {String} The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param price {String} Not used not sure why this is here
     * @returns {Promise<order>} Returns an order object see ccxt documentation for object structure
     */
    getFilledOrder(id,symbol,price) {
        return this.mock.getClosedOrder(id,symbol,price)
    }

    /**
     *
     * @param symbol {String} The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @returns {Promise<Array<order>>} Returns All order for given symbol
     */
    allOrders(symbol){
        return this.mock.getAllOrders(symbol);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param orderPrice {number} the order price to set the limit order
     * @param params {any} Optional not used yet
     * @returns {order}
     */
    limitBuyOrder(symbol,amount,orderPrice,params){
        return this.mock.buyOrder(symbol,'limit', orderPrice, amount);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param orderPrice {number} the order price to set the limit order
     * @param params {any} Optional not used yet
     * @returns {order}
     */
    limitSellOrder(symbol,amount,orderPrice,params){
        return this.mock.sellOrder(symbol,'limit', orderPrice, amount);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param orderPrice {number} the order price to set the limit order
     * @param params {any} Optional not used yet
     * @returns {order}
     */
    marketBuyOrder(symbol,amount,orderPrice,params){
        return  this.mock.buyOrder(symbol,'market', orderPrice, amount);

    }

    /**
     *
     * @param currentCandles {Array<number>} the current candles
     * @param order {any} the Order that you want to add to the trade template
     * @param profitTarget {number} the profit target
     * @param funds {number} the funds available in this mocked scenario
     * @param amount {number} the amount available in this mocked scenario
     * @param side {String} the side of the trade i.e. long|shot
     * @returns {{entryTimestamp: Date, tradeDirection, amount, entryOrder, profitTarget, stopTriggered: boolean, funds, totalBars: number, exitOrder: null, exitTimeStamp: null}}
     */
    getTradeTemplate(currentCandles, order, profitTarget, funds, amount, side){
        return this.mock.getTradeTemplate(currentCandles, order, profitTarget, funds, amount, side)
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc.
     * @param amount {number} the amount to purchase
     * @param orderPrice {number} the order price to set the limit order
     * @param params {any} Optional not used yet
     * @returns {{symbol: string, average, datetime: string, side: string, amount, price, id: string, lastTradeTimestamp: number, type: string, timeInForce: string, timestamp: number, status: string}}
     */
    marketSellOrder(symbol,amount,orderPrice,params){
        return this.mock.sellOrder(symbol,'market', orderPrice, amount);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @param limit {String} The Limit or amount of candles to fetch
     * @param params {any} Optional not used yet
     * @returns {Promise<*>} An Array of Arrays with open,close,highs,low and volume data
     */
    async fetchOrderBook(symbol, limit,params){
        return await this.exchange.fetchOrderBook(symbol,limit,params);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @param timeframe {String} The timeframe or candle period to fetch
     * @returns {Promise<*>} An Array of Arrays with open,close,highs,low and volume data
     */
    async fetchOHLCV(symbol,timeframe){
        //this.client.parse8601("");
        return await this.exchange.fetchOHLCV(symbol, timeframe, null, this.candleLimit);
    }

    /**
     *
     * @param since {Date} a Date indicating the starting period for the Historical Data
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @param timeframe {String} The timeframe or candle period to fetch
     * @returns {Promise<*>} An Array of Arrays with open,close,highs,low and volume data
     */
    async fetchOHLCVSince(symbol,timeframe, since){
        return await this.exchange.fetchOHLCV(symbol, timeframe, since, this.candleLimit);
    }

    /**
     *
     * @param symbol {String}  The Symbol i.e. ADAUSDT, BTCUSDT etc
     * @returns {Promise<*>} A Ticker object please ccxt documentation for object structure we are lazy here!
     */
    async fetchTicker( symbol ){
        return await this.exchange.fetchTicker( symbol)
    }
}

/**
 *
 * @type {{Service: MockService}}
 */
module.exports = {Service:MockService}

