const {Strategy} = require("./Strategy")
class Bollinger extends Strategy{
    static BOLL = Strategy.INDICATORS.BollingerIndicator.className;
    static ATR = Strategy.INDICATORS.AtrIndicator.className;
    static init(args){
        return new Bollinger( args);
    }
    constructor(args) {
        super(args);
        this.setContext("Bollinger")
        if(this.args.usage) {
            this.usage(`bot vox --vox=VoxEngine --strategy=Bollinger 
    --backtest=true --exchange=bybit --symbol=ADAUSDT --timeframe=1m --amount=100  
    --profitPct=0.003 --fee=0.02 --key=FAKE_KEY --secret=JavaScript  --life=false 
    --interval=10 --lookback=9 --probabiltyFactorLong=0.6 --probabiltyFactorShort=0.4 
    --squeezeFactor--sidePreference=short`)
            process.exit(0);
        }
        this.bollinger = null;
        this.atr = null;
        this.candleConfirmationBuffer = [];
        this.confirmationCount =0;
        this.lookBack = args.lookBack || 20
        this.probabiltyFactorLong = args.probabiltyFactorLong || 0.6;
        this.probabiltyFactorShort = args.probabiltyFactorShort || 0.4;
        this.squeezeFactor = args.squeezeFactor || 1.9;
    }
    setState(state){ this.state = state; }
    getState(){ return this.state}

    async setup(klineCandles){
        this.setIndicator(klineCandles,{},Bollinger.ATR);
        this.atr = this.getIndicator();
        this.setIndicator(klineCandles,{},Bollinger.BOLL);
        this.bollinger = this.getIndicator()
        return this;
    }

    getIndicator(){return super.getIndicator()}

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
