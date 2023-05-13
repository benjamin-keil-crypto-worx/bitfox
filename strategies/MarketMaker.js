const {Strategy} = require("./Strategy")

/**
 * Class MarketMaker
 *
 <pre>
 * This class is a simple implementation for a Market Maker Strategy
 *
 * This class is a little Different from all other strategy implementations as it is
 * an independent execution strategy, Independent strategies signal to the BitFox Engine that this strategy does not require
 * the Engine to manage Trade entries and exits it is handled from within the strategy itself.
 *
 * The MarketMaker strategy signal to the BitFox engine that is a independent strategy by always returning
 * this.states.STATE_CONTEXT_INDEPENDENT state back to the calling engine.
 *
 * The MarketMakerStrategy is configured the following way
 *
 * 1. you can set a flag stepThrough this would indicate that you don't want to calculate a spread value
 *    to calculate entry end exit order but would like t step through the order book by a given number and se the values at the order book's index
 * 2. If you don't want to stepThrough the entry and exit orders placed at the spread of the order book
 * 3. The strategy allows you to set the accumulation mode i.e. whether you like to accumulate base or quote currency,
 *    in the case of base accumulation only short orders are prioritised,
 *    a sell order is placed, the strategy waits until the order is filled and only then places the buy-back order
 *    in the case of quote accumulation only long orders are prioritised,
 *    a buy order is placed, the strategy waits until the order is filled and only then places the sell-back order
 *
 *
 </pre>
 */
class MarketMaker extends Strategy{
    /**
     * @typedef {Object} marketMakerExtras Engine configuration options
     * @property {Number} stepThrough Strategy property, flag to indicate whether we should step through the order book
     * @property {Number} steps the index pointing to the bids and asks prices in the order book to place sell/buy order
     * @property {String} accumulate Strategy property, the accumulation preference  base|quote
     * @property {Number} spread Strategy property,  a calculated distance between an ask and bid price

     *
     */

    /**
     * @typedef {Object} marketMakerConfig Strategy configuration options
     * @property {number} sidePreference Strategy property, the trading preference long|short/biDirectional
     * @property {marketMakerExtras} strategyExtras Strategy property, strategy specific arguments for custom implementations
     */
    /**
     *
     * @param args {marketMakerConfig} - Strategy configuration options
     * @return {MarketMaker}
     */
    static init(args) {
        return new MarketMaker(args);
    }

    /**
     *
     * @param args {marketMakerConfig} - Strategy configuration options
     */
    constructor(args) {
        super(args);
        this.setContext("MarketMaker")
        this.stepThrough = this.custom.stepThrough || false;
        this.steps = this.custom.steps || 4;
        this.spread = this.custom.spread ? Number(this.custom.spread) : 0.01
        this.symbol = args.symbol;
        this.amount = args.amount;
        this.accumulate = this.custom.accumulate || 'base'
        this.exchange = null;
        this.params=  args;
        this.startTracking = {entryFill:false,exitFill:false};
        this.buyOrder = null;
        this.sellOrder = null;
        this.nextOrder = {};
    }

    /**
     *
     * @param {ExchangeService} exchange The client to allow us to make API requests to the exchange
     */
    setExchange(exchange) {
        this.exchange = exchange;
    }

    /**
     *
     * @param klineCandles {Array<Array<Number>>} Sets up the Strategy with Indicator Data and Historical Candle data
     */
    async setup(klineCandles){

    }

    /**
     *
     * @return {Promise<MarketMaker>} Sets up the Exchange client and loads the market structure
     */
    async setUpClient(){
        await this.exchange.setUpClient(this.params.exchangeName,this.params);
        return this;
    }

