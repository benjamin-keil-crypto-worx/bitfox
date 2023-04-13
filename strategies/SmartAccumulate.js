const {Strategy} = require("./Strategy")
const utils = require("../lib/utility/util");
class SmartAccumulate extends Strategy{

    static WOODIES = "Woodies"
    static init(args){
        return new SmartAccumulate(args);
    }
    constructor(args) {
        super(args);
        this.setContext("SmartAccumulate")
        if(this.args.usage) {
            this.usage({
                "vox": "SmartAccumulateVox",
                "exchange": "bybit",
                "symbol": "ADAUSDT",
                "accumulate": "quote",
                "amount": 50,
                "profitPct": 0.1,
                "fee": 0.01,
                "key": "FAKE_KEY",
                "secret": "FAKE_KEY",
                "life": true
            });
        }
        this.floorPivots = null;
        this.currPivot = null;
        this.sidePreference = args.sidePreference || 'long';

    }

    setState(state){ this.state = state; }
    getState(){ return this.state}

    async setup(klineCandles){
        this.setIndicator(klineCandles,{},SmartAccumulate.WOODIES )
        this.floorPivots = this.getIndicator();
        return this;
    }

    getIndicator(){ return super.getIndicator()}
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

module.exports = {SmartAccumulate:SmartAccumulate}
