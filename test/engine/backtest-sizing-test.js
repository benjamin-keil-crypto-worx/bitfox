const {assert} = require('chai');
const {BackTestEngine} = require('../../engine/BackTest');
const {Strategy} = require('../../strategies/Strategy');
const {State} = require('../../lib/states/States');

/**
 * Scripted strategy that can attach a sizing payload (stopPrice / riskPct) to its entry
 * result, so the engine's risk sizing can be driven deterministically offline.
 */
class ScriptedSizedStrategy extends Strategy {
    static init(args) { return new ScriptedSizedStrategy(args); }

    constructor(args) {
        super(args);
        this.setContext('ScriptedSizedTest');
        this.script = args.script || {};
        this.payload = args.payload || null;
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
        let isEntry = [State.STATE_ENTER_LONG, State.STATE_ENTER_SHORT].includes(this.state);
        return this.getStrategyResult(this.state, (isEntry && this.payload) ? this.payload : {});
    }
}

const HOUR = 3600000;
const candle = (i, o, h, l, c) => [1700000000000 + i * HOUR, o, h, l, c, 1000];

function runBackTest(script, candles, argOverrides = {}, payload = null) {
    const args = {
        symbol: 'TESTUSDT', amount: 1000, profitPct: 1.03, stopLossPct: 0.98,
        makerFee: 0, takerFee: 0, slippage: 0, public: true,
        ...argOverrides
    };
    const strategy = ScriptedSizedStrategy.init({...args, script, payload});
    const engine = BackTestEngine.getBackTester(strategy, args);
    return engine.backTest(candles.map(c => [...c])).then(() => engine);
}

describe('BackTest risk-based position sizing', function () {

    const candles = [
        candle(0, 99, 101, 98.5, 100),
        candle(1, 100, 108, 99.5, 104),
        candle(2, 104, 105, 103, 104)
    ];

    it('keeps fixed-notional sizing when the strategy supplies no stop', async () => {
        const engine = await runBackTest({0: State.STATE_ENTER_LONG}, candles);
        // legacy behaviour: initialFunds / entry close = 1000 / 100
        assert.equal(engine.tradeHistory[0].entryOrder.amount, 10);
    });

    it('sizes the entry from the strategy stop so the stop costs riskPct of equity', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG}, candles, {},
            {stopPrice: 95, riskPct: 0.01}
        );
        // equity 1000, risk 1% = 10 quote, stop distance 5 -> 2 base units
        const amount = engine.tradeHistory[0].entryOrder.amount;
        assert.equal(amount, 2);
        assert.equal(amount * (100 - 95), 10, 'loss at the stop equals 1% of equity');
    });

    it('sizes a wider stop smaller for the same risk fraction', async () => {
        const tight = await runBackTest({0: State.STATE_ENTER_LONG}, candles, {}, {stopPrice: 95, riskPct: 0.01});
        const wide = await runBackTest({0: State.STATE_ENTER_LONG}, candles, {}, {stopPrice: 80, riskPct: 0.01});
        assert.isBelow(wide.tradeHistory[0].entryOrder.amount, tight.tradeHistory[0].entryOrder.amount);
    });

    it('falls back to the engine riskPct when the strategy sends only a stop', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG}, candles, {riskPct: 0.02},
            {stopPrice: 95}
        );
        // 2% of 1000 = 20 quote over a 5 stop distance -> 4 units
        assert.equal(engine.tradeHistory[0].entryOrder.amount, 4);
    });

    it('caps a very tight stop at 1x notional rather than implying leverage', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG}, candles, {},
            {stopPrice: 99.99, riskPct: 0.01}
        );
        assert.equal(engine.tradeHistory[0].entryOrder.amount, 10, 'capped at equity/price');
    });

    it('uses the same amount for the exit leg as the entry', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_LONG}, candles, {},
            {stopPrice: 95, riskPct: 0.01}
        );
        const trade = engine.tradeHistory[0];
        assert.equal(trade.exitOrder.amount, trade.entryOrder.amount);
    });

    it('sizes short entries from a stop above the entry', async () => {
        const engine = await runBackTest(
            {0: State.STATE_ENTER_SHORT}, candles, {},
            {stopPrice: 105, riskPct: 0.01}
        );
        assert.equal(engine.tradeHistory[0].entryOrder.amount, 2);
    });
});
