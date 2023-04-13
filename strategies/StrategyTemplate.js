// import bit fox 
let bitfox = require("bitfox").bitfox;

// retrieve the Base Class instance 
let BaseStrategy = bitfox.Strategy;
let utils = bitfox.utils;

class StrategyTemplate extends BaseStrategy {
    static init(args){
        return new StrategyTemplate( args);
    }

    // args here is an object and should follow this structure 
    /* {extra:{}, sidePreference:"long|short|bidirectional" } */

    // @extra this is a object soletargeted at your strategy lets say you don't want to use a default period for an RSI indicator you 
    //        would add an extra object like this {period:14}

    // @sidePreference this is a Strategy specific parameter, its optional and defaults to biDrectional
    //                You could use in the STrategy to ensure only long|short or biredirectional entries/exits are signalled 
    constructor(args) {
        super(args);
        // You Don't need this but you can instiantiate a event Handler and Emitter We will cover how to use it later in this document
        // Whenwe create our first Simple Strategy. 
        this.eventHandler = null;
    }


    // Getter and Setter for the Strategies State object 
    setState(state){ this.state = state; }
    getState(){ return this.state}

    // ALWAYS implement this it makes things very easy and helps you focus on whats important.. 
    // your Strategy Logic.. ah it goes without saying tight? swap YOUR_INDICATOR with the indicator tyou like to use.

    async setup(klineCandles){
        this.setIndicator(clineCandles,{},this.indicators.YOUR_INDICATOR.className);
        this.YOUR_INDICATOR = this.getIndicator()

        // You Can Instantiate more than one Indicator
        this.setIndicator(clineCandles,{},this.indicators.YOUR_INDICATOR.className);
        this.YOUR_SECOND_INDICATOR = this.getIndicator()



        /***
         * PLEASE READ THIS Carefully!!!!!
         *
         * Sometimes you don't just want to use one Indicator right?
         * Maybe you want to use 2,3,4 Indicators?
         * This is no problem but... there is currently a small limitation!
         *
         * Lets say you have a RSI Indicator with a period of 14 and also want a SimpleMovingAverage Indicator
         * with a period of 200.
         *
         * In this case you MUST  ensure thet the Indicator with the longest period is initialized last
         *
         *         this.setIndicator(clineCandles,{period:14},this.indicators.RSI.className);
         *         this.RSI = this.getIndicator()
         this.setIndicator(clineCandles,{period:200},this.indicators.SmaIndicator.className);
         this.SMA = this.getIndicator()

         * The Limitation is inside our engine because it needs to recalculate and adjust actual Candles Array Size against Indicator Data Arrays
         * So the engine will recalculate and Adjust array data from the last initialized Indicator inside your Strategy
         * So The indicators that require longest periods need to be initialized last!
         */
        return this;
    }

    /**
     *
     * @param event
     * @param data
     *
     * This is a custom Event Handler that you may want to leverage when a certain condition is triggered
     * lets say a long entry is signalled inside your strategy you could implement a eventemitter like this:
     *
     * this.fireEvent("myCustomEvent",{"myField":"YourFiled", state:this.getStrategyResult()})
     */
    fireEvent(event,data){
        this.eventHandler?.fireEvent(event,data);
    }

    /***
     *
     * @returns {Indicator.Obj}
     */
    getIndicator(){return super.getIndicator()}

    /***
     *
     * @param _index
     * @param isBackTest
     * @returns {Promise<void>}
     *
     * This is the Heart and Soul of your Strategy.
     *
     */

    // @_index       The _index parameter is really only used when you are backtesting the strategy
    //               It is the index of the current candle Data and the corresponding Indicator index

    // @isBackTest   This is a boolean that is injected/provided by the engine instance and provided at
    //               engine instiantiation.
    // @ticker optional but the engine will provide a last ticker value 

    async run(_index=0, isBackTest=false, ticker=null){
        // You don't really need to change this if unless you have something else in mind
        // All we do here is to check if the Strategy is in in a enter long or short state, if it is the calling engine
        // or backtesting engine would have reacted and created respective real or mocked orders.
        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }if(this.state === this.states.STATE_PENDING){

            // This is a call to the Super clas that has your last Instantiated Indicator Data cached
            // If you have Initialized multiple local indicators you don't need to call it as they would be
            // allready available in your Strategy 
            let data = this.getIndicator();

            /**
             *  This is how you can access the indicator data
             *
             *  If it is a backTest we use the index as given from the Engine (The Engine is iterating over a Data Set of Candles)
             *  If it is not a backtesting scenarionwe access the last (most recent) value in the indicator array.
             *
             * */
            let currentIndicatorDataOne = this.YOUR_INDICATOR[isBackTest ? _index : data.length - 1]
            let currentIndicatorDataTwo = this.YOUR_SECOND_INDICATOR[isBackTest ? _index : data.length - 1]

            // This is same as above but this time we calling a method in the super class to provide the current approximate price
            let currentPrice = this.getApproximateCurrentPrice(isBackTest,_index);

            // This where it is all up to you create a function and process the Indicator data to
            // Determine if your Strategy signals long|short|stop signals
            let {enterLong,enterShort, triggerStop} = yourAwesomImplementation(currentPrice,currentIndicatorDataOne,currentIndicatorDataTwo)

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
            return this.getStrategyResult(this.state,{value:data[isBackTest ? _index : data.length - 1].value});
        }
        return this.getStrategyResult(this.state,{});
    }
}

// Optional export of ths class
module.exports = {StrategyTemplate:StrategyTemplate}
