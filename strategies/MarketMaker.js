const {Strategy} = require("./Strategy")

class MarketMaker extends Strategy{

    static init(args) {
        return new MarketMaker(args);
    }

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

    setExchange(exchange) {
        this.exchange = exchange;
    }
    async setup(klineCandles){

    }
    async setUpClient(){
        await this.exchange.setUpClient(this.params.exchangeName,this.params);
        return this;
    }
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

    async handleBaseAccumulationEntryFlow(bidPrice, askPrice) {
        let me = this;
        this.sellOrder = await this.exchange.limitSellOrder(this.symbol, this.amount, askPrice, {});
        this.eventHandler.fireEvent(`on${this.context}`,`Placed Sell Order for:${this.amount} ${this.symbol} @${askPrice.toFixed(4)} Awaiting Order fill to place Buy Order for: ${this.amount} ${this.symbol} @${bidPrice.toFixed(4)}`)
        this.nextOrder.apply = async function(){ return await me.exchange.limitBuyOrder(me.symbol, me.getExitBuyOrderMount(bidPrice), bidPrice, {});}
        this.startTracking.entryFill = true;

    }
    async handleQuoteAccumulationEntryFlow(bidPrice, askPrice) {
        let me = this;
        this.buyOrder = await this.exchange.limitBuyOrder(this.symbol, this.amount, askPrice, {});
        this.eventHandler.fireEvent(`on${this.context}`,`Placed Buy Order for:${this.amount} ${this.symbol} @${bidPrice.toFixed(4)} Awaiting Order fill to Sell Order for: ${this.amount} ${this.symbol} @${askPrice.toFixed(4)}`)
        this.nextOrder.apply = async function(){ return await me.exchange.limitSellOrder(me.symbol, me.amount, askPrice, {});}
        this.startTracking.entryFill = true;
    }

    isQuoteAccumulation(){return this.accumulate === 'quote'}
    isBaseAccumulation(){return this.accumulate === 'base'}


    getExitBuyOrderMount(bidPrice){
        let spend = (this.sellOrder.price * this.sellOrder.amount);
        return spend / bidPrice;
    }
    getExitSellOrderAmount(askPrice){
        let spend = (this.buyOrder.price * this.sellOrder.amount);
        spend / bidPrice; 
    }
    noOrdersPlaced() {
        return this.sellOrder === null && this.buyOrder === null;
    }
}

module.exports = {MarketMaker: MarketMaker}
