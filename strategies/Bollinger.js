const {Strategy} = require("./Strategy")

/**
 * Class Bollinger
 *
 <pre>
 * This class is a simple example of how you could implement a Bollinger Strategy
 *
 * The Common Conception is to place a long when price is at the lower Bands and short when price is at the upper bands.
 * This is sometimes very dangerous we need to have some sort of confirmation or some sort of probability factor that helps us time this better.
 *
 * This Strategy is more like a probability factor a Bollinger Squeeze breakout Strategy ,
 * first check we check if the distance between the upper and lower bands qualifies as a squeeze period or condition
 *
 * distance = upper-lower
 * squeezeFactor = distance / atr <= 2.5
 *
 * Then we calculate a probability factor i.e. check how many of the last n previous candle closing prices have been below the middle line
 * and how many have been above the middle like
 * this will give us an approximated idea of the trend
 *
 * let's say the look back period is 10 candles and 4 of these candles where above the middle line and six above, then the probability factor of a long position
 * succeeding could be 60%
 *
 * probabilityFactor =  (currentPrice[1...lookBack ] below middle) ? probability = 'short' () (currentPrice[1...lookBack ] above middle ? 'long')
 </pre>
 */
class Bollinger extends Strategy{
    static BOLL = Strategy.INDICATORS.BollingerIndicator.className;
    static ATR = Strategy.INDICATORS.AtrIndicator.className;

    /**
     * @typedef {Object} bollingerExtras Strategy configuration options
     * @property {Number} lookBack Strategy property, the period to look back on previous candles
     * @property {Number} probabilityFactorLong Strategy property, the needed probability factor to enter a long i.e. 0.6 (60%)
     * @property {Number} probabilityFactorShort Strategy property, the needed probability factor to enter a short i.e 0.6 (60%)
     * @property {Number} squeezeFactor Strategy property, the squeeze factor or the needed difference between the distance between upper and lower bands
     *
     */

    /**
     * @typedef {Object} bollingerConfig Strategy configuration options
     * @property {number} sidePreference Strategy property, the trading preference lon|short/biDirectional
     * @property {bollingerExtras} strategyExtras Strategy property, strategy specific arguments for custom implementations
     */

    /**
     *
     * @param  args {bollingerConfig}
     * @return {Bollinger}
     */
    static init(args){
        return new Bollinger( args);
    }

    /**
     *
     * @param  args {bollingerConfig}
     */
    constructor(args) {
        super(args);
        this.setContext("Bollinger")
        this.bollinger = null;
        this.atr = null;
        this.candleConfirmationBuffer = [];
        this.confirmationCount =0;
        this.lookBack = args.strategyExtras.lookBack || 20
        this.probabiltyFactorLong = args.strategyExtras.probabilityFactorLong || 0.6;
        this.probabiltyFactorShort = args.strategyExtras.probabilityFactorLong || 0.4;
        this.squeezeFactor = args.strategyExtras.squeezeFactor || 1.9;
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
        this.setIndicator(klineCandles,{},Bollinger.ATR);
        this.atr = this.getIndicator();
        this.setIndicator(klineCandles,{},Bollinger.BOLL);
        this.bollinger = this.getIndicator()
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
        let curBoll = this.bollinger[isBackTest ? _index : this.bollinger.length - 1];
        let curATR  = this.atr[isBackTest ? _index : this.atr.length - 1];
        let currPrice = super.getApproximateCurrentPrice(isBackTest,_index);
        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }
        if(this.state === this.states.STATE_PENDING){

            /* The Common Conception is to place a long when price is at the lower Bands and short when price is at the upper bands.
               very dangerous we need to have some sort of confirmation or some sort of probability factor that helps us time this better.

               Let say we want a probability factor a Bollinger Squeeze breakout, then we would first check if the distance between the upper and lower bands qualifies
               as a squeeze period or condition
               distance = upper-lower
               squeezeFactor = distance / atr <= 2.5
               probabilityFactor =  (currentPrice[1...lookBack ] below middle) ? probability = 'short' () (currentPrice[1...lookBack ] above middle ? 'long')
            */
            let distance = curBoll.upper - curBoll.lower;
            let squeezeFactor = distance / curATR;
            if( squeezeFactor <= this.squeezeFactor ){
                this.state = this.states.STATE_AWAIT_CONFIRMATION;
                this.candleConfirmationBuffer.push(currPrice<curBoll.middle);
                this.confirmationCount++;
                return this.getStrategyResult(this.state, {});
            }
            return this.getStrategyResult(this.state,{
                rsi:curBoll,
            });
        }
        if(this.state === this.states.STATE_AWAIT_CONFIRMATION){
            if(this.confirmationCount<=this.lookBack){
                this.candleConfirmationBuffer.push(currPrice<curBoll.middle);
                this.confirmationCount++;
                return this.getStrategyResult(this.state, {});
            }else{
                let _probabilityFactorLong = (this.candleConfirmationBuffer.filter(Boolean).length / this.candleConfirmationBuffer.length);
                let _probabilityFactorShort = (this.candleConfirmationBuffer.filter((belowMedian)=>{ return belowMedian === false}).length / this.candleConfirmationBuffer.length);

                if(_probabilityFactorLong >= this.probabiltyFactorLong){
                    this.state =  (this.sidePreference === 'long' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_LONG : this.state;
                    this.resetConfirmationMode();
                    return this.getStrategyResult(this.state, {});
                }if(_probabilityFactorShort >= this.probabiltyFactorShort){
                    this.state =  (this.sidePreference === 'short' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_SHORT : this.state;
                    this.resetConfirmationMode();
                    return this.getStrategyResult(this.state, {});
                }
                this.candleConfirmationBuffer.push(currPrice<curBoll.middle);
                return this.getStrategyResult(this.state, {});
            }
        }
        return this.getStrategyResult(this.state, {});
    }

    resetConfirmationMode(){
        this.confirmationCount =0;
        this.candleConfirmationBuffer = [];
    }
}

module.exports = {Bollinger:Bollinger}
