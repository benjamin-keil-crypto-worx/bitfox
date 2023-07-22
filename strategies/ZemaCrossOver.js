const {Strategy} = require("./Strategy")

/**
 * Class ZemaCrossOver
 <pre>
 * This class is another simple example on how to write Strategies
 *
 * It uses 2 Zero Lag Exponential Movig averages a fast moving and a  slow moving
 *
 * Below are the conditions for a long and a short trade
 *
 * Long entry conditions
 * 1. The fast moving average must cross above the slow moving average

 *
 * Short entry conditions
 * 1. The fast moving average must cross below the slow moving average

 </pre>
 */
class ZemaCrossOver extends Strategy{
    static ZEMA = Strategy.INDICATORS.ZEMAIndicator.className;

    /**
     * @typedef {Object} zemaTrendExtras Engine configuration options
     * @property {Number} periodFast Strategy property, the slow period to use for moving average
     * @property {Number} periodSlow Strategy property, the fast period to use for moving average
     *
     */

    /**
     * @typedef {Object} zemaTrendConfig Strategy configuration options
     * @property {number} sidePreference Strategy property, the trading preference long|short/biDirectional
     * @property {zemaTrendExtras} strategyExtras Strategy property, strategy specific arguments for custom implementations
     */

    /**
     *
     * @param args {zemaTrendConfig} - The Strategies Parameters
     * @return {ZemaCrossOver}
     */
    static init(args){
        return new ZemaCrossOver( args);
    }

    /**
     *
     * @param args {zemaTrendConfig} - The Strategies Parameters
     */
    constructor(args) {
        super(args);
        this.setContext("ZemaCrossOver")

        this.zemaFast = null;
        this.zemaSlow = null;
        this.periodFast = args.strategyExtras && args.strategyExtras.periodFast || 10;
        this.periodSlow = args.strategyExtras && args.strategyExtras.periodSlow || 20;
        this.sidePreference = args.sidePreference || 'long';
    }

    /**
     *
     * @param state Sets the State of the Strategy usually called from within the BitFox Engine
     */
    setState(state){ this.state = state; }

    /**
     *
     * @return {String} the string representation of the current state in the Strategy
     */
    getState(){ return this.state}

    /**
     *
     * @param klineCandles {Array<Array<Number>>} Sets up the Strategy with Indicator Data and Historical Candle data
     */
    async setup(klineCandles){
        this.setIndicator(klineCandles,{period:this.periodFast},ZemaCrossOver.ZEMA);
        this.zemaFast = this.getIndicator()
        this.setIndicator(klineCandles,{period:this.periodSlow},ZemaCrossOver.ZEMA);
        this.zemaSlow = this.getIndicator();
        return this;
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
        let currSlowZema = this.zemaSlow[isBackTest ? _index : this.zemaSlow.length-1];
        let currFastZema = this.zemaFast[isBackTest ? _index : this.zemaFast.length-1];
        

        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }

        if(this.state === this.states.STATE_PENDING){
            this.getNextCrossDirection(currSlowZema,currFastZema);
        }

        if(this.state === this.states.STATE_AWAIT_CROSS_UP && this.hasCrossed(currSlowZema,currFastZema)){
            if(this.sidePreference === 'long' || (this.sidePreference === 'biDirectional')){
                this.state = this.states.STATE_ENTER_LONG;
            }
        }

        if(this.state === this.states.STATE_AWAIT_CROSS_DOWN && this.hasCrossed(currSlowZema,currFastZema)){
            if(this.sidePreference === 'short' || (this.sidePreference === 'biDirectional')){
                this.state = this.states.STATE_ENTER_SHORT;
            }
        }
        return this.getStrategyResult(this.state,{
            close:currPrice,
            emaSlow:currSlowZema,
            emaFast:currFastZema
        });
    }

    /**
     * Sets the next possible cross over direction up or down
     * @param {number} slowZema - the current slow Zema
     * @param {number} fastZema - the current fast zema
     */
    getNextCrossDirection(slowZema, fastZema){

        if(this.sidePreference === 'biDirectional'){
            this.state = (fastZema < slowZema) ? this.states.STATE_AWAIT_CROSS_DOWN : (fastZema > slowZema) ? this.states.STATE_AWAIT_CROSS_UP  : this.states.STATE_PENDING;
        }
        if(this.sidePreference === 'long'){
            this.state = (fastZema < slowZema) ? this.states.STATE_AWAIT_CROSS_UP : this.states.STATE_PENDING;
        }
        if(this.sidePreference === 'short'){
           this.state =  (fastZema > slowZema) ? this.states.STATE_AWAIT_CROSS_DOWN : this.states.STATE_PENDING;
        }
    }

    /**
     * 
     * @param {number} slowZema - the current slow Zema
     * @param {number} fastZema - the current fast zema
     * @returns {boolean} - flag indicating if a cross over has occured
     */
    
    hasCrossed(slowZema, fastZema){
        if(this.state === this.states.STATE_AWAIT_CROSS_DOWN){
            return fastZema < slowZema;
        }
        if(this.state === this.states.STATE_AWAIT_CROSS_UP){
            if( fastZema > slowZema){
                console.log(`${fastZema}:${slowZema}`)
            }
            return fastZema > slowZema;
        }
        return false;
    }

}

/**
 *
 * @type {{ZemaCrossOver: ZemaCrossOver}}
 */
module.exports = {ZemaCrossOver:ZemaCrossOver}
