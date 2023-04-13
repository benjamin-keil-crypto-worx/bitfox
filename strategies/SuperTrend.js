const {Strategy} = require("./Strategy")
class SuperTrend extends Strategy{

    static init(args){
        return new SuperTrend(args);
    }
    constructor(args) {
        super(args);
        this.setContext("SuperTrend")

    }

    setState(state){ this.state = state; }
    getState(){ return this.state}
    async setup(clineCandles){
        this.setIndicator(clineCandles,{multiplier:this.args.multiplier || 3,period:this.args.period || 7},this.indicators.SuperTrendIndicator.className);
        return this;
    }

    getIndicator(){ return super.getIndicator()}
    async run(_index=0, isBackTest=false){

        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }if(this.state === this.states.STATE_PENDING){
            let data = this.getIndicator();
            if(data[isBackTest ? _index : data.length - 1].trend ==='short'){
                if(this.sidePreference === 'short' || (this.sidePreference === 'biDirectional')){
                    this.state = this.states.STATE_ENTER_SHORT;
                }
            }
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

module.exports = {SuperTrend:SuperTrend}
