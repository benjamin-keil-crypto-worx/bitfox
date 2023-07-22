let {Log} = require("../lib/utility/Log")
let {Service} = require("../service/ExchangeService");
let MockService = require("../service/MockService").Service;
let {Alert} = require("../alerting/Alert");
const {State} = require("../lib/states/States");
const {BackTestEngine} = require("./BackTest");
const {DataLoaderEngine} = require("./DataLoader");
const {DataLoaderBuilder} = require("./DataLoader");

const {EventHandler} = require("../lib/events/EventHandler");
const {Strategy} = require("../strategies/Strategy");
const {SuperTrend} = require("../strategies/SuperTrend");
const {RSITrend} = require("../strategies/RSITrend");
const {EmaTrend} = require("../strategies/EmaTrend");
const {SmartAccumulate} = require("../strategies/SmartAccumulate");
const {Bollinger} = require("../strategies/Bollinger");
const {SimplePriceAlert} = require("../alerting/SimplePriceAlert");
const {MarketMaker} = require("../strategies/MarketMaker");
const {ThorsHammer} = require("../strategies/ThorsHammer");
const {ZemaCrossOver} = require("../strategies/ZemaCrossOver");

const getModels = require("../lib/model/Model").getModels();
const {ProcessManager} = require("../engine/ProcessManager");
const {Server} = require("../server/server");
const {Client} = require("../server/client");

const {MfiMacd} = require("../strategies/MfiMacd");
const utils = require("../lib/utility/util");
const {Errors} = require("../errors/Errors");


/**
 *  @typedef {Object} ticker A ticker is a statistical calculation with the information calculated over the past 24 hours for a specific market.
 *  @property {String} symbol string symbol of the market ('BTC/USD', 'ETH/BTC', ...)
 *  @property {String} info  { the original non-modified unparsed reply from exchange API },
 *  @property {String}timestamp int (64-bit Unix Timestamp in milliseconds since Epoch 1 Jan 1970)
 *  @property {Date} datetime ISO8601 datetime string with milliseconds
 *  @property {Number} high highest price
 *  @property {Number} low lowest price
 *  @property {Number} bid current best bid (buy) price
 *  @property {Number} bidVolume current best bid (buy) amount (may be missing or undefined)
 *  @property {Number} ask current best ask (sell) price
 *  @property {Number} askVolume current best ask (sell) amount (may be missing or undefined)
 *  @property {Number} vwap  volume weighed average price
 *  @property {Number} open opening price
 *  @property {Number} close closing price (closing price for current period)
 *  @property {Number} last same as `close`, duplicated for convenience
 *  @property {Number} previousClose closing price for the previous period
 *  @property {Number} change absolute change, `last - open`
 *  @property {Number} percentage relative change, `(change/open) * 100`
 *  @property {Number} average average price, `(last + open) / 2`
 *  @property {Number} baseVolume volume of base currency traded for last 24 hours
 *  @property {Number} quoteVolume  volume of quote currency traded for last 24 hours
 */



/**
 * @typedef {Object} orderBook the current order book for any given trading on the exchange
 * @property {Array<Array<number>>} bids An array of [price, amount] pairs
 * @property {Array<Array<number>>} asks An array of [price, amount] pairs
 * @property {String} symbol  'ETH/BTC',  a unified market symbol
 * @property {Number} timestamp 1499280391811, Unix Timestamp in milliseconds (seconds * 1000)
 * @property {String} datetime '2017-07-05T18:47:14.692Z', // ISO8601 datetime string with milliseconds
 * @property {Number} nonce    1499280391811, an increasing unique identifier of the orderbook snapshot
 */

/**
 * @typedef {Object} currency the Currency Information from exchange
 * @property {String} id       'btc',     string literal for referencing within an exchange
 * @property {String} code     'BTC',     uppercase unified string literal code the currency
 * @property {String} name     'Bitcoin', string, human-readable name, if specified
 * @property {Boolean} active    true,    boolean, currency status (tradeable and withdrawable)
 * @property {Number} fee      0.123,     withdrawal fee, flat
 * @property {Number} precision 8,        number of decimal digits "after the dot" (depends on exchange.precisionMode)
 * @property {Boolean} deposit   true     boolean, deposits are available
 * @property {Boolean} withdraw  true     boolean, withdraws are available
 */

/**
 * @typedef marketStructure
 *  @property {String} id       'btcusd',      string literal for referencing within an exchange
 *  @property {String} symbol  'BTC/USD',      uppercase string literal of a pair of currencies
 *  @property {String} base    'BTC',          uppercase string, unified base currency code, 3 or more letters
 *  @property {String} quote   'USD',          uppercase string, unified quote currency code, 3 or more letters
 *  @property {String} baseId  'btc',          any string, exchange-specific base currency id
 *  @property {String} quoteId 'usd',          any string, exchange-specific quote currency id
 *  @property {Boolean} active   true,          boolean, market status
 *  @property {String} type    'spot',         spot for spot, future for expiry futures, swap for perpetual swaps, 'option' for options
 *  @property {Boolean} spot     true,          whether the market is a spot market
 *  @property {Boolean} margin   true,          whether the market is a margin market
 *  @property {Boolean} future   false,         whether the market is a expiring future
 *  @property {Boolean} swap     false,         whether the market is a perpetual swap
 *  @property {Boolean} option   false,         whether the market is an option contract
 *  @property {Boolean} contract false,         whether the market is a future, a perpetual swap, or an option
 *  @property {String} settle   'USDT',        the unified currency code that the contract will settle in, only set if `contract` is true
 *  @property {String} settleId 'usdt',        the currencyId of that the contract will settle in, only set if `contract` is true
 *  @property {Number} contractSize 1,         the size of one contract, only used if `contract` is true
 *  @property {Boolean} linear   true,          the contract is a linear contract (settled in quote currency)
 *  @property {Boolean} inverse  false,         the contract is an inverse contract (settled in base currency)
 *  @property {Number} expiry  1641370465121,  the unix expiry timestamp in milliseconds, undefined for everything except market['type'] `future`
 *  @property {String} expiryDatetime '2022-03-26T00:00:00.000Z', The datetime contract will in iso8601 format
 *  @property {Number} strike 4000,            price at which a put or call option can be exercised
 *  @property {String} optionType 'call',      call or put string, call option represents an option with the right to buy and put an option with the right to sell
 *  @property {Number} taker    0.002,         taker fee rate, 0.002 = 0.2%
 *  @property {Number} maker    0.0016,        maker fee rate, 0.0016 = 0.16%
 *  @property {Boolean} percentage true,        whether the taker and maker fee rate is a multiplier or a fixed flat amount
 *  @property {Boolean} tierBased false,        whether the fee depends on your trading tier (your trading volume)
 *  @property {String} feeSide 'get',          string literal can be 'get', 'give', 'base', 'quote', 'other'
 */

