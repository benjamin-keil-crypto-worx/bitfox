let {Log} = require("../lib/utility/Log")
let {Service} = require("../service/ExchangeService");
let MockService = require("../service/MockService").Service;
let {Alert} = require("../alerting/Alert");
const {State} = require("../lib/states/States");
const {BackTestEngine} = require("./BackTest");
const {DataLoaderEngine} = require("./DataLoader");
const {dataLoaderEngineBuilder} = require("./DataLoader");

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

class EngineBuilder {
    static builder() {
        return new EngineBuilder()
    }

    constructor() {
        this.args = {}
    };

    useLimitOrder(useLimitOrder) {
        this.args.useLimitOrder = useLimitOrder;
        return this;
    }

    notifyOnly(notifyOnly){
        this.args.notifyOnly = notifyOnly;
        return this;
    }
    exchange(exchange) {
        this.args.exchangeName = exchange;
        return this;
    }

    interval(interval) {
        this.args.interval = interval;
        return this;
    }

    symbol(symbol) {
        this.args.symbol = symbol;
        return this;
    }

    timeframe(timeframe) {
        this.args.timeframe = timeframe;
        return this;
    }

    amount(amount) {
        this.args.amount = amount;
        return this;
    };

    profitPct(profitPct) {
        this.args.profitPct = profitPct;
        return this;
    }

    stopLossPct(stopLossPct) {
        this.args.stopLossPct = stopLossPct;
        return this;
    }

    fee(param) {
        this.args.fee = param;
        return this;
    }

    backtest(backtest) {
        this.args.backtest = backtest;
        return this;
    }

    public(_public) {
        this.args.public = _public;
        return this;
    }

    life(life) {
        this.args.life = life;
        return this;
    }

    options(options) {
        this.args.options = options;
        return this;
    }

    key(key) {
        this.initRequiredCreds();
        this.args.requiredCredentials.apiKey = key;
        return this;
    }

    initRequiredCreds() {
        if (!this.args.requiredCredentials) {
            this.args.requiredCredentials = {};
        }
    }

    secret(secret) {
        this.initRequiredCreds();
        this.args.requiredCredentials.secret = secret;
        return this;
    }

    uid(uid) {
        this.initRequiredCreds();
        this.args.requiredCredentials.uid = uid;
        return this;
    }

    login(login) {
        this.initRequiredCreds();
        this.args.requiredCredentials.login = login;
        return this;
    }

    password(password) {
        this.initRequiredCreds();
        this.args.requiredCredentials.password = password;
        return this;
    }

    twofa(twofa) {
        this.initRequiredCreds();
        this.args.requiredCredentials.twofa = twofa;
        return this;
    }

    privateKey(privateKey) {
        this.initRequiredCreds();
        this.args.requiredCredentials.privateKey = privateKey;
        return this;
    }

    walletAddress(walletAddress) {
        this.initRequiredCreds();
        this.args.requiredCredentials.walletAddress = walletAddress;
        return this;
    }

    exchangeToken(exchangeToken) {
        this.initRequiredCreds();
        this.args.requiredCredentials.token = exchangeToken;
        return this;
    }

    requiredCandles(requiredCandles) {
        this.args.requiredCandles = requiredCandles;
        return this;
    }

    pollRate(pollRate) {
        this.args.pollRate = pollRate;
        return this;
    }

    sidePreference(sidePreference) {
        this.args.sidePreference = sidePreference;
        return this;
    }

    strategyExtras(extras) {
        this.args.strategyExtras = extras;
        return this;
    }

    type(type) {
        this.args.type = type;
        return this;
    }

    notificationToken(token) {
        this.args.token = token;
        return this;
    }

    telegramChatId(chatId){ this.args.chatId = chatId; return this;}

    emailFrom(from){ this.args.from = from; return this;}

    emailTo(to){this.args.to = to; return this}

    alertExtras(alertExtras) {
        this.args.alertExtras = alertExtras;
        return this;
    }

    build() {
        return BitFox.init(this.args);
    }

    getConfig(){return this.args}
}

class BitFox extends Service {

    static init(args) {
       return new BitFox(args)
    }

    static getExchanges(){
        return Service.exchanges()
    }
    static validateStrategyArgs(args){

        return args.hasOwnProperty('amount')
            && args.hasOwnProperty('profitPct')
            && ( args.hasOwnProperty('strategy') || args.hasOwnProperty('alert'))
            && args.hasOwnProperty('exchange')
            && args.hasOwnProperty('symbol')
            && args.hasOwnProperty('key')
            && args.hasOwnProperty('secret')
    }

    static validateAlertArgs(args){

        return args.hasOwnProperty('token')
            && args.hasOwnProperty('type')
            && args.hasOwnProperty('exchange')
            && args.hasOwnProperty('symbol')
    }

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

    async setupAndLoadClient(){
        await this.setUpClient(this.params.exchangeName, this.params);
    }

    getEventEmitter(){ return this.eventHandler}

    setTestEngine(args) {
        this.backtestEngine = (this.backtest) ? BackTestEngine.getBackTester(this.foxStrategy,args) : null;
    }

    setStrategy(args) {
        let Strategy = require(`../strategies/${this.foxStrategyTarget}`).strategy;
        this.foxStrategy = Strategy.init(args);
    }

    getStrategy() {
        return this.foxStrategy;
    }

    turnOffTradeOperations(){
        this.executeTradeOperations =false;
        return this;
    }

    turnOnTradeOperations(){
        this.executeTradeOperations =true;
        return this;
    }

