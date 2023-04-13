const {Strategy} = require("./Strategy")
class RSITrend extends Strategy{
    static RSI=Strategy.INDICATORS.RsiIndicator.className;
    static MA= Strategy.INDICATORS.SmaIndicator.className;
    static init(args){
        return new RSITrend( args);
    }
    constructor(args) {
        super(args);
        this.setContext("RSITrend")
        this.RSI = null;
        this.maFast = null;
        this.maSlow = null;
        this.sidePreference = args.sidePreference || 'biDirectional';
    }

    setState(state){ this.state = state; }
    getState(){ return this.state}

    async setup(klineCandles){
        this.setIndicator(klineCandles,{period:this.custom.period || 14},RSITrend.RSI);
        this.RSI = this.getIndicator()
        this.setIndicator(klineCandles,{period:this.custom.period || 20},RSITrend.MA);
        this.maFast = this.getIndicator()
        this.setIndicator(klineCandles,{period:this.custom.period || 30},RSITrend.MA);
        this.maSlow = this.getIndicator();

        return this;
    }

    getIndicator(){return super.getIndicator()}

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

module.exports = {RSITrend:RSITrend}