/**
 * @typedef {object} fee Fee structure
 *
 * @property {String} currency  'BTC',  which currency the fee is (usually quote)
 * @property {Number} cost      0.0009, the fee amount in that currency
 * @property {Number} rate     0.002,  the fee rate (if available)
 *
 */
/**
 * @typedef {Object} order  an order from an exchange
 * {
 *  @property {String} id                '12345-67890:09876/54321', string
 *  @property {String} clientOrderId     'abcdef-ghijklmnop-qrstuvwxyz', a user-defined clientOrderId, if any
 *  @property {String} datetime          '2017-08-17 12:42:48.000',  ISO8601 datetime of 'timestamp' with milliseconds
 *  @property {Number} timestamp          1502962946216,  order placing/opening Unix timestamp in milliseconds
 *  @property {Number} lastTradeTimestamp 1502962956216,  Unix timestamp of the most recent trade on this order
 *  @property {String} status      'open',       'open', 'closed', 'canceled', 'expired', 'rejected'
 *  @property {String} symbol      'ETH/BTC',    symbol
 *  @property {String} type        'limit',      'market', 'limit'
 *  @property {String} timeInForce 'GTC',        'GTC', 'IOC', 'FOK', 'PO'
 *  @property {String} side         'buy',        'buy', 'sell'
 *  @property {Number} price'       0.06917684,  float price in quote currency (may be empty for market orders)
 *  @property {Number} average      0.06917684,  float average filling price
 *  @property {Number} amount       1.5,         ordered amount of base currency
 *  @property {Number} filled       1.1,         filled amount of base currency
 *  @property {Number} remaining    0.4,         remaining amount to fill
 *  @property {Number} cost         0.076094524, 'filled' * 'price' (filling price used where available)
 *  @property {Array<any>} trades     [ ... ],   a list of order trades/executions
 *  @property {Object} info           {...}      the original unparsed order structure as is
 *
 */

/**
 * @typedef {Object} timeframe empty if the exchange.has['fetchOHLCV'] !== true
 * @property {String} 1m   1minute (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 5m   5minutes (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 15m  15minutes (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 30m  30minutes (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1h   1hour (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 2h   2hours (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 4h   4hours (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 12h  12hours (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1d   1day (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1W   1week (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1M   1month (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1y   1year (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
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
 * @typedef {Object} engineOptions Engine configuration options
 * @property {Number} amount Engine property, the base currency amount in this execution context
 * @property {Number} profitPct Engine property,the target % for profit taking in this execution context
 * @property {Number} stopLossPct Engine property,the stop loss target % in this execution context
 * @property {Number} fee  Engine property,the fee % an exchange charges for purchasing and selling assets this execution context (Not fully supported yet!!)
 * @property {Boolean} life Engine property,flag to determine if this execution context should make real trade orders
 * @property {Number} interval Engine property,the interval in seconds the engine is using to periodically fetch OHLCV Historical Data and run execution contexts (Strategies & Alerting)
 *
 * @property {Boolean} Public Exchange property, flag to make sure only public API calls are made and Private API calls are mocked
 * @property {String} exchangeName Exchange property, the name of the traget exchange to use
 * @property {String} symbol Exchange property, the name of your trading pair i.e. BTCUSDT ETHUSDT etc.
 * @property {String} timeframe Exchange property, the time frame to choose for Historical Data Fetching
 *                          (Exchange dependent and Exchange must support historical Data retrieval)
 * @property requiredCredentials Exchange property, The Required credentials the Exchange is asking for. (Exchange dependent)
 * @property options Exchange property, Http nd Exchange  configuration
 *
 * @property {Boolean} backTest Backtest property, flag to indicate if this execution context should run a backtest
 * @property {Number} requiredCandles Backtest property, the number of Historical Data Candles to fetch for each iteration
 * @property {Number} pollRate Backtest property, number of time to pull data from exchange
 *
 * @property {String} sidePreference Strategy property, the trading preference lon|short/biDirectional
 * @property {any} strategyExtras Strategy property, strategy specific arguments for custom implementations
 *
 *
 * @param {String} type Alert & Notification property, the alerting mechanism or type to use (Email|Slack|Telegram)
 * @param {String} notificationToken Alert & Notification property, the Authentication token for Notification support
 * @param {String} telegramChatId Alert & Notification property, (Telegram specific optional parameter to sync chatId at strat upi)
 * @param {String} emailFrom Alert & Notification property,(Email alert the email address the email is sent from)
 * @param {String} emailTo Alert & Notification property, (Email alert the email address the email is sent to)
 * @param {any} alertExtras Alert & Notification property, Alert specific arguments for custom implementations
 */

