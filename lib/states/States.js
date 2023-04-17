/**
 * Class States
 <pre>
 * This class provides States that are returned to the BitFox engine instance
 * with each execution context and help the Engine to identify what actions it should take.
 </pre>
 */
class States {

    /**
     * The initial State of all Strategies
     * @type {string}
     */
    static STATE_PENDING ='state.pending';

    /**
     * A state that signals it is time to take profit
     * @type {string}
     */
    static STATE_TAKE_PROFIT ='state.takeProfit';
    /**
     * A state that signals the Strategy has determined a Long Entry
     * @type {string}
     */
    static STATE_ENTER_LONG ='state.enterLong';
    /**
     * A state that signals the Strategy has determined a Short Entry
     * @type {string}
     */
    static STATE_ENTER_SHORT ='state.enterShort';
    /**
     * Moving Average specific state, can be useful if you like to wait for a crossing up of different moving averages
     * @type {string}
     */
    static STATE_AWAIT_CROSS_UP ='state.awaitCross.up';
    /**
     * Moving Average specific state, can be useful if you like to wait for a crossing down of different moving averages
     * @type {string}
     */
    static STATE_AWAIT_CROSS_DOWN ='state.awaitCross.down';
    /**
     * A state that signals we are in a idle phase and wait for a take profit signal
     * @type {string}
     */
    static STATE_AWAIT_TAKE_PROFIT ='state.awaitTakeProfit';
    /**
     * A state that signals the Stop Loss target has reached and a stop loss order should be made
     * @type {string}
     */
    static STATE_STOP_LOSS_TRIGGERED ='state.stopLoss.triggered';
    /**
     * A state that signals that we are waiting for a Limit Order to be filled
     * @type {string}
     */
    static STATE_AWAIT_ORDER_FILLED ='state.await.order.filled';
    /**
     * A Strategy specific state, can be useful if you like to wait for a dedicated confirmation logic to resolve to true
     * @type {string}
     */
    static STATE_AWAIT_CONFIRMATION = 'state.await.confirmation';
    /**
     * A Strategy specific state, signalling that the current trend is up, this could be handy if you want to identify and keep track of a current price trend
     * @type {string}
     */
    static STATE_TREND_UP = 'state.trend.up';
    /**
     * A Strategy specific state, signalling that the current trend is down, this could be handy if you want to identify and keep track of a current price trend
     * @type {string}
     */
    static STATE_TREND_DOWN = 'state.trend.down';

    /**
     * A state that signals to the engine to trigger an alert!
     * @type {string}
     */
    static STATE_TRIGGER_ALERT = 'state.trigger.alert';
    /**
     * An Engine specific state, signalling to the engine that the current Strategy is a independent Strategy i.e.
     * Trades and Orders managed from within the Strategy and Engine should not react toState Changes,
     * @type {string}
     */
    static STATE_CONTEXT_INDEPENDENT = 'state.context.independent';

}

module.exports = {State:States}
