const ccxt = require("ccxt");
class ExchangeService {

    static getService( args ){ return new ExchangeService(args)}


    constructor( args ) {
        this.life = args.life || false;
        this.client = null;
        this.requiredCandles = args.requiredCandles || 5000
    }
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

    static exchanges(){
        return ccxt.exchanges
    }

    getContext(){ return this;}
    requiredCredentials(){
        return this.client.requiredCredentials;
    }

    parse8601(date){
        return this.client.parse8601(date.toISOString());
    }

    timeFrames(){
        return this.client.timeframes;
    }

    timeout(){ return this.client.timeout }
    rateLimit(){ return this.client.rateLimit }
    markets(){return this.client.markets}
    symbols(){return this.client.symbols}
    currencies(){return this.client.currencies}

    waitForRateLimit(){
        let me = this;
        return new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve(false);
            }, me.rateLimit() || 500)
        })
    }

    has(key){
        return this.client.has[key];
    }
    async getBalance(){
        return await this.client.fetchBalance ({});
    }
    async getFilledOrder(id,symbol,price) {
        return await this.client.fetchOrder(id, symbol, {});
    }

    async allOrders(symbol){
        return await this.client.fetchClosedOrders(symbol)
    }
    async limitBuyOrder(symbol,amount,orderPrice,params){
        return await this.client.createOrder(symbol,'limit','buy',amount,orderPrice,params);
    }
    async limitSellOrder(symbol,amount,orderPrice,params){
        return await this.client.createOrder(symbol,'limit','sell',amount,orderPrice,params);
    }

    async marketBuyOrder(symbol,amount,params){
        return await this.client.createOrder(symbol,'market','buy',amount,params);
    }

    async marketSellOrder(symbol,amount,params){
        return await this.client.createOrder(symbol,'market','sell',amount,params);
    }

    async fetchOrderBook(symbol, limit,params){
        return await this.client.fetchOrderBook(symbol,limit,params);
    }

    async fetchOHLCV(symbol,timeframe){
        //this.client.parse8601("");
        return await this.client.fetchOHLCV(symbol, timeframe, null, this.requiredCandles);
    }

    async fetchOHLCVSince(symbol,timeframe, since){
        return await this.client.fetchOHLCV(symbol, timeframe, since, this.requiredCandles);
    }

    async fetchTicker( symbol ){
        return await this.client.fetchTicker( symbol)
    }



}

module.exports = { Service:ExchangeService }