/**
 * Class Engine Builder
 *
 * The Engine Builder Class is just a helper class that allows you to be more in control of creating BitFox Engines
 * By Using interface methods that set dedicated fields on the Engine.
 * This class is accessible through Bitfox exports and can be imported into your code base by typyng
 *
 * let {builder} = require("bitfox").bitfox
 */
class EngineBuilder {


    /**
     *
     * @returns {EngineBuilder} A set of setters and getters to instantiate bitfox instances
     */
    static builder() {
        return new EngineBuilder()
    }

    constructor() {
        this.args = {}
    };

    invalidTypeError(actualType, target, expectedType ){
        Errors.EngineInitializationError(`Invalid type: ${actualType} provided for ${target} expected type is: ${expectedType}`)
    }

    validateTypes(value,target, expectedType){
        if(typeof value !== expectedType){
            this.invalidTypeError(typeof value, target, expectedType)
        }
    }
    /**
     *
     * @param useLimitOrder {Boolean} Engine Specific Parameter if this is set to true the Engine will execute send limit orders
     *                                and wait for them to be fully filled other simple market orders aer made! the Default is false
     * @returns {EngineBuilder}
     */
    useLimitOrder(useLimitOrder) {
        this.validateTypes(useLimitOrder, "useLimitOrder", "boolean");
        this.args.useLimitOrder = useLimitOrder;
        return this;
    }

    /**
     *
     * @param notifyOnly {Boolean}  Engine Specific Parameter if this is set to true the Engine will not execute trades and only Notify
     *                              you of Trade Signals from the Strategy. The Default is false
     * @returns {EngineBuilder}
     */
    notifyOnly(notifyOnly){
        this.validateTypes(notifyOnly, "notifyOnly", "boolean");
        this.args.notifyOnly = notifyOnly;
        return this;
    }

    /**
     *
     * @param exchange {String}  Exchange Parameter you need to add this inorder to Identify the Exchange you want to use
     * @return {EngineBuilder}
     */
    exchange(exchange) {
        this.validateTypes(exchange, "exchange", "string");
        this.args.exchangeName = exchange;
        return this;
    }

    /**
     *
     * @param interval {Number} Engine Specific Parameter sets the general interval and time to execute Strategy Logic
     * @returns {EngineBuilder}
     */
    interval(interval) {
        this.validateTypes(interval, "interval", "number");
        this.args.interval = interval;
        return this;
    }

    /**
     *
     * @param symbol {String} Exchange Specific Parameter sets you desired Trading Pair i.e. ADAUSDT|BTCUSDT|ETHUSDT etc.
     * @returns {EngineBuilder}
     */
    symbol(symbol) {
        this.validateTypes(symbol, "symbol", "string");
        this.args.symbol = symbol;
        return this;
    }

    /***
     *
     * @param timeframe {String}  Exchange Specific Parameter sets you desired timeframe for ohlcv candle data,
     *                            that is to be fetched from the Exchange
     * @returns {EngineBuilder}
     */
    timeframe(timeframe) {
        this.validateTypes(timeframe, "timeframe", "string");
        this.args.timeframe = timeframe;
        return this;
    }

    /***
     *
     * @param amount {Number} Exchange & Engine Specific Parameter sets your desired Base amount that is to be used for trades
     * @returns {EngineBuilder}
     */
    amount(amount) {
        this.validateTypes(amount, "amount", "number");
        this.args.amount = amount;
        return this;
    };

    /**
     *
     * @param profitPct {Number}   Exchange & Engine Specific Parameter sets your desired Profit Target to exit long/short positions
     *                             this is a percentage i.e. 0.01 would indicate 1% higher or lower of the current price
     *
     * @returns {EngineBuilder}
     */
    profitPct(profitPct) {
        this.validateTypes(profitPct, "profitPct", "number");
        this.args.profitPct = profitPct;
        return this;
    }

    /**
     *
     * @param stopLossPct  {Number}   Exchange & Engine Specific Parameter sets your desired Stop Loss Target to exit long/short positions
     *                                this is a percentage i.e. 0.01 would indicate 1% higher or lower of the current price
     *
     * @returns {EngineBuilder}
     */
    stopLossPct(stopLossPct) {
        this.validateTypes(stopLossPct, "stopLossPct", "number");
        this.args.stopLossPct = stopLossPct;
        return this;
    }

    /***
     *
     * @param fee {Number}   Exchange & Engine Specific Parameter setting the exchange fee used to calculate better long/short profit and stop targets
     *                       this is a percentage i.e. 0.01 would indicate 1% higher or lower of the current price (Not available in the pre-release versions of bitfox)
     *
     * @returns {EngineBuilder}
     */
    fee(fee) {
        this.validateTypes(fee, "fee", "number");
        this.args.fee = fee;
        return this;
    }

    /***
     *
     * @param backtest {Boolean}   Engine  Specific Parameter setting a flag that tells the Engine to back test the Strategy
     * @returns {EngineBuilder}
     */
    backtest(backtest) {
        this.validateTypes(backtest, "backtest", "boolean");
        this.args.backtest = backtest;
        return this;
    }

    /***
     *
     * @param _public {Boolean}  Engine  Specific Parameter setting a flag that tells the Engine to not use private APIs to Exchange
     *                           preventing real trades to be executed!
     * @returns {EngineBuilder}
     */
    public(_public) {
        this.validateTypes(_public, "_public", "boolean");
        this.args.public = _public;
        return this;
    }

