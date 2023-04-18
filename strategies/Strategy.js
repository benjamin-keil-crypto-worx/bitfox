const {State} = require("../lib/states/States");
const utils = require("../lib/utility/util");
let Indicators = require("../lib/indicators/Indicators")

/**
 * Class Strategy
 *
 * This class is the Base class for all current and future Strategies
 *
 */




/**
 * @typedef {Object} strategyConfiguration Strategy configuration options
 * @property {String} sidePreference Strategy property, the trading preference lon|short/biDirectional
 * @property {any} strategyExtras Strategy property, strategy specific arguments for custom implementations
 *
 *
 */

class Strategy {

    static INDICATORS = Indicators;

    /**
     *
     * @param args {strategyConfiguration} Strategy Specific arguments for set up
     * @constructor
     */
    constructor(args=null){

        this.states=State;
        this.state = this.states.STATE_PENDING;
        this.indicators = Indicators;
        this.indicator = null;
        this.kline =null;
        this.currentPrice =0;
        this.args = args;
        this.custom = args.RSITrend || {};
        this.sidePreference = args.sidePreference || 'biDirectional';
        this.allowLong = true;
        this.allowShort = true;
        this.context = null;
    }

    /**
     *
     * @param context {String} sets the current context of the Strategy
     */
    setContext(context){
        this.context = context;
    }

    /**
     *
     * @return {{context: any, params: *}} Returns the current context of this Strategy
     */
    getContext(){
        return {context:this.context,params:this.args};
    }

    /**
     *
     * @param state {String } allows setting the State for Strategy from an external context
     */
    setState(state){ this.state = state; }

    /**
     *
     * @param handler {any} an EventHandler instance capable of firing and listening to events
     */
    setEventHandler(handler){
        this.eventHandler = handler;
    }

    /**
     *
     * @param klineCandles {Array<Array<Number>>}
     * @param args {strategyConfiguration} Indicator related custom parameters that you can supply
     * @param target {String} the class name of the Indicator we want to use
     */
    setIndicator(klineCandles, args=null, target){
        let { o,h,l,c,v, buffer } = utils.createIndicatorData(klineCandles)
        this.indicator = Indicators[target].getData(o,h,l,c,v, (args) ? args : this.custom,buffer);
        this.kline = { o,h,l,c,v, buffer };
    }

    /**
     *
     * @return {any} returns an indicator instance with initialized data
      */
    getIndicator(){
        return this.indicator;
    }


    /**
     *
     * @param state {String} the current state of the Strategy
     * @param custom {any} custom parameters that you can add
     * @param context {String} the current context of this Strategy
     * @return {{custom: {}, context: null, state, timestamp: number}}
     */
    getStrategyResult(state, custom={}, context=null){

        return { state:state, timestamp:new Date().getTime(), custom:custom, context:this.context}
    }

    /**
     *
     * @param sellPrice {Number}  the price of the asset
     * @param profitTarget {Number} the target percentage you want to hit to buy the asset back
     * @return {number}  the estimated buyback price
     */
    calculateShortProfitTarget(sellPrice, profitTarget){  return sellPrice-(sellPrice*profitTarget);}

    /**
     *
     * @param buyPrice e {Number}  the price of the asset
     * @param profitTarget {Number} the target percentage you want to hit to sell the asset back
     * @return {number}  the estimated sell back price
     */
    calculateLongProfitTarget(buyPrice, profitTarget){return buyPrice+(buyPrice*profitTarget);}

    /**
     *
     * @param sellPrice {Number}  the price of the asset
     * @param stopTarget {Number} the target percentage for the stop
     * @return {number}  the estimated stop loss price
     */
    calculateShortStopTarget(sellPrice, stopTarget){  return sellPrice+(sellPrice*stopTarget);}

    /**
     *
     * @param buyPrice {Number}  the price of the asset
     * @param stopTarget {Number} the target percentage for the stop
     * @return {number}  the estimated stop loss price
     */
    calculateLongStopTarget(buyPrice, stopTarget){return buyPrice-(buyPrice*stopTarget);}


    /**
     *
     * @param args {strategyConfiguration} an object with Strategy required arguments
     * @param list {Array<String>} a list of keys to verify that the args instance has these keys
     * @return {Boolean}
     */
    hasValidArgs(args,list){
        return utils.validateRequiredArgs(args,list);
    }

    /**
     *
     * @param isBackTest {Boolean} flag to indicate if the current STrategy is called from the BAck Testing Engine
     * @param _index {number} the current index of the BackTest run!
     * @return {number} the last price of the asset
     */
    getApproximateCurrentPrice(isBackTest,_index){
        return this.kline.o[isBackTest ? _index : this.kline.c.length-1];
    }

    /**
     *
     * @param tradeHistory {any} a trade history instance that holds an entry and an exit order
     * @param currentCandle {Array<number>} The current Candle i.e. open, close,high, low data
     * @param amount {number} The amount available in this Strategy context
     * @return {{amount, funds: number}|{amount: number, funds: number}}
     */
    determineUnrealizedBalance(tradeHistory = null, currentCandle, amount, ){
        if(tradeHistory!== null && tradeHistory.entryOrder && tradeHistory.exitOrder){
            if(tradeHistory.entryOrder.side === 'buy'){
                let estimatedFunds = (tradeHistory.entryOrder.amount*tradeHistory.exitOrder.price);
                let estimatedAmount = (estimatedFunds/currentCandle[3]);
                return{funds:estimatedFunds, amount:estimatedAmount }
            }
            else{
                let estimatedEntryFunds = (tradeHistory.entryOrder.amount*tradeHistory.entryOrder.price);
                let estimatedAmount = (estimatedEntryFunds/currentCandle[2]);
                let estimatedFunds = (estimatedAmount*currentCandle[2]);
                return{funds:estimatedFunds, amount:estimatedAmount }
            }
        }
        else{
           return {amount:amount, funds:amount * currentCandle[4]};
        }

    }

    /**
     *
     * @param currentCandle {Array<number>} The current Candle i.e. open, close,high, low data{Array<number>} The current Candle i.e. open, close,high, low data
     * @param amount The amount available in this Strategy context
     * @return {{amount, funds: number}}
     */
    determineEntryBalance(currentCandle, amount ){
            return {amount:amount, funds:amount * currentCandle[4]};
    }

    /**
     *
     * @param msg {String} a message for the user to print out the Strategy usage
     */
    usage( msg){
        console.log(msg);
    }
}

module.exports = {Strategy:Strategy}
