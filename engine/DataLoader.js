let ExchangeService = require("../service/ExchangeService").Service;
const utils = require("../lib/utility/util");
const {Log} = require("../lib/utility/Log");
const {Errors} = require("../errors/Errors");
/**
 * Class Builder
 *
 <pre>
 * The DataLoader.Builder Class is just a helper class that allows you to be more in control of creating DataLoaders
 * By Using interface methods that set dedicated fields on the Engine.
 * This class is accessible through Bitfox exports and can be imported into your code base by typing
 *
 * let {DataLoaderBuilder} = require("bitfox").bitfox
 </pre>
 */

/**
 * @typedef {Object} dataLoaderOptions Dataloader configuration options
 * @property {String} exchangeName Dataloader configuration, the name of the traget exchange to use
 * @property {String} symbol Dataloader configuration, the name of your trading pair i.e. BTCUSDT ETHUSDT etc.
 * @property {String} timeframe Dataloader configuration, the time frame to choose for Historical Data Fetching
 *                          (Exchange dependent and Exchange must support historical Data retrieval)
 * @property {Number} requiredCandles Dataloader configuration, the number of Historical Data Candles to fetch for each iteration
 * @property {Number} pollRate Dataloader configuration, number of time to pull data from exchange
 * @property {Boolean} verbose Dataloader configuration, boolean to indicate if we want verbose logging
 */
class Builder{
    /**
     *
     * @returns {Builder}
     */
    static builder(){return new Builder()}
    constructor(){
        this.args = {};
        this.args.public =true;
    }

    /**
     *
     * @param verbose {Boolean} A Boolean to indicate if the user wants to enable logging for Data Polls
     * @returns {Builder}
     */
    setVerbose(verbose){
        this.args.verbose = verbose || false; 
        return this;
    }

    /**
     *
     * @param storage {String} string representation to indicate whether the user wants to store the retrieved data in one of the
     *                         supported storage options (In the pre-release version < 1 this is not yet supported!)
     *
     * @returns {Builder}
     */
    setStorage(storage='nedb'){
        this.args.storage = 'nedb'; 
        return this;
    };

    /***
     *
     * @param exchangeName {String} The name of the Target Exchange to pull Data From!
     * @returns {Builder}
     */
    setExchangeName(exchangeName){
        this.args.exchangeName = exchangeName;
        return this;
    }

    /**
     *
     * @param symbol {String} The Base/Quote Currency symbol to use for the data poll. example: ADAUSDT| BTCUSDT etc.
     * @returns {Builder}
     */
    setSymbol(symbol){
        this.args.symbol =symbol; 
        return this;
    }

    /**
     *
     * @param requiredCandles {Number} The Number of Candles to fetch with each Data Poll
     * @returns {Builder}
     */
    setRequiredCandles(requiredCandles){
        this.args.requiredCandles = requiredCandles;
        return this;
    }

    /**
     *
     * @param pollRate {Number} The number of times we should ask the Target exchange to give us Historical data for the given symbol!
     * @returns {Builder}
     */
    setPollRate(pollRate){
        this.args.pollRate = pollRate; 
        return this;
    };

    /**
     *
     * @param timeframe {String} The timeframe or candle interval we like to use for the Historical Data Fetch
     * @returns {Builder}
     */
    setTimeFrame(timeframe){
        this.args.timeframe = timeframe;
        return this;
    }

    /**
     *
     * @returns {DataLoader} The instantiated DataLoader instance
     */
    build(){
        return DataLoader.getInstance(this.args);
    }
}

/**
 * Class Data Loader
 *
 * This class is responsible to make API requests to a selected exchange and fetch iteratively Historical Candle Data
 */
class DataLoader{
    /**
     * Static Factory method return a DataBuilder Instance
     * @param args  {dataLoaderOptions} the options or argument object to instantiate a DataLoader we provide a easy-to-use Builder Interface
     * @returns {DataLoader}
     */
    static getInstance(args){ return new DataLoader(args)}

    /**
     * @param args  {dataLoaderOptions} the options or argument object to instantiate a DataLoader we provide a easy-to-use Builder Interface
     * @returns {DataLoader}
     */
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

    /**
     *
     * @param args dataLoaderOptions the options or argument object to instantiate a DataLoader we provide a easy-to-use Builder Interface
     * @returns {Promise<DataLoader>} Sets up the exchange Client and then returns the DataLoader instance
     */
    async setUpClient(args=null){
        await this.exchange.setUpClient( this.exchangeName, args || this.context );
        return this;
    }

    /**
     *
     * @returns {Promise}  This method is responsible to start the polling process and returns the final Historical Candle data
     */
    async load(){
        let dates = [];
        let lastDate = 0;
        let run =true;
        if(!this.exchange.has("fetchOHLCV")){
            Errors.UnsupportedExchangeOptionError(`Unsupported Operation fetchOHLCV ${this.exchangeName} does not support Historical Candle Data`)
        }

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

/**
 *
 * @type {{DataLoaderEngine: DataLoader, dataLoaderEngineBuilder: (function(): Builder)}}
 */
module.exports = {
    DataLoaderEngine:DataLoader,
    DataLoaderBuilder:Builder.builder
}
