let bitfox = require("bitfox").bitfox;

let {builder} = bitfox
/* retrieve the Base Class instance */ 
let BaseStrategy = bitfox.Strategy;

class CustomStrategyExample extends BaseStrategy {
    /* This the body of you strategy */

    static RSI = BaseStrategy.INDICATORS.RsiIndicator.className;

    static init(args) {
        return new CustomStrategyExample(args);
    }

    /** Use a function similiar to this if you plan to add Custom events  */
    addEvenHandler(eventHandler){
        super.setEventHandler(eventHandler);
    }


    constructor(args) {
        super(args);
        this.RSI = null;
    } 
    // getter and setter for the strategy state 
    setState(state) {
        this.state = state;
    }

    getState() {
        return this.state
    }
    
    // getter for the indicator data 
    getIndicator() {
        return super.getIndicator()
    }

    async setup(klineCandles) {
        this.setIndicator(klineCandles, {period: 14}, MyAwesomeStrategy.RSI);
        this.RSI = this.getIndicator()
        return this;
    }

    // The run method that iterates over current price and indicator data 
    /**
     * 
     * @param _index     
     * @param isBackTest
     * @returns {Promise<{custom: {}, state: *, timestamp: number}>}
     */
    async run(_index = 0, isBackTest = false) {

        // Simple Logic and example how you could leverage Strategy States and provided data to implement
        // Strategy Logic!

        let currRsi = this.RSI[isBackTest ? _index : this.RSI.length - 1];

        if (this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT) {
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;

            /** fire your Custom event  */
            this.eventHandler.fireEvent("MyCustomEvent", {state:this.state, message:"this is the message"});
            return this.getStrategyResult(this.state, {});
        }
        if (this.state === this.states.STATE_PENDING) {

            if (currRsi <= 30) {
                this.state = (this.sidePreference === 'long' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_LONG : this.state;

                 /** fire your Custom event  */
                this.eventHandler.fireEvent("MyCustomEvent", {state:this.state, message:"currRsi <= 30"});
            }
            if (currRsi >= 70) {
                this.state = (this.sidePreference === 'short' || this.sidePreference === 'biDirectional') ? this.states.STATE_ENTER_SHORT : this.state;

                 /** fire your Custom event  */
                this.eventHandler.fireEvent("MyCustomEvent", {state:this.state, message:"currRsi >= 70"});

            }

            return this.getStrategyResult(this.state, {
                rsi: currRsi,
            });
        }
        return this.getStrategyResult(this.state, {
            rsi: currRsi,
        });
    }

}


// instantiate a bitfoxengine instance we are using the builder to create a new bitfox engine
let engine = builder()
       .requiredCandles(200)
       .sidePreference("short")
       .backtest(false)
       .pollRate(10)
       .public(true)
       .exchange("bybit")
       .symbol("BTCUSDT")
       .timeframe("4h")
       .amount(10)
       .profitPct(0.03)
       .stopLossPct(0.01)
       .strategyExtras({period:12})
       .fee(0.01)
       .key("FAKE_KEY")
       .secret("FAKE_SECRET")
       .life(false)
       .interval(10)
       .build();




/** Now Run Your Strategy remember the bitfox engine runs asynchronously so always wrap the run method inside a async function  **/

(async ()=>{
    // always make sure to call this method this will setup the Exchange Client and other engine dependencies and components
    await engine.setupAndLoadClient()
    engine.applyStrategy(CustomStrategyExample);
    /*  ---------------   Set Up Event Handlers (Optional) ----------------  */

    engine.on('onMessage', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onError', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onOrderPlaced', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onOrderFilled', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onTradeComplete', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onStopLossTriggered', (eventArgs) => {
        console.log(eventArgs)
    });
    
    /*  ---------------   Set Up Custom Event Handlers (Optional) ----------------  */
    // Custom event can only be invoked within a Custom Strategy instance inbuild bitfox Strategies currently don't suport custom Event Handler  

    engine.getStrategy().set
    engine.on('MyCustomEvent', (eventArgs) => {
        console.log(eventArgs)
    });
    await engine.run();
})();