    notificationOn(){
        this.notify =true;
        return this;
    }

    notificationOff(){
        this.notify =false;
        return this;
    }

    applyStrategy(strategy) {
        this.foxStrategy = strategy.init(this.params);
        this.backtest ? this.setTestEngine(this.params) : null;
        this.isStrategy = true;
    }

    setAlert(args) {
        // let Alert = require(`${this.foxAlertTarget}`).voxAlert;
        // this.voxAlert = Alert.init(args);
    }

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

    applySymbol(me) {
        Object.keys(me.markets).forEach(market => {
            if (me.markets[market].id === me.symbol) {
                me.symbol = me.markets[market].symbol
            }
        })
    }

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

    async takeProfit(me) {
        let ticker = await me.fetchTicker(me.symbol);
        let oB = await me.fetchOrderBook(me.symbol, 20, {})
        if (me.currentSide === 'sell') {
            await this.takeProfitShort(ticker, me, oB);
        } else {
            await this.takeProfitLong(ticker, me, oB);
        }
    }

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

    async checkIsShortInProfit(ticker, me) {
        if (ticker.last <= me.State.calculateShortProfitTarget(me.sellOrder.price, me.takeProfitPct)) {
            await this.takeProfit(me);
            me.foxStrategy.setState(State.STATE_TAKE_PROFIT);
        }
    }

    async checkIsLongInProfit(ticker, me) {
        if (ticker.last >= me.foxStrategy.calculateLongProfitTarget(me.buyOrder.price, me.takeProfitPct)) {
            await this.takeProfit(me);
            me.foxStrategy.setState(State.STATE_TAKE_PROFIT);
        }
    }

    async stopLossLong(ticker, me, oB) {
        me.amount = me.buyOrder.amount;
        me.funds = (ticker.last * me.buyOrder.amount)
        let order = (me.life) ? await me.marketSellOrder(me.symbol, me.amount, {}) :  await me.mockExchange.marketBuyOrder((me.symbol, me.amount, {}));
        me.eventHandler.fireEvent("onStopLossTriggered", {timestamp:new Date().getTime(), entryOrder:me.buyOrder, exitOrder:order});
    }

    async stopLossShort(ticker, me, oB) {
        me.funds = ticker.last * me.amount;
        me.amount = me.funds / ticker.last;
        let order = (me.life) ?  await me.marketBuyOrder(me.symbol, me.amount, {}) : await me.mockExchange.marketBuyOrder((me.symbol, me.amount, {}));
        me.eventHandler.fireEvent("onStopLossTriggered", {timestamp:new Date().getTime(), entryOrder:me.sellOrder, exitOrder:order});

    }
    async takeProfitLong(ticker, me, oB) {
        me.amount = me.buyOrder.amount;
        me.funds = ticker.last * me.buyOrder.amount
        let order = (me.life) ?  await  me.marketSellOrder(me.symbol, me.amount, {}) : await me.mockExchange.marketSellOrder((me.symbol, me.amount, {}));
        me.eventHandler.fireEvent("onTradeComplete", {timestamp:new Date().getTime(), entryOrder:me.buyOrder, exitOrder:order});
    }

    async takeProfitShort(ticker, me, oB) {
        me.funds = ticker.last * me.amount;
        me.amount = me.funds / ticker.last;
        let order = (me.life) ?  await me.marketBuyOrder(me.symbol, me.amount, {}) : await me.mockExchange.marketBuyOrder((me.symbol, me.amount, {}));
        me.eventHandler.fireEvent("onTradeComplete", {timestamp:new Date().getTime(), entryOrder:me.sellOrder, exitOrder:order});
    }

    async enterShort(me) {
        let oB = await me.fetchOrderBook(me.symbol, 20, {})
        const askPrice = oB.asks[2][0];
        let orderCall = (me.useLimitOrder) ? "limitBuyOrder" : "marketBuyOrder"
        me.sellOrder = (me.life) ? await me[[orderCall]](me.symbol, me.amount, askPrice, {}) : await me.mockExchange[orderCall](me.symbol, me.amount, askPrice, {});
        me.currentSide = 'sell';
        me.foxStrategy.setState(State.STATE_AWAIT_ORDER_FILLED);
        me.eventHandler.fireEvent("onOrderPlaced", {timestamp:new Date().getTime(), order:me.buyOrder});
    }

    async enterLong(me) {
        let oB = await me.fetchOrderBook(me.symbol, 20, {})
        const bidPrice = oB.bids[2][0];
        let orderCall = (me.useLimitOrder) ? "limitBuyOrder" : "marketBuyOrder"
        me.buyOrder = (me.life) ? await  me[orderCall](me.symbol, me.amount, bidPrice, {}) : await me.mockExchange[orderCall](me.symbol, me.amount, bidPrice, {});
        me.currentSide = 'buy';
        me.foxStrategy.setState(State.STATE_AWAIT_ORDER_FILLED);
        me.eventHandler.fireEvent("onOrderPlaced", {timestamp:new Date().getTime(), order:me.buyOrder});

    }

    on(event, callback, eventArgs=null) {
        this.eventHandler.on(event, callback, eventArgs=null);
    }

    getRequiredCredentials(){ return this.requiredCredentials()}
    getTimeFrames(){ return this.timeFrames()}
    getTimeout(){ return this.timeout() }
    getRateLimit(){ return this.rateLimit() }
    getMarkets(){return this.markets()}
    getSymbols(){return this.symbols()}
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
    dataLoaderEngineBuilder:dataLoaderEngineBuilder,
    builder:EngineBuilder.builder
}
