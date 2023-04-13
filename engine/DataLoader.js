let ExchangeService = require("../service/ExchangeService").Service;
const utils = require("../lib/utility/util");
const {Log} = require("../lib/utility/Log");

class Builder{
    static builder(){return new Builder()}
    constructor(){
        this.args = {};
        this.args.public =true;
    }
    setVerbose(verbose){
        this.args.verbose = verbose || false; 
        return this;
    }
    setStorage(atorage='nedb'){
        this.args.storage = 'nedb'; 
        return this;
    };
    setExchangeName(exchangeName){
        this.args.exchangeName = exchangeName;
        return this;
    }
    
    setSymbol(symbol){
        this.args.symbol =symbol; 
        return this;
    }
    setRequiredCandles(requiredCandles){
        this.args.requiredCandles = requiredCandles;
        return this;
    }
    setPollRate(pollRate){
        this.args.pollRate = pollRate; 
        return this;
    };
    setTimeFrame(timeframe){
        this.args.timeframe = timeframe;
        return this;
    }
    build(){
        return DataLoader.getInstance(this.args);
    }
}

class DataLoader{
    static getInstance(args){ return new DataLoader(args)}

    constructor(args) {
        this.verbose = args.verbose || false;
        this.storage = 'nedb';
        this.exchangeName = args.exchangeName;
        this.symbol = args.symbol;
        this.requiredCandles = args.requiredCandles;
        this.pollRate = args.pollRate;
        this.cnt = 0;
        this.timeframe = args.timeframe;
        this.candleDate = new Date();
        this.buffer = [];
        this.exchange = ExchangeService.getService(args);
        this.context = args;
    }
    async setUpClient(args=null){
        await this.exchange.setUpClient( this.exchangeName, args || this.context );
        return this;
    }

    async load(){
        let dates = [];
        let lastDate = 0;
        let run =true;

        while (this.cnt < this.pollRate && run ) {
            let setKey = utils.getPreviousCandleDateFromTimeFrame(this.timeframe, this.candleDate).setKey;
            let getKey = utils.getPreviousCandleDateFromTimeFrame(this.timeframe, this.candleDate).getKey;
            let value  = utils.getPreviousCandleDateFromTimeFrame(this.timeframe, this.candleDate).value;
            let limit  = this.requiredCandles;
            let lookBack = (value * limit)+1;

            this.candleDate[setKey](this.candleDate[getKey]() - lookBack);
            const since = this.exchange.parse8601(this.candleDate);
            this.verbose ? Log.debug(` Attemting to fetch  ${this.requiredCandles} since ${new Date(since).toISOString()}`) : false;
            let ohlcv = await this.exchange.fetchOHLCVSince(this.symbol, this.timeframe, since);

            if (ohlcv.length > 1) {
                this.verbose ? Log.debug(` Iteration ${this.cnt} First Candle Date ${new Date(ohlcv[0][0])} Last Candle Date ${new Date(ohlcv[ohlcv.length-1][0])} `) : false;
                this.verbose ? Log.warn(`First Candle Interval ${new Date(ohlcv[0][0]).toISOString()} Second Candle Interval ${new Date(ohlcv[1][0]).toISOString()} `) : false;

                if (ohlcv[0][0] > ohlcv[ohlcv.length - 1][0]) {
                    ohlcv = utils.reverseData(ohlcv);
                    // firstItem  is now the oldest data
                }
                if(lastDate !== ohlcv[ohlcv.length - 1][0] ){
                    dates.push(ohlcv[0][0]);
                    this.candleDate = new Date(ohlcv[0][0]);
                    this.buffer.unshift(...ohlcv);
                    await this.exchange.waitForRateLimit();
                    lastDate = ohlcv[ohlcv.length - 1][0]
                    this.cnt++;
                }else{
                    run =false;
                }
            } else {
                this.cnt = this.pollRate;
            }
            this.verbose ? Log.debug(` Received ${ohlcv.length} Candles  Iteration Count: ${this.cnt} Remaining Polls left: ${this.pollRate - this.cnt} `) : false;
        }
        return this.buffer;
    }
}

module.exports = {
    DataLoaderEngine:DataLoader,
    dataLoaderEngineBuilder:Builder.builder
}
// const testRun = async  () =>{
//     let dataLoader = DataLoader.getInstance({exchange:"bybit",symbol:"ADA/USDT",requiredCandles:200,pollRate:1000,timeframe:"15m", verbose:true});
//     await dataLoader.setUpClient({public:true,options:{'defaultType': 'spot', 'adjustForTimeDifference': true,'recvwindow':7000 }});
//     await dataLoader.load();
// }
//
// testRun();