    /**
     *
     * @param life {Boolean}  Engine  Specific Parameter setting a flag that tells the Engine not send real order requests to the Exchange
     *                        orders are mocked if this flag is set to false.!
     * @returns {EngineBuilder}
     */
    life(life) {
        this.validateTypes(life, "life", "boolean");
        this.args.life = life;
        return this;
    }

    /**
     *
     * @param options {Object}  Exchange Specific Parameter : {'defaultType': 'spot', 'adjustForTimeDifference': true,'recvwindow':7000 };
     *                          This is an Advanced usage and allows users to leverage different trading products | spot | futures | margins etc. we recommend to stick with
     *                          spot and the default options for now. {'defaultType': 'spot', 'adjustForTimeDifference': true,'recvwindow':7000 },
     *
     * @returns {EngineBuilder}
     */
    options(options) {
        this.args.options = options;
        return this;
    }

    /**
     *
     * @param key {String}  Exchange Specific Parameter apiKey
     *
     * @returns {EngineBuilder}
     */
    key(key) {
        this.initRequiredCreds();
        this.validateTypes(key, "key", "string");
        this.args.requiredCredentials.apiKey = key;
        return this;
    }

    /**
     * Initializes the internal requiredCredentials object
     */
    initRequiredCreds() {
        if (!this.args.requiredCredentials) {
            this.args.requiredCredentials = {};
        }
    }

    /**
     *
     * @param secret {String}  Exchange Specific Parameter apiSecret
     * @returns {EngineBuilder}
     */
    secret(secret) {
        this.initRequiredCreds();
        this.validateTypes(secret, "secret", "string");
        this.args.requiredCredentials.secret = secret;
        return this;
    }

    /**
     *
     * @param uid {any}  Exchange Specific Parameter uid
     * @returns {EngineBuilder}
     */
    uid(uid) {
        this.initRequiredCreds();
        this.args.requiredCredentials.uid = uid;
        return this;
    }

    /**
     *
     * @param login  {any}  Exchange Specific Parameter login
     * @returns {EngineBuilder}
     */
    login(login) {
        this.initRequiredCreds();
        this.args.requiredCredentials.login = login;
        return this;
    }

    /**
     *
     * @param password  {any}  Exchange Specific Parameter password
     * @returns {EngineBuilder}
     */
    password(password) {
        this.initRequiredCreds();
        this.args.requiredCredentials.password = password;
        return this;
    }

    /**
     *
     * @param twofa  {any}  Exchange Specific Parameter twofa
     * @returns {EngineBuilder}
     */
    twofa(twofa) {
        this.initRequiredCreds();
        this.args.requiredCredentials.twofa = twofa;
        return this;
    }

    /**
     *
     * @param privateKey  {any}  Exchange Specific Parameter privateKey
     * @returns {EngineBuilder}
     */
    privateKey(privateKey) {
        this.initRequiredCreds();
        this.args.requiredCredentials.privateKey = privateKey;
        return this;
    }

    /**
     *
     * @param walletAddress {any} Exchange Specific Parameter walletAddress
     * @returns {EngineBuilder}
     */
    walletAddress(walletAddress) {
        this.initRequiredCreds();
        this.args.requiredCredentials.walletAddress = walletAddress;
        return this;
    }

    /**
     *
     * @param exchangeToken {String} Exchange Specific Parameter walletAddress
     * @returns {EngineBuilder}
     */
    exchangeToken(exchangeToken) {
        this.initRequiredCreds();
        this.args.requiredCredentials.token = exchangeToken;
        return this;
    }

    /**
     *
     * @param requiredCandles {Number} Back Testing Specific Parameter to indicate how many Candles should be
     *                                 retrieved With every poll.
     * @returns {EngineBuilder}
     */
    requiredCandles(requiredCandles) {
        this.validateTypes(requiredCandles, "requiredCandles", "number");
        this.args.requiredCandles = requiredCandles;
        return this;
    }

    /**
     *
     * @param pollRate {Number}  Back Testing Specific Parameter to indicate how many times should poll candles
     *                           from the Exchange
     * @returns {EngineBuilder}
     */
    pollRate(pollRate) {
        this.validateTypes(pollRate, "pollRate", "number");
        this.args.pollRate = pollRate;
        return this;
    }

    /**
     *
     * @param sidePreference  {String}  Strategy Specific Parameter setting the preferred trade direction long|short|biDrectional
     *
     * @returns {EngineBuilder}
     */
    sidePreference(sidePreference) {
        this.validateTypes(sidePreference, "sidePreference", "string");
        this.args.sidePreference = sidePreference;
        return this;
    }

    /**
     *
     * @param extras {any}  Strategy Specific Parameter custom values for Strategies like moving average period's and other data that
     *                      might be important or needed in the Strategy
     * @returns {EngineBuilder}
     */
    strategyExtras(extras) {
        this.args.strategyExtras = extras;
        return this;
    }

    /**
     *
     * @param type {String}  Alerting & Notification Specific Parameter setting the Alert Type to be used: Email|Slack|Telegram
     *                       might be important or needed in the Strategy
     * @returns {EngineBuilder}
     */
    type(type) {
        this.validateTypes(type, "type", "string");
        if(!["email","slack","telegram"].includes(type.toLowerCase())){
            Errors.UnsupportedExchangeOptionError("Invalid Alerting Type supported Types are (Email|Slack|Telegram)")
        }
        this.args.type = type;
        return this;
    }

    /***
     *
     * @param token {String}   Alerting & Notification Specific Parameter setting the API token needed to call dedicated API's
     *                         responsible to send out the Notification
     * @returns {EngineBuilder}
     */
    notificationToken(token) {
        this.validateTypes(token, "token", "string");
        this.args.token = token;
        return this;
    }

