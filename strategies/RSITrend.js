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
        let currPrice = this.kline.o[isBackTest ? _index : this.kline.o.length-1];
        let currMa = this.maSlow[isBackTest ? _index : this.maSlow.length-1];
        let currFastMa = this.maFast[isBackTest ? _index : this.maFast.length-1];
        let currRsi = this.RSI[isBackTest ? _index : this.RSI.length - 1];

        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }if(this.state === this.states.STATE_PENDING){

            if(currRsi <=30 && currPrice>=currMa ){
                this.state =  (this.sidePreference === 'long' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_LONG : this.state;
            }
            if(currRsi >=70 && currPrice<=currMa ){
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
