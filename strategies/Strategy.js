const {State} = require("../lib/states/States");
const utils = require("../lib/utility/util");
let Indicators = require("../lib/indicators/Indicators")
class Strategy {

    static INDICATORS = Indicators;
    constructor(args=null){

        this.states=State;
        this.state = this.states.STATE_PENDING;
        this.indicators = Indicators;
        this.indicator = null;
        this.kline =null;
        this.currentPrice =0;
        this.args = args;
        this.custom = args.strategyExtras || {};
        this.sidePreference = args.sidePreference || 'biDirectional';
        this.allowLong = true;
        this.allowShort = true;
        this.context = null;
    }

    setContext(context){
        this.context = context;
    }
    getContext(){
        return {context:this.context,params:this.args};
    }
    setState(state){ this.state = state; }

    setEventHandler(handler){
        this.eventHandler = handler;
    }
    setIndicator(klineCandles, args=null, target){
        let { o,h,l,c,v, buffer } = utils.createIndicatorData(klineCandles)
        this.indicator = Indicators[target].getData(o,h,l,c,v, (args) ? args : this.custom,buffer);
        this.kline = { o,h,l,c,v, buffer };
    }

    getIndicator(){
        return this.indicator;
    }


    getStrategyResult(state, custom={}, context=null){

        return { state:state, timestamp:new Date().getTime(), custom:custom, context:this.context}
    }

    calculateShortProfitTarget(sellPrice, profitTarget){  return sellPrice-(sellPrice*profitTarget);}
    
    calculateLongProfitTarget(buyPrice, profitTarget){return buyPrice+(buyPrice*profitTarget);}

    calculateShortStopTarget(sellPrice, stopTarget){  return sellPrice+(sellPrice*stopTarget);}

    calculateLongStopTarget(buyPrice, stopTarget){return buyPrice-(buyPrice*stopTarget);}


    hasValidArgs(args,list){
        return utils.validateRequiredArgs(args,list);
    }

    getApproximateCurrentPrice(isBackTest,_index){
        return this.kline.o[isBackTest ? _index : this.kline.c.length-1];
    }

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
    determineEntryBalance(currentCandle, amount ){
            return {amount:amount, funds:amount * currentCandle[4]};
    }

    usage( msg){
        console.log(msg);
    }
}

module.exports = {Strategy:Strategy}
