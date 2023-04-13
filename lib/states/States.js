class States {
    static STATE_PENDING ='state.pending';
    static STATE_TAKE_PROFIT ='state.takeProfit';
    static STATE_ENTER_LONG ='state.enterLong';
    static STATE_ENTER_SHORT ='state.enterShort';
    static STATE_AWAIT_CROSS_UP ='state.awaitCross.up';
    static STATE_AWAIT_CROSS_DOWN ='state.awaitCross.down';
    static STATE_AWAIT_TAKE_PROFIT ='state.awaitTakeProfit';
    static STATE_STOP_LOSS_TRIGGERED ='state.stopLoss.triggered';
    static STATE_AWAIT_ORDER_FILLED ='state.await.order.filled';
    static STATE_AWAIT_CONFIRMATION = 'state.await.confirmation';
    static STATE_TREND_UP = 'state.trend.up';
    static STATE_TREND_DOWN = 'state.trend.down';
    static STATE_TRIGGER_ALERT = 'state.trigger.alert';
    static STATE_CONTEXT_INDEPENDENT = 'state.context.independent';

}

module.exports = {State:States}