    /**
     *
     * @param chatId {String}  Alerting & Notification Telegram specific Parameter optional but useful if you forgot to sync
     *                         your phone after you started or restarted or a Bot.
     *                         Please check our Documentation on Alerting & Notification.
     * @returns {EngineBuilder}
     */
    telegramChatId(chatId){ 
        this.validateTypes(chatId, "chatId", "string");
        this.args.chatId = chatId; return this;
    }

    /**
     *
     * @param from {String}  Alerting & Notification Email Specific Parameter to identify who send the email!
     * @returns {EngineBuilder}
     */
    emailFrom(from){ 
        this.validateTypes(from, "from", "string");
        this.args.from = from; 
        return this;
    }

    /**
     *
     * @param to {String}  Alerting & Notification Email Specific Parameter to identify where the email should be send to!
     *
     * @returns {EngineBuilder}
     */
    emailTo(to){
        this.validateTypes(to, "to", "string");
        this.args.to = to; 
        return this
    }

    /**
     *
     * @param alertExtras {any}  Alerting & Notification Specific Parameter setting custom data for Alerts
     * @returns {EngineBuilder}
     */
    alertExtras(alertExtras) {
        this.args.alertExtras = alertExtras;
        return this;
    }

    /**
     *
     * @returns {BitFox} Returns a Configured BitFoxEngine instance ready to integrate into your applications!
     */
    build() {
        return BitFox.init(this.args);
    }


    /**

     * @returns {engineOptions}  returns the argument object to initialize BitFox Engines
     */
    getConfig(){return this.args}
}

/**
 * Class BitFox
 *
 * This Class is main entry for any BitFox implementation
 * For proper usage and examples please visit: https://benjamin-keil-crypto-worx.github.io/bitfox-wiki/#/
 *
 */
class BitFox extends Service {

    /**
     *
     * @param {engineOptions} args options or argument object to instantiate a BitFoxEngine we provide a easy-to-use Builder Interface
     *                   please visit: https://benjamin-keil-crypto-worx.github.io/bitfox-wiki/#/ for more info
     * @returns {BitFox} BitFox engine instance
     */
    static init(args) {
       return new BitFox(args)
    }

    /**
     *
     * @returns {Array<String>} Array of Available Symbols
     */
    static getExchanges(){
        return Service.exchanges()
    }

    /**
     * @param args {engineOptions} Validates a set of arguments for Strategies This method is not yet fully supported
     * @returns {boolean}
     */
    static validateStrategyArgs(args){

        return args.hasOwnProperty('amount')
            && args.hasOwnProperty('profitPct')
            && ( args.hasOwnProperty('strategy') || args.hasOwnProperty('alert'))
            && args.hasOwnProperty('exchange')
            && args.hasOwnProperty('symbol')
            && args.hasOwnProperty('key')
            && args.hasOwnProperty('secret')
    }

    /**
     * @param args {engineOptions} Validates a set of arguments for Alerting This method is not yet fully supported
     * @returns {boolean}
     */
    static validateAlertArgs(args){

        return args.hasOwnProperty('token')
            && args.hasOwnProperty('type')
            && args.hasOwnProperty('exchange')
            && args.hasOwnProperty('symbol')
    }

    /**
     *
     * @param args {engineOptions}  Initializes and sets field and objects for a BitFoxEngine
     */
    constructor(args) {
        super(args);
        this.notifyOnly = args.notifyOnly || false
        this.interval = args.interval || 30;
        this.alertOnly = args.alertOnly || false;
        this.symbol = args.symbol;
        this.params = args
        this.currentSide = null;
        this.timeframe = args.timeframe || '4h';
        this.amount = args.amount;
        this.takeProfitPct = args.profitPct;
        this.stopLossTarget = args.stopLossPct || 0;
        this.useLimitOrder = args.useLimitOrder || false;
        this.backtest = args.backtest || false;
        this.params["public"]  = args.backtest || args.public || false;

        this.executeTradeOperations = true;
        this.availableBalance = null;
        this.foxStrategy = null;
        this.notify = false;
        this.state = null;
        this.backtestEngine =null;
        this.isStrategy = false;
        this.strategySetupRequired = true;
        this.runAsProcess = false;
        if(args.notificationToken) {
            this.alerter = new Alert(args);
            this.notify = true;
        }
        this.mockExchange = (!args.life) ? MockService.getService(args) : null;
        this.eventHandler = EventHandler.getEventHandler();
    }

    /**
     *
     * @returns {Promise<void>} Sets up the Exchange client and loads market Structures
     */
    async setupAndLoadClient(){
        if(!BitFox.getExchanges().includes(this.params.exchangeName)){
            Errors.ExchangeInitializationError(`Exchange ${this.params.exchangeName} Is not Supported`)
        }
        await this.setUpClient(this.params.exchangeName, this.params);
    }

    /**
     *
     * @returns {EventHandler} A getter to access the BitFox EventHandler instance
     */
    getEventEmitter(){ return this.eventHandler}

    /**
     *
     * @param args  Initializes the Back Testing engine with arguments provided during instantiation of a BitFoxEngine
     */
    setTestEngine(args) {
        this.backtestEngine = (this.backtest) ? BackTestEngine.getBackTester(this.foxStrategy,args) : null;
    }


    /**
     *
     * @returns {Strategy} Return the current configured Strategy instance inside the BitFox Engine
     */
    getStrategy() {
        return this.foxStrategy;
    }

    /**
     *
     * @returns {BitFox} toggle trade operations  Off if you set this to true the Engine will not execute its internal logic for Trade operations!
     */
    turnOffTradeOperations(){
        this.executeTradeOperations =false;
        return this;
    }

