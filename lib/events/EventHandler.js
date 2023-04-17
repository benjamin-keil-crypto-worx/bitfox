const EventEmitter = require('events');


/**
 * Class Event Handler
 *
 * This class is responsible to Manage Events withing BitFox Application Context!
 *
 */
class EventHandler{

    /**
     <pre>
     * ************ BitFox Acknowledged Events ************
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
     </pre>
     * @returns {EventHandler}
     */
    static getEventHandler(){
        return new EventHandler();
    }

    /**
     *
     */
    constructor() {
        this.eventEmitter = new EventEmitter();
    }
    getEventEmitter(){return this.eventEmitter}

    /**
     *
     * @param event {String} The Name Of The Event
     * @param callback {function} The Callback Function
     * @param eventArgs {Object} The Event data to consume
     * @returns {module:events.internal}
     */
    on(event, callback, eventArgs=null) {

        return this.eventEmitter.on(event, (eventArgs)=>callback(eventArgs));
    }

    /**
     *
     * @param eventName {String} The Name of the event to fire
     * @param args {any}  The Arguments or data to attach to event!
     */
    fireEvent(eventName, args = null){
        this.eventEmitter.emit(eventName, args );
    }
}

/**
 *
 * @type {{EventHandler: EventHandler}}
 */
module.exports ={EventHandler:EventHandler}
