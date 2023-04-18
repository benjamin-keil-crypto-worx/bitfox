const {Strategy} = require("./Strategy")
const utils = require("../lib/utility/util");

/**
 * Class SmartAcumulate
 *
 <pre>
 * This class is a simple example Strategy that uses floor pivot resistance points do identify
 * possible trade entries and exits.
 *
 </pre>
 */
class SmartAccumulate extends Strategy{

    static WOODIES = "Woodies"

    /**
     *
     * @param args {strategyConfiguration} - the strategies configuration parameters
     * @return {SmartAccumulate}
     */
    static init(args){
        return new SmartAccumulate(args);
    }

    /**
     *
     * @param args {strategyConfiguration} - the strategies configuration parameters
     */
    constructor(args) {
        super(args);
        this.setContext("SmartAccumulate")
        this.floorPivots = null;
        this.currPivot = null;
        this.sidePreference = args.sidePreference || 'long';
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
        this.setIndicator(klineCandles,{},SmartAccumulate.WOODIES )
        this.floorPivots = this.getIndicator();
        return this;
    }

    /**
     *
     * @return {Array<any>} returns an Indicator Data Array
     */
    getIndicator(){ return super.getIndicator()}

    /**
     *
     * @param {number} _index
     * @param {boolean} isBackTest
     * @param {ticker} ticker
     * @return {Promise<{custom: {}, context: null, state, timestamp: number}>}
     */
    async run(_index=0, isBackTest=false, ticker=null){


        let currPrice = this.kline.o[isBackTest ? _index : this.kline.o.length-1];
        this.currPivot = ( isBackTest && _index % 200 === 0) ?  this.floorPivots[isBackTest ? _index : this.floorPivots.length-1] : this.currPivot;
        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }if(this.state === this.states.STATE_PENDING){
            if( currPrice<=this.currPivot.woodies.s1 ){
                this.state =  (this.sidePreference === 'short' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_SHORT : this.state;
            }
            if( currPrice>=this.currPivot.woodies.r1 ){
                this.state =  (this.sidePreference === 'long' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_LONG : this.state;
            }

            return this.getStrategyResult(this.state,{});
        }
        return this.getStrategyResult(this.state,{});
    }
}

/**
 *
 * @type {{SmartAccumulate: SmartAccumulate}}
 */
module.exports = {SmartAccumulate:SmartAccumulate}
