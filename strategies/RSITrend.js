const {Strategy} = require("./Strategy")

/**
 * Class RSITrend
 *
 * This class is a super simple RSI Strategy implementation
 *
 * It enters long trade positions when the trend is up and the RSI is below given threshold default is 30
 * It enters short trade positions when the trend is down and the RSI above given threshold default is 80
 *
 * The trend direction is determined by checking 2 exponential moving average a fast and a slow moving.
 *
 */
class RSITrend extends Strategy{
    static RSI=Strategy.INDICATORS.RsiIndicator.className;
    static MA= Strategy.INDICATORS.SmaIndicator.className;


    /**
     * @typedef {Object} rsiTrendExtras Engine configuration options
     * @property {Number} fastPeriod Strategy property, the fast period to use for moving average
     * @property {Number} slowPeriod Strategy property,  the slow period to use for moving average
     * @property {Number} rsiPeriod Strategy property, the rsi period
     *
     */

    /**
     * @typedef {Object} rsiTrendConfig Strategy configuration options
     * @property {number} sidePreference Strategy property, the trading preference long|short/biDirectional
     * @property {rsiTrendExtras} strategyExtras Strategy property, strategy specific arguments for custom implementations
     */

    /**
     *
     * @param args {rsiTrendConfig} - The Strategies Parameters
     * @return {RSITrend}
     */
    static init(args){
        return new RSITrend( args);
    }

    /**
     *
     * @param args {rsiTrendConfig} - The Strategies Parameters
     */
    constructor(args) {
        super(args);
        this.setContext("RSITrend")
        this.RSI = null;
        this.maFast = null;
        this.maSlow = null;
        this.sidePreference = args.sidePreference || 'biDirectional';
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
        this.setIndicator(klineCandles,{period:this.custom.rsiPeriod || 14},RSITrend.RSI);
        this.RSI = this.getIndicator()
        this.setIndicator(klineCandles,{period:this.custom.fastPeriod || 20},RSITrend.MA);
        this.maFast = this.getIndicator()
        this.setIndicator(klineCandles,{period:this.custom.slowPeriod || 30},RSITrend.MA);
        this.maSlow = this.getIndicator();

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
        var me = this;
        let currPrice = this.closeAt(_index, isBackTest);
        let currMa = this.valueAt(this.maSlow, _index, isBackTest);
        let currFastMa = this.valueAt(this.maFast, _index, isBackTest);
        let currRsi = this.valueAt(this.RSI, _index, isBackTest);
        if(currPrice == null || currMa == null || currRsi == null){
            return this.getStrategyResult(this.state, {reason: 'warmup'});
        }

        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }if(this.state === this.states.STATE_PENDING){

            // mean reversion: buy oversold dips below the slow MA, sell overbought pops above it.
            // (The previous comparisons were inverted and could never co-occur with correctly
            // aligned data — they only fired due to the stale-index bug fixed in GHBF-34.)
            if(currRsi <=30 && currPrice<=currMa ){
                this.state =  (this.sidePreference === 'long' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_LONG : this.state;
            }
            if(currRsi >=70 && currPrice>=currMa ){
                this.state =  (this.sidePreference === 'short' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_SHORT : this.state;
            }

            return this.getStrategyResult(this.state,{
                rsi:currRsi,
                close:currPrice,
                maSlow:currMa,
                maFast:currFastMa
            });
        }
        return this.getStrategyResult(this.state,{
            rsi:currRsi,
            close:currPrice,
            maSlow:currMa,
            maFast:currFastMa
        });
    }
}

/**
 *
 * @type {{RSITrend: RSITrend}}
 */
module.exports = {RSITrend:RSITrend}
