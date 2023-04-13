const EventEmitter = require('events');

class EventHandler{
    static getEventHandler(){
        return new EventHandler();
    }

    constructor() {
        this.eventEmitter = new EventEmitter();
    }
    getEventEmitter(){return this.eventEmitter}
    on(event, callback, eventArgs=null) {
        /**
         ************* BitFox Acknowledged Events ************
         *  Custom Event Emitter instance so that users can implement their own additional logic to react to events
         *  Current Available and valid events are:
         *
         * onMessage            (Generic message handler info|warnings|debugs,. etc)
         * onError              (Error handler)
         * onOrderPlaced        (returns the order in context)
         * onOrderFilled        (returns the order in context)
         * onTradeComplete      (returns the trade in context)
         * onStopLossTriggered  (returns the stop order executed)
         *
         * User can add custom events but there is no Guarantee that these are fired during execution
         * as You are responsible to ensure that these are executed
         */
        return this.eventEmitter.on(event, (eventArgs)=>callback(eventArgs));
    }

    fireEvent(eventName, args = null){
        this.eventEmitter.emit(eventName, args );
    }
}
module.exports ={EventHandler:EventHandler}
