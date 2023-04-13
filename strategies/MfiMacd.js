const {Strategy} = require("./Strategy")

class MfiMacd extends Strategy {
    static init(args){
        return new MfiMacd( args);
    }

    constructor(args) {
        super(args);
        this.eventHandler = null;
        this.sidePreference  ='biDirectional';
        this.setContext("MfiMacd")
    }

    setState(state){ this.state = state; }
    getState(){ return this.state}

    async setup(klineCandles){
        this.setIndicator(klineCandles,{},this.indicators.MacdIndicator.className);
        this.macd = this.getIndicator();
        this.setIndicator(klineCandles,{},this.indicators.MfiIndicator.className);
        this.mfi = this.getIndicator();
        // You Can Instantiate more than one Indicator

        return this;
    }

    fireEvent(event,data){
        this.eventHandler.fireEvent(event,data);
    }

    getIndicator(){return super.getIndicator()}


    async run(_index=0, isBackTest=false, ticker=null){
        // You don't really need to change this if unless you have something else in mind
        // All we do here is to check if the Strategy is in a enter long or short state, if it is the calling engine
        // or back testing engine would have reacted and created respective real or mocked orders.
        if([this.states.STATE_ENTER_LONG,this.state === this.states.STATE_ENTER_SHORT].includes(this.state)){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }if([this.states.STATE_PENDING, this.states.STATE_AWAIT_CROSS_UP,this.states.STATE_AWAIT_CROSS_DOWN].includes(this.state)){

            // This is a call to the Super clas that has your last Instantiated Indicator Data cached
            // If you have Initialized multiple local indicators you don't need to call it as they would be
            // already available in your Strategy
            let data = this.getIndicator();

            let currentIndicatorDataOne = this.mfi[isBackTest ? _index : data.length - 1];
            let currentIndicatorDataTwo = this.macd[isBackTest ? _index : data.length - 1];

            // This is same as above but this time we are calling a method in the super class to provide the current approximate price
            let currentPrice = this.getApproximateCurrentPrice(isBackTest,_index);

            // This where it is all up to you create a function and process the Indicator data to
            // Determine if your Strategy signals long|short|stop signals
            let {enterLong, enterShort, triggerStop} = this.evaluateIndicatorData(currentPrice,currentIndicatorDataOne,currentIndicatorDataTwo)

            // This is the most important Logical Block in the Strategy here we are determining and toggling states
            // that returned to the Engine which in turn will react to States returned
            if(enterShort){
                if(this.sidePreference === 'short' || (this.sidePreference === 'biDirectional')){
                    this.state = this.states.STATE_ENTER_SHORT;
                }
            }
            if(enterLong){
                if(this.sidePreference === 'long' || (this.sidePreference === 'biDirectional')){
                    this.state = this.states.STATE_ENTER_LONG;
                }
            }
            if(triggerStop){
                this.state = this.states.STATE_STOP_LOSS_TRIGGERED;
            }
            return this.getStrategyResult(this.state,{macd:currentIndicatorDataTwo, mfi:currentIndicatorDataOne});
        }
        return this.getStrategyResult(this.state,{});
    }

    evaluateIndicatorData(currentPrice,mfi,macd){

        if(this.state === this.states.STATE_AWAIT_CROSS_UP){
            if(macd.histogram && macd.histogram > 0){
                return {enterLong:true, enterShort:false, triggerStop:false}
            }
        }

        if(this.state === this.states.STATE_AWAIT_CROSS_DOWN){
            if(macd.histogram && macd.histogram < 0 ){
                return {enterLong:false, enterShort:true, triggerStop:false}
            }
        }
        if(mfi < 20){
            if(macd.histogram && macd.histogram > 0 ){
                return {enterLong:true, enterShort:false, triggerStop:false}
            }
            this.state = this.states.STATE_AWAIT_CROSS_UP;
        }
        if(mfi > 80){
            if(macd.histogram && macd.histogram < 0 ){
                return {enterLong:false, enterShort:true, triggerStop:false}
            }
            this.state = this.states.STATE_AWAIT_CROSS_DOWN;
        }
        return {enterLong:false, enterShort:false, triggerStop:false}
    }
}

// Optional export of ths class
module.exports = {MfiMacd:MfiMacd}
