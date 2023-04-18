// import bit fox
let {Strategy} = require("./Strategy");

/**
 * Class ThorsHammer
 *
 <pre>
 This class is an example class and shows hot Strategies can be created using common Candle Stick Patterns
 The Strategy enters Long Positions by first confirming an uptrend when the trend is determined as a downtrend
 the strategy checks if a Bullish Hammer pattern can be detected if such a pattern is detected a long entry is signalled

 The Strategy enters Short Positions by first confirming a uptrend, when the trend is determined as a uptrend
 the strategy checks if a Bearish Hammer pattern can be detected if such a pattern is detected a short entry is signalled
 </pre>
 */
class ThorsHammer extends Strategy {

    /**
     * @typedef {Object} thorsHammerExtras Engine configuration options
     * @property {Number} periodFast Strategy property, the fast period to use for moving average
     * @property {Number} periodSlow Strategy property,  the slow period to use for moving average
     *
     */

    /**
     * @typedef {Object} thorsHammerConfig Strategy configuration options
     * @property {number} sidePreference Strategy property, the trading preference long|short/biDirectional
     * @property {thorsHammerExtras} strategyExtras Strategy property, strategy specific arguments for custom implementations
     */

    static EMA= Strategy.INDICATORS.EMAIndicator.className;

    /**
     *
     * @param args {thorsHammerConfig} - the strategies configuration parameters
     * @return {SmartAccumulate}
     */
    static init(args){
        return new ThorsHammer( args);
    }


    /**
     *
     * @param args {thorsHammerConfig} - the strategies configuration parameters
     */
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

    /**
     *
     * @param {Array<Number>} o the opening candles
     * @param {Array<Number>} h the higher highs
     * @param {Array<Number>} l the lower lows
     * @param {Array<Number>} c the closing candles
     * @return {Boolean} flag indicating if a bearish hammer pattern was detected
     */
    isBearishHammer(o,h,l,c){
        return  Strategy.INDICATORS.PatternRecognitionIndicator.BearishHammer(o,h,l,c)
    }

    /**
     *
     * @param {Array<Number>} o the opening candles
     * @param {Array<Number>} h the higher highs
     * @param {Array<Number>} l the lower lows
     * @param {Array<Number>} c the closing candles
     * @return {Boolean} flag indicating if a bullish hammer pattern was detected
     */
    isBullishHammer(o,h,l,c){
        return  Strategy.INDICATORS.PatternRecognitionIndicator.BullishHammer(o,h,l,c)
    }

    /**
     *
     * @param state {String}  The Current State of the Strategy execution
     */
    setState(state){ this.state = state; }

    /**
     *
     * @return {String} The Current State of the Strategy execution
     */
    getState(){ return this.state}

    /**
     *
     * @param klineCandles {Array<Array<Number>>} Sets up the Strategy with Indicator Data and Historical Candle data
     */
    async setup(klineCandles){
        this.setIndicator(klineCandles,{period:this.periodFast},ThorsHammer.EMA);
        this.emaFast = this.getIndicator()
        this.setIndicator(klineCandles,{period:this.periodSlow},ThorsHammer.EMA);
        this.emaSlow = this.getIndicator();
        return this;
    }

    /**
     *
     * @param {number} slowEma - current fast ema
     * @param {number} fastEma - curren slow ema
     */
    getTrendDirection(slowEma, fastEma){
        this.currentTrend = fastEma>slowEma ? this.states.STATE_TREND_UP : (fastEma<slowEma) ? this.states.STATE_TREND_DOWN : this.state.STATE_PENDING;
    }

    /**
     *
     * @param event {String} The Event Name
     * @param data {any} some arbitrary data to attach to the event
     */
    fireEvent(event,data){
        this.eventHandler?.fireEvent(event,data);
    }

    /**
     *
     * @return {Array<any>} returns an Indicator Data Array
     */
    getIndicator(){return super.getIndicator()}

    /**
     *
     * @param {number} _index
     * @param {boolean} isBackTest
     * @param {ticker} ticker
     * @return {Promise<{custom: {}, context: null, state, timestamp: number}>}
     */
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

    /**
     *
     * @param {number} currentPrice - the current price
     * @param _index
     * @param isBackTest
     * @return {{enterLong: boolean, enterShort: boolean}|{enterLong: (Boolean|boolean), enterShort: (Boolean|boolean)}}
     */
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

/**
 *
 * @type {{ThorsHammer: ThorsHammer}}
 */
module.exports = {ThorsHammer:ThorsHammer}