    /**
     *
     * @returns {BitFox} toggle trade operations  Off if you set this to true the Engine will not execute its internal logic for Trade operations!
     */
    turnOnTradeOperations(){
        this.executeTradeOperations =true;
        return this;
    }

    /**
     *
     * @returns {BitFox} toggle Notifications  Onn if you set this to true the Engine will send out Notifications!
     */
    notificationOn(){
        this.notify =true;
        return this;
    }

    /**
     *
     * @returns {BitFox} toggle Notifications  Off if you set this to true the Engine will not send out Notifications!
     */
    notificationOff(){
        this.notify =false;
        return this;
    }

    /**
     *
     * @param strategy {Strategy} Apply a Target Strategy for the Engine
     */
    applyStrategy(strategy) {
        this.foxStrategy = strategy.init(this.params);
        this.backtest ? this.setTestEngine(this.params) : null;
        this.isStrategy = true;
    }


    /**
     *
     * @param {ProcessManager} processManager The Process Manager
     */
    setAsProcess(processManager){
        processManager.setProcessTask(this)
        this.runAsProcess  = true;
        processManager.scheduleProcess();
    }

    /**
     *
     * @param args {engineOptions} Apply a Notification and/or Alerting context for the Engine
     */
    setAlert(args) {
        // let Alert = require(`${this.foxAlertTarget}`).voxAlert;
        // this.voxAlert = Alert.init(args);
    }

    /**
     *
     * @returns {Promise<void>} Engines Run method, this method is processing Strategy, Alert, Back-testing logic in
     *                          Intervals when the Engine is providing internal logging and Event Listeners so that users can react
     *                          to internal logical processes and events.
     */

    async run() {
        // optional assign a local variable to access this class in another scope
        const me = this;
        this.markets = await me.client.markets;
        this.applySymbol(me);
        let klineCandles = null;

        if (this.backtest) {
            await this.runBackTest(klineCandles);
        } else {
            if(this.runAsProcess){
                let me = this;
                klineCandles = await me.runExecutionContext(klineCandles);
            }else{
                setInterval(async () => {
                    let me = this;
                    klineCandles = await me.runExecutionContext(klineCandles);
                }, Number(me.interval) * 1000);
            }

        }
    }

    /**
     * 
     * @param {string} serverUrl - Server Address default is localhost  
     * @param {*} serverPort  -  Server port Default is 8080 
     */
    async startServer(serverUrl =null, serverPort =null){
      
        let apiKey = Server.createApiKey();
        let server = Server.getNode({
            server:serverUrl,
            port:serverPort,
            xApiKey:apiKey,
            credentials:this.requiredCredentials
        });
        await server.run(apiKey);
    }

    /**
     * 
     * @param {Array<Array<Number>>} klineCandles Historical Candle Stick Data
     * @returns {Array<Array<Number>>} klineCandles Historical Candle Stick Data
     */
    async runExecutionContext(klineCandles) {
        if(!this.has("fetchOHLCV")){
            Errors.UnsupportedExchangeOptionError(`Unsupported Operation fetchOHLCV ${this.exchangeName} does not support Historical Candle Data`)
        }
        let me = this;
        let ticker = null;
        if (this.strategySetupRequired) {
            klineCandles = await this.fetchOHLCV(this.symbol, this.timeframe);
            ticker = await me.fetchTicker(me.symbol);
            await me.foxStrategy.setup(klineCandles)
        } else {
            ticker = {last: 0}
        }

        let result = await me.foxStrategy.run(0, false, ticker.last);
        let takeProfitTarget = "N/A";
        let tickerdata = null;
        if(result.state === State.STATE_AWAIT_TAKE_PROFIT){
            tickerdata = {previousClose:ticker.previousClose,last:ticker.last,timestamp:ticker.timestamp,averagePrice:ticker.average, };
            takeProfitTarget = (me.currentSide==="short") ? me.foxStrategy.calculateShortProfitTarget(me.sellOrder.price, me.takeProfitPct) : me.foxStrategy.calculateLongProfitTarget(me.buyOrder.price, me.takeProfitPct)
        }
       
        let info =  {ticker:tickerdata,currentSide:me.currentSide,takeProfitTarget:takeProfitTarget};
        me.eventHandler.fireEvent("onStrategyResponse", {result:result, info:info});

        if (result && result.state === State.STATE_CONTEXT_INDEPENDENT) {
            this.strategySetupRequired = false;
            await me.foxStrategy.run(0, false, ticker.last);
        }
        if (result && [State.STATE_ENTER_SHORT, State.STATE_ENTER_LONG].includes(result.state)) {
            try {
                if (me.notify && me.alerter !== null) {
                    await me.alerter.notify(me.params, `BitFox Strategy Alert ${me.params.symbol} \n State:${result.state} Context: ${result.context || "Strategy"}`)
                }
            } catch (error) {
                Log.error(error);
                me.eventHandler.fireEvent("onError", error);
            }
        }
        if (!me.notifyOnly) {
            await this.executeStrategyContext(result, me)
        }
        return klineCandles;
    }

    /**
     *
     * @param me {BitFox} Iterates over market Structures and identifies the current Market Symbol to be used in execution context!
     */
    applySymbol(me) {
        let isValidSymbol = false;
        Object.keys(me.markets).forEach(market => {
            if (me.markets[market].id === me.symbol) {
                me.symbol = me.markets[market].symbol;
                isValidSymbol = true;
            }
        })
        if(!isValidSymbol){
            Errors.UnsupportedExchangeOptionError(`Invalid Symbol, ${me.symbol} not found on Target Exchange ${me.params.exchangeName}`);
        }
    }

