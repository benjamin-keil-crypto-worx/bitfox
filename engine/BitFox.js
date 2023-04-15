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
const getModels = require("../lib/model/Model").getModels();



const {MfiMacd} = require("../strategies/MfiMacd");
const utils = require("../lib/utility/util");

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

    /**
     *
     * @param useLimitOrder {Boolean} Engine Specific Parameter if this is set to true the Engine will execute send limit orders
     *                                and wait for them to be fully filled other simple market orders aer made! the Default is false
     * @returns {EngineBuilder}
     */
    useLimitOrder(useLimitOrder) {
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
        this.args.notifyOnly = notifyOnly;
        return this;
    }

    /**
     *
     * @param exchange {String}  Exchange Parameter you need to add this inorder to Identify the Exchange you want to use
     * @return {EngineBuilder}
     */
    exchange(exchange) {
        this.args.exchangeName = exchange;
        return this;
    }

    /**
     *
     * @param interval {Number} Engine Specific Parameter sets the general interval and time to execute Strategy Logic
     * @returns {EngineBuilder}
     */
    interval(interval) {
        this.args.interval = interval;
        return this;
    }

    /**
     *
     * @param symbol {String} Exchange Specific Parameter sets you desired Trading Pair i.e. ADAUSDT|BTCUSDT|ETHUSDT etc.
     * @returns {EngineBuilder}
     */
    symbol(symbol) {
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
        this.args.timeframe = timeframe;
        return this;
    }

    /***
     *
     * @param amount {Number} Exchange & Engine Specific Parameter sets your desired Base amount that is to be used for trades
     * @returns {EngineBuilder}
     */
    amount(amount) {
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
        this.args.fee = fee;
        return this;
    }

    /***
     *
     * @param backtest {Boolean}   Engine  Specific Parameter setting a flag that tells the Engine to back test the Strategy
     * @returns {EngineBuilder}
     */
    backtest(backtest) {
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
    telegramChatId(chatId){ this.args.chatId = chatId; return this;}

    /**
     *
     * @param from {String}  Alerting & Notification Email Specific Parameter to identify who send the email!
     * @returns {EngineBuilder}
     */
    emailFrom(from){ this.args.from = from; return this;}

    /**
     *
     * @param to {String}  Alerting & Notification Email Specific Parameter to identify where the email should be send to!
     *
     * @returns {EngineBuilder}
     */
    emailTo(to){this.args.to = to; return this}

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
     *
     * @returns {any} returns the argument object to initialize BitFox Engines
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
     * @param args {any} the options or argument object to instantiate a BitFoxEngine we provide a easy-to-use Builder Interface
     *                   please visit: https://benjamin-keil-crypto-worx.github.io/bitfox-wiki/#/ for more info
     * @returns {BitFox}
     */
    static init(args) {
       return new BitFox(args)
    }

    /**
     *
     * @returns {String:Array} Array of Available Symbols
     */
    static getExchanges(){
        return Service.exchanges()
    }

    /**
     * @param args {any} Validates a set of arguments for Strategies This method is not yet fully supported
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
     * @param args {any} Validates a set of arguments for Alerting This method is not yet fully supported
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
     * @param args {any} Initializes and sets field and objects for a BitFoxEngine
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
        this.foxStrategyTarget = args.strategy;
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
        if(args.token) {
            this.alerter = new Alert(args);
            this.notify = true;
        }
        this.mockExchange = (!args.life) ? MockService.getService(args, this.getContext()) : null;
        if(this.foxStrategyTarget !== undefined){
            this.setStrategy(args);
            this.setTestEngine(args);
            this.isStrategy = true;
        }else{
            this.setAlert(args);
        }
        this.eventHandler = EventHandler.getEventHandler();
    }

    /**
     *
     * @returns {Promise<void>} Sets up the Exchange client and loads market Structures
     */
    async setupAndLoadClient(){
        await this.setUpClient(this.params.exchangeName, this.params);
    }

    /**
     *
     * @returns {EventHandler} A getter to access the BitFox EventHandler instance
     */
    getEventEmitter(){ return this.eventHandler}

    /**
     *
     * @param args {any} Initializes the Back Testing engine with arguments provided during instantiation of a BitFoxEngine
     */
    setTestEngine(args) {
        this.backtestEngine = (this.backtest) ? BackTestEngine.getBackTester(this.foxStrategy,args) : null;
    }

    /**
     *
     * @param args {any} sets up a Strategy with arguments provided during instantiation of a BitFoxEngine
     */
    setStrategy(args) {
        let Strategy = require(`../strategies/${this.foxStrategyTarget}`).strategy;
        this.foxStrategy = Strategy.init(args);
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
     * @param args {any} Apply a Notification and/or Alerting context for the Engine
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
            setInterval(async () => {
                let me = this;
                let ticker = null;
                if(this.strategySetupRequired){
                    klineCandles = await this.fetchOHLCV(this.symbol, this.timeframe);
                    ticker = await me.fetchTicker(me.symbol);
                    await me.foxStrategy.setup(klineCandles)
                }else{
                    ticker = {last:0}
                }
                
                let result =  await me.foxStrategy.run(0,false,ticker.last);
                me.eventHandler.fireEvent("onStrategyResponse",result);
                if(result && result.state === State.STATE_CONTEXT_INDEPENDENT){
                    this.strategySetupRequired = false;
                    await me.foxStrategy.run(0,false,ticker.last);
                }
                if(result && [State.STATE_ENTER_SHORT,State.STATE_ENTER_LONG].includes(result.state)){
                    try{
                        if(me.notify && me.alerter !== null){ 
                            await me.alerter.notify(me.params,`BitFox Strategy Alert ${me.params.symbol} \n State:${result.state} Context: ${result.context || "Strategy"}`)
                        }
                    }
                   catch(error){
                        Log.error(error);
                        me.eventHandler.fireEvent("onError", error);
                    }
                }
                if(!me.notifyOnly) {await this.executeStrategyContext(result, me)}

            }, Number(me.interval) * 1000);
        }
    }

    /**
     *
     * @param Bitfox Iterates over market Structures and identifies the current Market Symbol to be used in execution context!
     */
    applySymbol(me) {
        Object.keys(me.markets).forEach(market => {
            if (me.markets[market].id === me.symbol) {
                me.symbol = me.markets[market].symbol
            }
        })
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
    }

    /**
     *
     * @param ticker {any} a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @returns {Promise<void>} Checks if a current Short position or Trade is in profit.
     */
    async checkIsShortInProfit(ticker, me) {
        if (ticker.last <= me.State.calculateShortProfitTarget(me.sellOrder.price, me.takeProfitPct)) {
            await this.takeProfit(me);
            me.foxStrategy.setState(State.STATE_TAKE_PROFIT);
        }
    }

    /**
     *
     * @param ticker {any} a ticker instance fetched from ccxt lib see ccxt documentation for object structure
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
     * @param ticker  {any} a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @param oB {any} a order instance fetched from ccxt lib see ccxt documentation for object structure
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
     * @param ticker  {any} a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @param oB {any} a order instance fetched from ccxt lib see ccxt documentation for object structure
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
     * @param ticker  {any} a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @param oB {any} a order instance fetched from ccxt lib see ccxt documentation for object structure
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
     * @param ticker  {any} a ticker instance fetched from ccxt lib see ccxt documentation for object structure
     * @param me {BitFox}
     * @param oB {any} a order instance fetched from ccxt lib see ccxt documentation for object structure
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
        let orderCall = (me.useLimitOrder) ? "limitBuyOrder" : "marketBuyOrder"
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
     * @returns {timeout:Number} The Timout for HTTP request on target exchange
     */
    getTimeout(){ return this.timeout() }

    /**
     *
     * @returns {rateLimit} The rate limit set for API call's set by target Exchange
     */
    getRateLimit(){ return this.rateLimit() }

    /**
     *
     * @returns {markets} the Market Structures on target Exchange
     */
    getMarkets(){return this.markets()}

    /**
     *
     * @returns {symbols} The Symbols available on the Target exchange
     */
    getSymbols(){return this.symbols()}

    /**
     *
     * @returns {currencies} The available currencies on the target exchange
     */
    getCurrencies(){return this.currencies()}
}

module.exports = {
    BitFoxEngine: BitFox,
    ExchangeService:Service,
    MockService:MockService,
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
    utils:utils,
    getModels:getModels,
    DataLoaderBuilder:DataLoaderBuilder,
    builder:EngineBuilder.builder
}
