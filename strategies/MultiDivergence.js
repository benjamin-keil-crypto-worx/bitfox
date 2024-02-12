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
class MultiDivergence extends Strategy{
    static MULTI_DIV = "MultiDivergenceDetector";

    static init(args){
        return new MultiDivergence( args);
    }

    /**
     *
     * @param args {zemaTrendConfig} - The Strategies Parameters
     */
    constructor(args) {
        super(args);
        this.setContext("MultiDivergence")
        this.divergences = null;
        this.sidePreference = args.sidePreference || 'long';
        this.divergenceType= "pending";
        this.confirmationPeriod = args.confirmationPeriod || 14;
        this.count = 0;
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
        this.setIndicator(klineCandles,{period:this.periodFast},MultiDivergence.MULTI_DIV);
        this.divergences = this.getIndicator()
        return this;
    }


    getIndicator(){return super.getIndicator()}



    async run(_index=0, isBackTest=false, ticker=null){
        let currPrice = this.kline.o[isBackTest ? _index : this.kline.o.length-1];
        let currDivs = this.divergences[isBackTest ? _index : this.divergences.length-1];
        

        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state,{value:currDivs});
        }

        if(this.state === this.states.STATE_PENDING){
            if(currDivs.hasDivergence){
                if( currDivs.divergence[0].type.includes("Bullish")){
                    this.divergenceType = "bullish";
                    this.state = this.states.STATE_AWAIT_CONFIRMATION
                }
                if(currDivs.divergence[0].type.includes("Bearish")){
                    this.divergenceType = "bearish";
                    this.state = this.states.STATE_AWAIT_CONFIRMATION
                }
            }
            return this.getStrategyResult(this.state,{value:currDivs});

        }
        if(this.state === this.states.STATE_AWAIT_CONFIRMATION){
          if(this.count > this.confirmationPeriod){
             // reset the the state to pending state this was a false signal
             this.state = this.states.STATE_PENDING;
             this.divergenceType = "pending";
             this.count = 0;
             return this.getStrategyResult(this.state,{value:currDivs});
           }
           this.count++;
           let pC =  this.kline.o[isBackTest ? _index : this.kline.o.length-1];
           let pH =  this.kline.h[isBackTest ? _index : this.kline.h.length-1];
           let pL =  this.kline.l[isBackTest ? _index : this.kline.l.length-1];
           let pO =  this.kline.c[isBackTest ? _index : this.kline.c.length-1];
           console.log(`o:${pO} , h:${pH}, l:${pL}, c:${pC}`);	
           if(this.divergenceType === 'bullish'){
                console.log("Bull div waiting for confirmation counter ", this.count)
                let hasPattern = pC > pO
                if(hasPattern) {
                    if(this.sidePreference === 'long' || (this.sidePreference === 'biDirectional')){
                        this.state = this.states.STATE_ENTER_LONG;
                    }
                }
                return this.getStrategyResult(this.state,{value:currDivs});
           }

           if(this.divergenceType === 'bearish'){
                console.log("Bear div waiting for confirmation counter ", this.count);

                let hasPattern = pC < pO
                if(hasPattern) {
                    if(this.sidePreference === 'short' || (this.sidePreference === 'biDirectional')){
                        this.state = this.states.STATE_ENTER_SHORT;
                    }
                }
                return this.getStrategyResult(this.state,{value:currDivs});
           }
        }
        return this.getStrategyResult(this.state,{value:currDivs});
    }
}

module.exports = {MultiDivergence:MultiDivergence}
