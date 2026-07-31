const ccxt = require("ccxt");

class ExchangeService {

    static getService( args ){ return new ExchangeService(args)}

    constructor( args ) {
        this.life = args.life || false;
        this.client = null;
        this.requiredCandles = args.requiredCandles || 5000
        this.maxRetries = args.maxRetries || 3;
    }

    async setUpClient(exchange,args){
        this.client = new ccxt[exchange]();

        const baseOptions = {
            'enableRateLimit': true,
            'adjustForTimeDifference': true,
            'recvWindow': 7000
        };

        if(args.public){
            this.client.options = args.options ? { ...baseOptions, ...args.options } : baseOptions;
            await this.client.loadTimeDifference();
            await this.client.loadMarkets();
            return this;
        }

        Object.keys(args.requiredCredentials).forEach( key => this.client[key] = args.requiredCredentials[key])

        const privateOptions = {
            'defaultType': 'spot',
            'adjustForTimeDifference': true,
            'recvWindow': 7000,
            'createMarketBuyOrderRequiresPrice': true
        };

        this.client.options = args.options ? { ...privateOptions, ...args.options } : privateOptions;

        await this.client.loadTimeDifference();
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
        return new Promise((resolve) => {
            setTimeout(function () {
                resolve(false);
            }, me.rateLimit() || 500)
        })
    }

    has(key){
        return this.client.has[key];
    }

    async getBalance(){
        return await this.client.fetchBalance({});
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

    async marketBuyOrder(symbol, amount, price){
        return await this.client.createOrder(symbol, 'market', 'buy', amount, price);
    }

    async marketSellOrder(symbol, amount, params){
        return await this.client.createMarketSellOrder(symbol, amount, params);
    }

    async fetchOrderBook(symbol, limit, params){
        return await this.client.fetchOrderBook(symbol, limit, params);
    }

    async fetchOHLCV(symbol, timeframe){
        return await this.client.fetchOHLCV(symbol, timeframe, null, this.requiredCandles);
    }

    async fetchOHLCVSince(symbol, timeframe, since){
        return await this.client.fetchOHLCV(symbol, timeframe, since, this.requiredCandles);
    }

    async fetchTicker(symbol){
        return await this.client.fetchTicker(symbol)
    }
}

module.exports = { Service:ExchangeService }
