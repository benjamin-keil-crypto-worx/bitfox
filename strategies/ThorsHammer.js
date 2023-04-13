// import bit fox
let {Strategy} = require("./Strategy");

// retrieve the Base Class instance

class ThorsHammer extends Strategy {

    static EMA= Strategy.INDICATORS.EMAIndicator.className;
    static init(args){
        return new ThorsHammer( args);
    }



    constructor(args) {
        super(args);
        this.emaFast = null;
        this.emaSlow = null;
        this.periodFast = args.strategyExtras && args.strategyExtras.periodFast || 10;
        this.periodSlow = args.strategyExtras && args.strategyExtras.periodSlow || 20;
        this.sidePreference = args.sidePreference || 'long';
        this.currentTrend = this.states.STATE_PENDING;
        this.eventHandler = null;
        this.o =[];
        this.h =[];
        this.l= [];
        this.c= [];
    }

    isBearishHammer(o,h,l,c){
        return  Strategy.INDICATORS.PatternRecognitionIndicator.BearishHammer(o,h,l,c)
    }

    isBullishHammer(o,h,l,c){
        return  Strategy.INDICATORS.PatternRecognitionIndicator.BullishHammer(o,h,l,c)
    }

    // Getter and Setter for the Strategies State object
    setState(state){ this.state = state; }
    getState(){ return this.state}

    // ALWAYS implement this it makes things very easy and helps you focus on whats important..
    // your Strategy Logic.. ah it goes without saying tight? swap YOUR_INDICATOR with the indicator tyou like to use.

    async setup(klineCandles){
        this.setIndicator(klineCandles,{period:this.periodFast},ThorsHammer.EMA);
        this.emaFast = this.getIndicator()
        this.setIndicator(klineCandles,{period:this.periodSlow},ThorsHammer.EMA);
        this.emaSlow = this.getIndicator();
        return this;
    }

    getTrendDirection(slowEma, fastEma){
        this.currentTrend = fastEma>slowEma ? this.states.STATE_TREND_UP : (fastEma<slowEma) ? this.states.STATE_TREND_DOWN : this.state.STATE_PENDING;
    }
    fireEvent(event,data){
        this.eventHandler?.fireEvent(event,data);
    }

    getIndicator(){return super.getIndicator()}


    async run(_index=0, isBackTest=false, ticker=null){
        let currPrice = this.kline.o[isBackTest ? _index : this.kline.o.length-1];
        let currSlowEma = this.emaSlow[isBackTest ? _index : this.emaSlow.length-1];
        let currFastEma = this.emaFast[isBackTest ? _index : this.emaFast.length-1];
        this.getTrendDirection(currSlowEma,currFastEma)
        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }if(this.state === this.states.STATE_PENDING){
            let currentPrice = this.getApproximateCurrentPrice(isBackTest,_index);

            let {enterLong,enterShort, triggerStop} = this.checkTheHammer(currentPrice,_index, isBackTest)

            if(enterShort){
                if(this.sidePreference === 'short' || (this.sidePreference === 'biDirectional')){
                    this.state = this.states.STATE_ENTER_SHORT;
                }
            }
            if(enterLong){
                if(this.sidePreference === 'long' || (this.sidePreference === 'biDirectional')){
                    this.state = this.states.STATE_ENTER_LONG;
                }
            }

            return this.getStrategyResult(this.state,{fast:currFastEma,slow:currSlowEma, currPrice:currPrice});
        }
        return this.getStrategyResult(this.state,{});
    }

    checkTheHammer(currentPrice, _index, isBackTest ){
        if(this.o.length ===  3){

            let data = {
                enterLong: (this.currentTrend === this.states.STATE_TREND_DOWN ) ? this.isBullishHammer(this.o,this.h,this.l,this.c) : false,
                enterShort:(this.currentTrend === this.states.STATE_TREND_UP)  ? this.isBearishHammer(this.o,this.h,this.l,this.c) : false
            }
            this.clearBuffer();
            return data;
        }else{
            this.o.push(this.kline.o[isBackTest ? _index : this.kline.o.length-1]);
            this.h.push(this.kline.h[isBackTest ? _index : this.kline.h.length-1]);
            this.l.push(this.kline.l[isBackTest ? _index : this.kline.l.length-1]);
            this.c.push(this.kline.c[isBackTest ? _index : this.kline.c.length-1]);
        }

        return {
            enterLong: false,
            enterShort:false
        }
    }
    clearBuffer(){
        this.o = [];
        this.h = [];
        this.l = [];
        this.c = [];
    }
}

// Optional export of ths class
module.exports = {ThorsHammer:ThorsHammer}
