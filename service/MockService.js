let ExchangeService = require("./ExchangeService").Service;
let {Mock} = require("../lib/model/Mock");

const ccxt = require("ccxt");

class MockService {

    static getService(args){
        return new MockService(args);
    }

    constructor(args, exchangeService=null) {
        this.exchange = (exchangeService === null) ? ExchangeService.getService(args) : exchangeService;
        this.mock = Mock.mocker();
    }

    async setUpClient(exchange,args){
        await this.exchange.setUpClient(exchange,args);
        return this;
    }

    exchanges(){
        return ccxt.exchanges
    }

    requiredCredentials(){
        return this.exchange.requiredCredentials;
    }

    timeFrames(){
        return this.exchange.timeFrames;
    }

    timeout(){ return super.timeout() }
    rateLimit(){ return super.rateLimit() }
    markets(){return super.markets() }
    symbols(){return super.symbols() }
    currencies(){return super.currencies() }

    waitForRateLimit(){
       return super.waitForRateLimit()
    }

    has(key){
        return this.exchange.has(key);
    }

    getBalance(quote, base, quoteAmount, baseAmount){
        return this.mock.getBalance(quote, base, quoteAmount, baseAmount)
    }
    getFilledOrder(id,symbol,price) {
        return this.mock.getClosedOrder(id,symbol,price)
    }

    allOrders(symbol){
        return this.mock.getAllOrders(symbol);
    }
    limitBuyOrder(symbol,amount,orderPrice,params){
        return this.mock.buyOrder(symbol,'limit', orderPrice, amount);
    }
    limitSellOrder(symbol,amount,orderPrice,params){
        return this.mock.sellOrder(symbol,'limit', orderPrice, amount);
    }

    marketBuyOrder(symbol,amount,orderPrice,params){
        return  this.mock.buyOrder(symbol,'market', orderPrice, amount);

    }

    getTradeTemplate(currentCandles, order, profitTarget, funds, amount, side){
        return this.mock.getTradeTemplate(currentCandles, order, profitTarget, funds, amount, side)
    }

    marketSellOrder(symbol,amount,orderPrice,params){
        return this.mock.sellOrder(symbol,'market', orderPrice, amount);
    }

    async fetchOrderBook(symbol, limit,params){
        return await this.exchange.fetchOrderBook(symbol,limit,params);
    }

    async fetchOHLCV(symbol,timeframe){
        //this.client.parse8601("");
        return await this.exchange.fetchOHLCV(symbol, timeframe, null, this.candleLimit);
    }

    async fetchOHLCVSince(symbol,timeframe, since){
        return await this.exchange.fetchOHLCV(symbol, timeframe, since, this.candleLimit);
    }

    async fetchTicker( symbol ){
        return await this.exchange.fetchTicker( symbol)
    }
}

module.exports = {Service:MockService}

