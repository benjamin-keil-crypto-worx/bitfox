const {Strategy} = require("./Strategy")

class SuperTrendFull extends Strategy{

    static init(args){
        return new SuperTrendFull(args);
    }

    constructor(args) {
        super(args);
        this.setContext("SuperTrendFull");
        this.biDirectionalTrendSwitch = (this.sidePreference === 'biDirectional');
        this.nextTrend = "pending";
        this.entrySide = null;
    }

    setState(state){
        this.state = state;
        if(state === this.states.STATE_PENDING){
            this.entrySide = null;
        }
    }

    getState(){ return this.state}

    async setup(klineCandles){
        // params come from strategyExtras (builder convention); top-level args kept for backward compatibility
        let extras = (this.args && this.args.strategyExtras) || {};
        this.setIndicator(klineCandles,{multiplier: extras.multiplier || this.args.multiplier || 3, period: extras.period || this.args.period || 7},this.indicators.SuperTrendIndicator.className);
        return this;
    }

    getIndicator(){ return super.getIndicator()}

    async run(_index=0, isBackTest=false){
        let data = this.getIndicator();
        let idx = isBackTest ? _index : data.length - 1;
        let currentTrend = data[idx] ? data[idx].trend : null;

        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }

        if(this.state === this.states.STATE_AWAIT_ORDER_FILLED){
            return this.getStrategyResult(this.state, {});
        }

        if(this.state === this.states.STATE_AWAIT_TAKE_PROFIT && this.entrySide){
            if(this.entrySide === 'long' && currentTrend === 'short'){
                this.entrySide = null;
                this.nextTrend = "long";
                return this.getStrategyResult(this.states.STATE_STOP_LOSS_TRIGGERED, {reason:'trend_reversal'});
            }
            if(this.entrySide === 'short' && currentTrend === 'long'){
                this.entrySide = null;
                this.nextTrend = "short";
                return this.getStrategyResult(this.states.STATE_STOP_LOSS_TRIGGERED, {reason:'trend_reversal'});
            }
            return this.getStrategyResult(this.state, {});
        }

        if(this.state === this.states.STATE_PENDING && currentTrend){
            this.nextTrend = (this.nextTrend === "pending") ? currentTrend : this.nextTrend;

            if(currentTrend === 'short'){
                if(this.biDirectionalTrendSwitch && !["short"].includes(this.nextTrend)){
                    return this.getStrategyResult(this.state,{custom:`In trend exhaustion mode waiting for new ${this.nextTrend} trend`,value:data[idx].value});
                } else {
                    if(this.sidePreference === 'short' || (this.sidePreference === 'biDirectional')){
                        this.state = this.states.STATE_ENTER_SHORT;
                        this.entrySide = 'short';
                        this.nextTrend = "long";
                    }
                }
            }

            if(currentTrend === 'long'){
                if(this.biDirectionalTrendSwitch && !["long"].includes(this.nextTrend)){
                    return this.getStrategyResult(this.state,{custom:`In trend exhaustion mode waiting for new ${this.nextTrend} trend`,value:data[idx].value});
                } else {
                    if(this.sidePreference === 'long' || (this.sidePreference === 'biDirectional')){
                        this.state = this.states.STATE_ENTER_LONG;
                        this.entrySide = 'long';
                        this.nextTrend = "short";
                    }
                }
            }
            return this.getStrategyResult(this.state,{value:data[idx].value});
        }

        return this.getStrategyResult(this.state,{});
    }
}

module.exports = {SuperTrendFull:SuperTrendFull};
