const {Strategy} = require("./Strategy")

/**
 * Class SuperTrend
<pre>>
 * This class is an example class on how one can implement Strategies with BitFox
 * The SuperTrend class signals long entries when the strategy signals a long trend and short entries when
 * strategy signals a short trend
 </pre>
 */




class SuperTrend extends Strategy{
    /**
     * @typedef {Object} superTrendExtras Engine configuration options
     * @property {Number} multiplier Strategy property, the multiplier to use determine trend direction changes
     * @property {Number} period Strategy property, the period to use for moving average
     *
     *
     */

    /**
     * @typedef {Object} superTrendConfig Strategy configuration options
     * @property {number} sidePreference Strategy property, the trading preference lon|short/biDirectional
     * @property {superTrendExtras} strategyExtras Strategy property, strategy specific arguments for custom implementations
     */

    /**
     *
     * @param args {superTrendConfig} - The Strategies Parameters
     * @return {SuperTrend}
     */
    static init(args){
        return new SuperTrend(args);
    }

    /**
     *
     * @param args {superTrendConfig} - The Strategies Parameters
     */
    constructor(args) {
        super(args);
        this.setContext("SuperTrend")

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
    async setup(clineCandles){
        this.setIndicator(clineCandles,{multiplier:this.args.multiplier || 3,period:this.args.period || 7},this.indicators.SuperTrendIndicator.className);
        return this;
    }

    /**
     *
     * @return {Array<any>} returns an Indicator Data Array
     */
    getIndicator(){ return super.getIndicator()}

    /**
     *
     * @param _index {Number} Only provide during Backtest executions to keep track of Candle and Indicator Array Indexes!
     * @param isBackTest {Boolean} flag indicating if the current run is a Backtest run, Only provide during Backtest executions to keep track of Candle and Indicator Array Indexes!
     *
     * @return {Promise<{custom: {}, context: null, state, timestamp: number}>}
     */
    async run(_index=0, isBackTest=false){

        /**
         * First Check to internal State of the Strategy if we are in a enter long|short state set the state to
         * a state signalling that we are awaiting confirmation from the BitFoxEngine that the order is filled!
         */
        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }
        /**
         * Check the internal State of the Strategy if we are in a 'pending' state
         * use Indicator data to determine a long or short entry and set the state accordingly!
         */
        if(this.state === this.states.STATE_PENDING){
            let data = this.getIndicator();
            /**
             * If we are in a BackTesting scenario, use candle and indicator data arry index to access the current data from the sequence
             * Otherwise use the latest data in the last index of the Array!
             */
            if(data[isBackTest ? _index : data.length - 1].trend ==='short'){
                if(this.sidePreference === 'short' || (this.sidePreference === 'biDirectional')){
                    this.state = this.states.STATE_ENTER_SHORT;
                }
            }
            /**
             * If we are in a BackTesting scenario, use candle and indicator data arry index to access the current data from the sequence
             * Otherwise use the latest data in the last index of the Array!
             */
            if(data[isBackTest ? _index : data.length - 1].trend ==='long'){
                if(this.sidePreference === 'long' || (this.sidePreference === 'biDirectional')){
                    this.state = this.states.STATE_ENTER_LONG;
                }
            }
            return this.getStrategyResult(this.state,{value:data[isBackTest ? _index : data.length - 1].value});
        }
        return this.getStrategyResult(this.state,{});
    }
}

/**
 *
 * @type {{SuperTrend: SuperTrend}}
 */
module.exports = {SuperTrend:SuperTrend}
