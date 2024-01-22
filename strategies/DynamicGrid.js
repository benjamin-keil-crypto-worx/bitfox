// import bit fox 
const {Strategy} = require("./Strategy")
// retrieve the Base Class instance 
class DynamicGrid extends Strategy {
    static init(args){
        return new DynamicGrid( args );
    }

    // args here is an object and should follow this structure 
    /* {extra:{}, sidePreference:"long|short|bidirectional" } */

    // @extra this is a object soletargeted at your strategy lets say you don't want to use a default period for an RSI indicator you 
    //        would add an extra object like this {period:14}

    // @sidePreference this is a Strategy specific parameter, its optional and defaults to biDrectional
    //                You could use in the STrategy to ensure only long|short or biredirectional entries/exits are signalled 
    constructor(args) {
        super(args);
        
        this.grids = args.grids || 5;
        this.period = args.period || 200;
        this.gridDistro = null;
    }


    // Getter and Setter for the Strategies State object 
    setState(state){ this.state = state; }
    getState(){ return this.state}

    // ALWAYS implement this it makes things very easy and helps you focus on whats important.. 
    // your Strategy Logic.. ah it goes without saying tight? swap YOUR_INDICATOR with the indicator tyou like to use.

    async setup(klineCandles){
        // You Can Instantiate more than one Indicator
        this.setIndicator(klineCandles,{grids:this.grids, period:this.period},"DynamicGridSignals");
        this.gridDistro = this.getIndicator();
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

    checkPriceRange(currentPrice, currentGrids){
        let distribution = currentGrids.grid;
        let midpoint = Math.ceil(distribution.length / 2);
        let lowerbounds = distribution.slice(0, midpoint);
        let upperbounds = distribution.slice(midpoint);
        let enterLong = false;
        let enterShort =false;
        
        if(currentPrice >= lowerbounds[0] && currentPrice <= lowerbounds[lowerbounds.length - 1]){
            enterLong = true
        }
        if(currentPrice >= upperbounds[0] && currentPrice < upperbounds[upperbounds.length - 1]){
            enterShort = true
        }

        return {enterLong:enterLong, enterShort:enterShort };
    }

    async run(_index=0, isBackTest=false, ticker=null){
      
        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        } if(this.state === this.states.STATE_PENDING) {

            let currentGrids = this.gridDistro[isBackTest ? _index : data.length - 1]

            // This is same as above but this time we calling a method in the super class to provide the current approximate price
            let currentPrice = this.getApproximateCurrentPrice(isBackTest, _index);

            
            let {enterLong, enterShort } = this.checkPriceRange(currentPrice,currentGrids)

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
            return this.getStrategyResult(this.state,{});
        }
        return this.getStrategyResult(this.state,{});
    }
}

// Optional export of ths class
module.exports = {DynamicGrid:DynamicGrid}