    /**
     *
     * @param result {{state:any, timestamp:date, custom:any, context:String}} The Response object returned from a Strategy
     * @param me {BitFox} current BitFox instance
     * @returns {Promise<void>}  Processes the Strategy Response by evaluating the returned State of the Strategy
     */
    async executeStrategyContext(result, me) {
        switch (result.state) {
            case State.STATE_ENTER_LONG : {
                await this.enterLong(me);
            }
                break;
            case State.STATE_ENTER_SHORT: {
                await this.enterShort(me);
            }
                break;
            case State.STATE_TAKE_PROFIT: {
                me.foxStrategy.setState(State.STATE_PENDING);
            }
                break;
            case State.STATE_STOP_LOSS_TRIGGERED: {
                let ticker = await me.fetchTicker(me.symbol);
                if (me.currentSide === 'sell') {
                    await this.stopLossShort(ticker, me, null);
                } else {
                    await this.stopLossLong(ticker, me, null)
                }
            }
                break;
            case State.STATE_AWAIT_TAKE_PROFIT: {
                let ticker = await me.fetchTicker(me.symbol);
                if (me.currentSide === 'sell') {
                    await this.checkIsShortInProfit(ticker, me);
                } else {
                    await this.checkIsLongInProfit(ticker, me)
                }
            }
                break;
            case State.STATE_AWAIT_ORDER_FILLED: {
                await this.checkIsOrderFilled(me);
            }
                break;
        }
    }

    /**
     *
     * @param klineCandles {Array<number>} The timestamped opening, low, high, close and volume candles
     * @returns {Promise<void>} Executes a Backtest Process if the the engine is configured to run a Backtest
     */
    async runBackTest(klineCandles) {
        let options = {
            exchangeName: this.params.exchangeName,
            symbol: this.symbol,
            requiredCandles: 200,
            pollRate: this.params.pollRate || 1000,
            timeframe: this.timeframe,
            verbose: true
        }

        let dataLoader = DataLoaderEngine.getInstance(options);
        await dataLoader.setUpClient({
            public: true,
            options: {'defaultType': 'spot', 'adjustForTimeDifference': true, 'recvwindow': 7000}
        });
        klineCandles = await dataLoader.load();
        await this.backtestEngine.backTest(klineCandles);
    }

    /**
     *
     * @param me {BitFox} the current BitFox instance
     * @returns {Promise<void>} Starts the Take Profit flow by executing a market order
     */
    async takeProfit(me) {
        let ticker = await me.fetchTicker(me.symbol);
        let oB = await me.fetchOrderBook(me.symbol, 20, {})
        if (me.currentSide === 'sell') {
            await this.takeProfitShort(ticker, me, oB);
        } else {
            await this.takeProfitLong(ticker, me, oB);
        }
    }

    /**
     *
     * @param me {BitFox} the current BitFox instance
     * @returns {Promise<void>} Checks if a Limit Sell Order has been filled i.e. if its status has changed to 'closed'
     */
    async checkIsOrderFilled(me) {
        if(!this.useLimitOrder){
            me.foxStrategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
            return
        }

        let ticker = await me.fetchTicker(me.symbol);
        let order = null;
        if (me.currentSide === 'sell') {
            order = me.sellOrder;
        } else {
            order = me.buyOrder
        }
        let currOrder = (this.life) ? await me.getFilledOrder(order.id, me.symbol, ticker.last) : await me.mockExchange.getFilledOrder(order.id, me.symbol, ticker.last);
        if (currOrder.status === 'closed') {
            me.foxStrategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
            me.eventHandler.fireEvent("onOrderFilled", {timestamp:new Date().getTime(), order:currOrder});
        }
        if(['canceled', 'expired', 'rejected'].includes(currOrder.status)){
            me.foxStrategy.setState(State.STATE_PENDING);
        }
    }

    /**
     *
     * @param {ticker} ticker a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @returns {Promise<void>} Checks if a current Short position or Trade is in profit.
     */
    async checkIsShortInProfit(ticker, me) {
        if (ticker.last <= me.foxStrategy.calculateShortProfitTarget(me.sellOrder.price, me.takeProfitPct)) {
            await this.takeProfit(me);
            me.foxStrategy.setState(State.STATE_TAKE_PROFIT);
        }
    }

    /**
     *
     * @param {ticker} ticker a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @returns {Promise<void>} Checks if a current Long position or Trade is in profit.
     */
    async checkIsLongInProfit(ticker, me) {
        if (ticker.last >= me.foxStrategy.calculateLongProfitTarget(me.buyOrder.price, me.takeProfitPct)) {
            await this.takeProfit(me);
            me.foxStrategy.setState(State.STATE_TAKE_PROFIT);
        }
    }

    /**
     *
     * @param {ticker} ticker a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @param {order} oB  a order instance fetched from ccxt lib see ccxt documentation for object structure
     * @returns {Promise<void>} executes a stop loss order for a long position.
     */
    async stopLossLong(ticker, me, oB) {
        me.amount = me.buyOrder.amount;
        me.funds = (ticker.last * me.buyOrder.amount)
        let order = (me.life) ? await me.marketSellOrder(me.symbol, me.amount, {}) :  await me.mockExchange.marketBuyOrder((me.symbol, me.amount, {}));
        me.eventHandler.fireEvent("onStopLossTriggered", {timestamp:new Date().getTime(), entryOrder:me.buyOrder, exitOrder:order});
    }

