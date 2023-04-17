const {Strategy} = require("./Strategy")

/**
 * Class EmaTrend
 <pre>
 * This class is another simple example on how to write Strategies
 *
 * It uses a relative strength index and 2 exponential average to try and find trade entry positions
 *
 * Below are the conditions for a long and a short trade
 *
 * Long entry conditions
 * 1. The fast moving average must be above the slow moving average
 * 2. The 2 exponential averages should be closely squeezed to trigger a Signal
 * 3. The RSI must be below the provided limit default is 50
 *
 * Short entry conditions
 * 1. The fast moving average must be below the slow moving average
 * 2. The 2 exponential averages should be closely squeezed to trigger a Signal
 * 3. The RSI must be above the provided limit default is 50
 </pre>
 */
class EmaTrend extends Strategy{
    static RSI=Strategy.INDICATORS.RsiIndicator.className;
    static EMA= Strategy.INDICATORS.EMAIndicator.className;
    static ATR = Strategy.INDICATORS.AtrIndicator.className;

    /**
     * @typedef {Object} emaTrendExtras Engine configuration options
     * @property {Number} periodFast Strategy property, the multiplier to use determine trend direction changes
     * @property {Number} periodSlow Strategy property, the fast period to use for moving average
     * @property {Number} periodSlow Strategy property, the slow period to use for moving average
     * @property {Number} squeezeFactor Strategy property,  the squeeze factor or the needed difference between the distance between fast ema and slow ema
     * @property {Number} rsiLimit Strategy property, the rsi required limit for confirmation default is 50
     *
     *
     */

    /**
     * @typedef {Object} emaTrendConfig Strategy configuration options
     * @property {number} sidePreference Strategy property, the trading preference long|short/biDirectional
     * @property {emaTrendExtras} strategyExtras Strategy property, strategy specific arguments for custom implementations
     */

    /**
     *
     * @param args {emaTrendConfig} - The Strategies Parameters
     * @return {EmaTrend}
     */
    static init(args){
        return new EmaTrend( args);
    }

    /**
     *
     * @param args {emaTrendConfig} - The Strategies Parameters
     */
    constructor(args) {
        super(args);
        this.setContext("EmaTrend")

        this.RSI = null;
        this.emaFast = null;
        this.emaSlow = null;
        this.periodFast = args.strategyExtras && args.strategyExtras.periodFast || 10;
        this.periodSlow = args.strategyExtras && args.strategyExtras.periodSlow || 20;
        this.sidePreference = args.sidePreference || 'long';
        this.currentTrend = this.states.STATE_PENDING;
        this.squeezeFactor = args.strategyExtras && args.strategyExtras.squeezeFactor || 1.9;
        this.bounceSlow = true;
    }

    /**
     *
     * @param state Sets the State of the Strategy usually called from within the BiFox Engine
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
        this.setIndicator(klineCandles,{period:14},EmaTrend.RSI);
        this.RSI = this.getIndicator();
        this.setIndicator(klineCandles,{},EmaTrend.ATR);
        this.atr = this.getIndicator();
        this.setIndicator(klineCandles,{period:this.periodFast},EmaTrend.EMA);
        this.emaFast = this.getIndicator()
        this.setIndicator(klineCandles,{period:this.periodSlow},EmaTrend.EMA);
        this.emaSlow = this.getIndicator();
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
        let currSlowEma = this.emaSlow[isBackTest ? _index : this.emaSlow.length-1];
        let currFastEma = this.emaFast[isBackTest ? _index : this.emaFast.length-1];
        let currRsi = this.RSI[isBackTest ? _index : this.RSI.length - 1];
        let currATR  = this.atr[isBackTest ? _index : this.atr.length - 1];
        this.getTrendDirection(currSlowEma,currFastEma)
        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }if(this.state === this.states.STATE_PENDING){
            if(this.currentTrend === this.states.STATE_TREND_UP){
                if(currRsi >=50 && this.calculateDistance(currPrice,currSlowEma,currFastEma,currATR) <= this.squeezeFactor ){
                    this.state =  (this.sidePreference === 'long' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_LONG : this.state;
                }if(currRsi < 50 && this.calculateDistance(currPrice,currSlowEma,currFastEma,currATR) <= this.squeezeFactor ){
                    this.state =  (this.sidePreference === 'short' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_SHORT : this.state;
                }
            }
            if(this.currentTrend === this.states.STATE_TREND_UP){

            }else{
                this.getTrendDirection(currSlowEma,currFastEma)
            }

            return this.getStrategyResult(this.state,{
                rsi:currRsi,
                close:currPrice,
                emaSlow:currSlowEma,
                emaFast:currFastEma
            });
        }
        return this.getStrategyResult(this.state,{
            rsi:currRsi,
            close:currPrice,
            emaSlow:currSlowEma,
            emaFast:currFastEma
        });
    }

    getTrendDirection(slowEma, fastEma){
        this.currentTrend = fastEma>slowEma ? this.states.STATE_TREND_UP : (fastEma<slowEma) ? this.states.STATE_TREND_DOWN : this.state.STATE_PENDING;
    }

    /**
     *
     * @param {number} currPrice  - the current price
     * @param {number} currSlowEma - the current slow moving exponential moving average
     * @param {number} currFastEma - the current fast moving exponential moving average
     * @param {number} currATR - the current Average true range
     * @return {number}  the distance between the ema's over the atr
     */
    calculateDistance(currPrice,currSlowEma,currFastEma,currATR){
        let targetEma = this.bounceSlow ? currSlowEma : currFastEma;
        let distance = currPrice > targetEma ? (currPrice-targetEma) : targetEma - currPrice;
        return distance / currATR;
    }
}

/**
 *
 * @type {{EmaTrend: EmaTrend}}
 */
module.exports = {EmaTrend:EmaTrend}