    /**
     *
     * @param {number} _index
     * @param {boolean} isBackTest
     * @param {ticker} ticker
     * @return {Promise<{custom: {}, context: null, state, timestamp: number}>}
     */
    async run(_index=0, isBackTest=false, ticker=null) {
        try{
            const orderBook = await this.exchange.fetchOrderBook(`${this.symbol}`, 25, {});
            // Calculate the midpoint of the order book.
            const midpoint = (orderBook.asks[0][0] + orderBook.bids[0][0]) / 2;

            // Calculate the desired bid and ask prices, taking fees into consideration.
            const bidPrice = !this.stepThrough ? (midpoint * (1 - this.spread / 2)) : orderBook.bids[this.steps-1][0];
            const askPrice = !this.stepThrough ? (midpoint * (1 + this.spread / 2)) : orderBook.asks[this.steps-1][0];

            if (this.noOrdersPlaced()) {
                // Place orders at the calculated bid and ask prices.
                // We don't want the traditional Market maker flow we want a more controlled flow where we can explicitly force direction towards accumulation
                if (this.isBaseAccumulation()){
                    await this.handleBaseAccumulationEntryFlow(bidPrice, askPrice);
                }else{
                    await this.handleQuoteAccumulationEntryFlow(bidPrice,askPrice);
                }
                return this.getStrategyResult(this.states.STATE_CONTEXT_INDEPENDENT, {}, )
            }else{
                // We at least One Order placed now we need track the order Status
                if(this.startTracking.entryFill){
                    let id = this.isBaseAccumulation() ? this.sellOrder.id : this.buyOrder.id;
                    let order = await this.exchange.getFilledOrder(id, this.symbol,orderBook.asks[0][0]);
                    if(order.status === 'closed'){
                        // Send the next order
                        if(this.isBaseAccumulation()){
                            this.buyOrder = await this.nextOrder.apply();
                            this.eventHandler.fireEvent(`on${this.context}`,`Place Exit Buy Order for ${this.symbol} ${this.buyOrder.amount} @${this.buyOrder.price}`)

                        }else{
                            this.sellOrder = await this.nextOrder.apply();
                            this.eventHandler.fireEvent(`on${this.context}`,`Place Exit Sell Order for ${this.symbol} ${this.sellOrder.amount} @${this.sellOrder.price}`)
                        }
                        this.startTracking.entryFill = false;
                        this.startTracking.exitFill = true;
                    }
                    return this.getStrategyResult(this.states.STATE_CONTEXT_INDEPENDENT, {}, )
                }
                if(this.startTracking.exitFill){
                    let id = this.isBaseAccumulation() ? this.buyOrder.id : this.sellOrder.id;
                    let order = await this.exchange.getFilledOrder(id, this.symbol,orderBook.asks[0][0]);
                    if(order.status === 'closed'){
                        this.reset();
                        this.eventHandler.fireEvent(`on${this.context}`,`Strategy Context refreshed`)
                    }
                    return this.getStrategyResult(this.states.STATE_CONTEXT_INDEPENDENT, {}, )
                }

            }
            return this.getStrategyResult(this.states.STATE_CONTEXT_INDEPENDENT, {}, )
        }catch( e ){
            console.log('Error:\n',e)
            return this.getStrategyResult(this.states.STATE_CONTEXT_INDEPENDENT, {}, )
        }
    }

    reset() {
        this.startTracking.exitFill = false;
        this.sellOrder = null;
        this.buyOrder = null;
    }

    /**
     *
     * @param {Number} bidPrice the current identified ask price
     * @param {Number} askPrice the current identified bid price
     * @return {Promise<void>} executes a limit sell order and stores the sell order in the strategy scope,
     *                         creates a callback function to execute a limit buy order soon as the sell order has ben filled
     */
    async handleBaseAccumulationEntryFlow(bidPrice, askPrice) {
        let me = this;
        this.sellOrder = await this.exchange.limitSellOrder(this.symbol, this.amount, askPrice, {});
        this.eventHandler.fireEvent(`on${this.context}`,`Placed Sell Order for:${this.amount} ${this.symbol} @${askPrice.toFixed(4)} Awaiting Order fill to place Buy Order for: ${me.getExitBuyOrderMount(bidPrice)} ${this.symbol} @${bidPrice.toFixed(4)}`)
        this.nextOrder.apply = async function(){ return await me.exchange.limitBuyOrder(me.symbol, me.getExitBuyOrderMount(bidPrice), bidPrice, {});}
        this.startTracking.entryFill = true;

    }

    /**
     *
     * @param {Number} bidPrice the current identified ask price
     * @param {Number} askPrice the current identified bid price
     * @return {Promise<void>} executes a limit buy order and stores the buy order in the strategy scope,
     *                         creates a callback function to execute a limit sell order soon as the buy order has ben filled
     */
    async handleQuoteAccumulationEntryFlow(bidPrice, askPrice) {
        let me = this;
        this.buyOrder = await this.exchange.limitBuyOrder(this.symbol, this.amount, askPrice, {});
        this.eventHandler.fireEvent(`on${this.context}`,`Placed Buy Order for:${this.amount} ${this.symbol} @${bidPrice.toFixed(4)} Awaiting Order fill to Sell Order for: ${this.amount} ${this.symbol} @${askPrice.toFixed(4)}`)
        this.nextOrder.apply = async function(){ return await me.exchange.limitSellOrder(me.symbol, me.amount, askPrice, {});}
        this.startTracking.entryFill = true;
    }

    /**
     *
     * @return {boolean}  helper function to determine if the current accumulation mode is quote currency
     */
    isQuoteAccumulation(){return this.accumulate === 'quote'}

    /**
     *
     * @return {boolean}  helper function to determine if the current accumulation mode is base currency
     */
    isBaseAccumulation(){return this.accumulate === 'base'}

    /**
     *
     * @param bidPrice the current identified bidPrice
     * @return {number} calculates an amount for a buy order
     */

    getExitBuyOrderMount(bidPrice){
        let spend = (this.sellOrder.price * this.sellOrder.amount);
        return spend / bidPrice;
    }

    /**
     *
     * @param askPrice the current identified askPrice
     * @return {number} calculates an amount for a sell order
     */
    getExitSellOrderAmount(askPrice){
        let spend = (this.buyOrder.price * this.sellOrder.amount);
        return spend / askPrice;
    }

    /**
     *
     * @return {boolean} helper function to identify if this strategy has orders cached
     */
    noOrdersPlaced() {
        return this.sellOrder === null && this.buyOrder === null;
    }
}

/**
 *
 * @type {{MarketMaker: MarketMaker}}
 */
module.exports = {MarketMaker: MarketMaker}