    /**
     *
     * @param {ticker} ticker a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @param {order} oB a order instance fetched from ccxt lib see ccxt documentation for object structure
     * @returns {Promise<void>} executes a stop loss order for a short position.
     */
    async stopLossShort(ticker, me, oB) {
        me.funds = ticker.last * me.amount;
        me.amount = me.funds / ticker.last;
        let order = (me.life) ?  await me.marketBuyOrder(me.symbol, me.amount, {}) : await me.mockExchange.marketBuyOrder((me.symbol, me.amount, {}));
        me.eventHandler.fireEvent("onStopLossTriggered", {timestamp:new Date().getTime(), entryOrder:me.sellOrder, exitOrder:order});

    }

    /**
     *
     * @param {ticker} ticker a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @param {order} oB a order instance fetched from ccxt lib see ccxt documentation for object structure
     * @returns {Promise<void>} Executes a sell order for long that has reached its maturity.
     */
    async takeProfitLong(ticker, me, oB) {
        me.amount = me.buyOrder.amount;
        me.funds = ticker.last * me.buyOrder.amount
        let order = (me.life) ?  await  me.marketSellOrder(me.symbol, me.amount, {}) : await me.mockExchange.marketSellOrder((me.symbol, me.amount, {}));
        me.eventHandler.fireEvent("onTradeComplete", {timestamp:new Date().getTime(), entryOrder:me.buyOrder, exitOrder:order});
    }

    /**
     *
     * @param {ticker} ticker a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @param {order} oB a order instance fetched from ccxt lib see ccxt documentation for object structure
     * @returns {Promise<void>} Executes a sell order for long that has reached its maturity.
     */
    async takeProfitShort(ticker, me, oB) {
        me.funds = ticker.last * me.amount;
        me.amount = me.funds / ticker.last;
        let order = (me.life) ?  await me.marketBuyOrder(me.symbol, me.amount, {}) : await me.mockExchange.marketBuyOrder((me.symbol, me.amount, {}));
        me.eventHandler.fireEvent("onTradeComplete", {timestamp:new Date().getTime(), entryOrder:me.sellOrder, exitOrder:order});
    }

    /**
     *
     * @param me {BitFox}
     * @returns {Promise<void>} places a Sell order to enter a short trade/position
     */
    async enterShort(me) {
        let oB = await me.fetchOrderBook(me.symbol, 20, {})
        const askPrice = oB.asks[2][0];
        let orderCall = (me.useLimitOrder) ? "limitSellOrder" : "marketSellOrder"
        me.sellOrder = (me.life) ? await me[[orderCall]](me.symbol, me.amount, askPrice, {}) : await me.mockExchange[orderCall](me.symbol, me.amount, askPrice, {});
        me.currentSide = 'sell';
        me.foxStrategy.setState(State.STATE_AWAIT_ORDER_FILLED);
        me.eventHandler.fireEvent("onOrderPlaced", {timestamp:new Date().getTime(), order:me.buyOrder});
    }

    /**
     *
     * @param me {BitFox}
     * @returns {Promise<void>} places a Sell order to enter a long trade/position
     */
    async enterLong(me) {
        let oB = await me.fetchOrderBook(me.symbol, 20, {})
        const bidPrice = oB.bids[2][0];
        let orderCall = (me.useLimitOrder) ? "limitBuyOrder" : "marketBuyOrder"
        me.buyOrder = (me.life) ? await  me[orderCall](me.symbol, me.amount, bidPrice, {}) : await me.mockExchange[orderCall](me.symbol, me.amount, bidPrice, {});
        me.currentSide = 'buy';
        me.foxStrategy.setState(State.STATE_AWAIT_ORDER_FILLED);
        me.eventHandler.fireEvent("onOrderPlaced", {timestamp:new Date().getTime(), order:me.buyOrder});

    }

    /**
     *
     * @param event {String} The Name of the Event that was triggered
     * @param callback {function} The Callback to execute when this event is triggered
     * @param eventArgs {any} additional data supplied in the event
     */
    on(event, callback, eventArgs=null) {
        this.eventHandler.on(event, callback, eventArgs=null);
    }

    /**
     *
     * @returns {requiredCredentials} requiredCredentials object to help with identifying what Credentials need to supplied for an exchange!
     */
    getRequiredCredentials(){ return this.requiredCredentials()}


    /**
     *
     * @returns {timeframes} A instance with valid timeframe strings for an exchange!
     */
    getTimeFrames(){ return this.timeFrames()}

    /**
     *
     * @returns {Number} The Timout for HTTP request on target exchange
     */
    getTimeout(){ return this.timeout() }

    /**
     *
     * @returns {number} The rate limit set for API call's set by target Exchange
     */
    getRateLimit(){ return this.rateLimit() }

    /**
     *
     * @returns {marketStructure}  the Market Structures on target Exchange
     */
    getMarkets(){return this.markets()}

    /**
     *
     * @returns {symbols} The Symbols available on the Target exchange
     */
    getSymbols(){return this.symbols()}

    /**
     *
     * @returns {currency} The available currencies on the target exchange
     */
    getCurrencies(){return this.currencies()}
}

module.exports = {
    BitFoxEngine: BitFox,
    ExchangeService:Service,
    MockService:MockService,
    ProcessManager:ProcessManager,
    Strategy:Strategy,
    SuperTrend:SuperTrend,
    RSITrend:RSITrend,
    MfiMacd:MfiMacd,
    EmaTrend:EmaTrend,
    Bollinger:Bollinger,
    SmartAccumulate:SmartAccumulate,
    MarketMaker:MarketMaker,
    SimplePriceAlert:SimplePriceAlert,
    ThorsHammer:ThorsHammer,
    ZemaCrossOver:ZemaCrossOver,
    utils:utils,
    getModels:getModels,
    DataLoaderBuilder:DataLoaderBuilder,
    builder:EngineBuilder.builder,
    Client:Client
}
