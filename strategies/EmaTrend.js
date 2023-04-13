const {Strategy} = require("./Strategy")
class EmaTrend extends Strategy{
    static RSI=Strategy.INDICATORS.RsiIndicator.className;
    static EMA= Strategy.INDICATORS.EMAIndicator.className;
    static ATR = Strategy.INDICATORS.AtrIndicator.className;

    static init(args){
        return new EmaTrend( args);
    }
    constructor(args) {
        super(args);
        this.setContext("EmaTrend")

        if(this.args.usage) {
            this.usage({
                "vox": "VoxEngine",
                "sidePreference": "long",
                "strategy": "./extensions/vox-strategies/EmaTrend",
                "backtest": true,
                "exchange": "bybit",
                "symbol": "ADAUSDT",
                "timeframe": "5m",
                "amount": 100,
                "profitPct": 0.01,
                "fee": 0.02,
                "key": "FAKE_KEY",
                "secret": "FAKE_KEY",
                "life": true,
                "interval": 10,
                "periodSlow":20,
                "periodFast":10,
                "squeezeFactor":1.9,
                "bounceSlow":true
            });
        }
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

    setState(state){ this.state = state; }
    getState(){ return this.state}

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

    getIndicator(){return super.getIndicator()}

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

    calculateDistance(currPrice,currSlowEma,currFastEma,currATR){
        let targetEma = this.bounceSlow ? currSlowEma : currFastEma;
        let distance = currPrice > targetEma ? (currPrice-targetEma) : targetEma - currPrice;
        return distance / currATR;
    }
}

module.exports = {EmaTrend:EmaTrend}
