const {assert} = require('chai');
const {BackTestEngine} = require('../../engine/BackTest');
const {Strategy} = require('../../strategies/Strategy');
const {State} = require('../../lib/states/States');

/**
 * Scripted strategy: returns a predefined state per candle index so tests can
 * drive the backtest engine through exact entry/exit scenarios offline.
 */
class ScriptedStrategy extends Strategy {
    static init(args) { return new ScriptedStrategy(args); }

    constructor(args) {
        super(args);
        this.setContext('ScriptedTest');
        this.script = args.script || {};
    }

    async setup(klineCandles) {
        this.indicator = klineCandles.map(() => 0);
        return this;
    }

    getIndicator() { return this.indicator; }
    setState(state) { this.state = state; }
    getState() { return this.state; }

    async run(index, isBackTest) {
        if (this.script[index] !== undefined) { this.state = this.script[index]; }
        return this.getStrategyResult(this.state, {});
    }
}

// candle: [timestamp, open, high, low, close, volume]
const HOUR = 3600000;
const candle = (i, o, h, l, c) => [1700000000000 + i * HOUR, o, h, l, c, 1000];

function runBackTest(script, candles, argOverrides = {}) {
    const args = {
        symbol: 'TESTUSDT', amount: 1000, profitPct: 1.03, stopLossPct: 0.98,
        makerFee: 0, takerFee: 0, slippage: 0, public: true,
        ...argOverrides
    };
    const strategy = ScriptedStrategy.init({...args, script});
    const engine = BackTestEngine.getBackTester(strategy, args);
    return engine.backTest(candles.map(c => [...c])).then(() => engine);
}

describe('BackTest fill model', function () {

    it('fills a long take-profit at the target price, not the candle high', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG},
            [candle(0, 99, 101, 98.5, 100), candle(1, 100, 108, 99.5, 104), candle(2, 104, 105, 103, 104)]
        );
        const trade = engine.tradeHistory[0];
        assert.equal(trade.entryOrder.price, 100, 'entry at signal-bar close');
        assert.equal(trade.exitOrder.price, 103, 'TP fill at target 100*1.03, not high 108');
        assert.notOk(trade.stopTriggered);
    });

    it('resolves a bar touching both target and stop as a stop-loss at the stop price', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG},
            [candle(0, 99, 101, 98.5, 100), candle(1, 100, 108, 97, 104), candle(2, 104, 105, 103, 104)]
        );
        const trade = engine.tradeHistory[0];
        assert.isTrue(trade.stopTriggered, 'ambiguous bar resolves as a loss');
        assert.equal(trade.exitOrder.price, 98, 'SL fill at stop 100*0.98');
    });

    it('fills a gapped-down stop at the bar open, not the stop price', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG},
            [candle(0, 99, 101, 98.5, 100), candle(1, 95, 96, 94, 95.5), candle(2, 95, 96, 95, 95.5)]
        );
        const trade = engine.tradeHistory[0];
        assert.isTrue(trade.stopTriggered);
        assert.equal(trade.exitOrder.price, 95, 'gap through the stop fills at the open');
    });

    it('completes a strategy-managed exit at the bar close instead of dropping the trade', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG, 1: State.STATE_TAKE_PROFIT},
            [candle(0, 99, 101, 98.5, 100), candle(1, 100, 106, 99.5, 101.5), candle(2, 101, 102, 100, 101)]
        );
        const trade = engine.tradeHistory[0];
        assert.isNotNull(trade.exitOrder, 'strategy-emitted TAKE_PROFIT must close the open trade');
        assert.equal(trade.exitOrder.price, 101.5, 'signal exit fills at the bar close');
        assert.equal(engine.metrics.openTrades, 0);
    });

    it('fills a short take-profit at the target price and shorts stop at the stop price', async () => {
        const tp = await runBackTest(
            {0: State.STATE_ENTER_SHORT},
            [candle(0, 101, 102, 99, 100), candle(1, 100, 100.5, 95, 96), candle(2, 96, 97, 95, 96)]
        );
        const target = 100 * (1 / 1.03);
        assert.closeTo(tp.tradeHistory[0].exitOrder.price, target, 1e-9, 'short TP fill at target');

        const sl = await runBackTest(
            {0: State.STATE_ENTER_SHORT},
            [candle(0, 101, 102, 99, 100), candle(1, 100, 106, 99.5, 105), candle(2, 105, 106, 104, 105)]
        );
        const stop = 100 * (1 / 0.98);
        assert.isTrue(sl.tradeHistory[0].stopTriggered);
        assert.closeTo(sl.tradeHistory[0].exitOrder.price, stop, 1e-9, 'short SL fill at stop');
    });

    it('applies slippage against the trader on entry and exit', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG},
            [candle(0, 99, 101, 98.5, 100), candle(1, 100, 110, 99.9, 105), candle(2, 105, 106, 104, 105)],
            {slippage: 0.001}
        );
        const trade = engine.tradeHistory[0];
        assert.closeTo(trade.entryOrder.price, 100 * 1.001, 1e-9, 'buy entry pays slippage');
        const target = trade.entryOrder.price * 1.03;
        assert.closeTo(trade.exitOrder.price, target * (1 - 0.001), 1e-9, 'sell exit loses slippage');
    });

    it('stores honest metrics on the instance (sharpe annualized by trade frequency)', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG, 2: State.STATE_ENTER_LONG},
            [
                candle(0, 99, 101, 98.5, 100), candle(1, 100, 104, 99.5, 103.5),
                candle(2, 103, 104, 102, 103), candle(3, 103, 107, 102.5, 106.5),
                candle(4, 106, 107, 105, 106)
            ]
        );
        assert.isNotNull(engine.metrics);
        assert.equal(engine.metrics.completedTrades, 2);
        assert.equal(engine.metrics.wins, 2, 'win = net PnL > 0');
        assert.isNumber(engine.sharpeRatio);
        assert.isAbove(engine.metrics.tradesPerYear, 0, 'annualization from real timestamps');
    });
});
