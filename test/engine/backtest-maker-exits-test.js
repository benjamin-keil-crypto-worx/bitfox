const {assert} = require('chai');
const {BackTestEngine} = require('../../engine/BackTest');
const {Strategy} = require('../../strategies/Strategy');
const {State} = require('../../lib/states/States');

/** Scripted strategy: returns a predefined state per candle index (see backtest-fills-test.js). */
class ScriptedStrategy extends Strategy {
    static init(args) { return new ScriptedStrategy(args); }

    constructor(args) {
        super(args);
        this.setContext('MakerExitTest');
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

// long entry at close 100, then a bar that trades clean through the 103 target
const ENTRY_THEN_TP = [candle(0, 99, 101, 98.5, 100), candle(1, 100, 108, 99.5, 104), candle(2, 104, 105, 103, 104)];
const FEES = {makerFee: 0.0002, takerFee: 0.001};

describe('BackTest maker exits (GHBF-42)', function () {

    describe('flag off (default) — nothing changes', function () {

        it('defaults makerExits to false', async () => {
            const engine = await runBackTest({0: State.STATE_ENTER_LONG}, ENTRY_THEN_TP);
            assert.isFalse(engine.makerExits);
        });

        it('charges takerFee on both legs and ignores makerFee entirely', async () => {
            const cheap = await runBackTest({0: State.STATE_ENTER_LONG}, ENTRY_THEN_TP, {...FEES});
            // an absurd makerFee must not move the result while the flag is off
            const absurd = await runBackTest({0: State.STATE_ENTER_LONG}, ENTRY_THEN_TP, {...FEES, makerFee: 0.5});
            assert.equal(cheap.funds, absurd.funds, 'makerFee is unused when makerExits is off');

            // entry 10 units @100 = 1000, exit @103 = 1030, both legs taker
            const expected = 1000 + (1030 - 1000) - (1000 * 0.001) - (1030 * 0.001);
            assert.closeTo(cheap.funds, expected, 1e-9);
        });

        it('still fills a take-profit that only touches the target', async () => {
            const engine = await runBackTest(
                {0: State.STATE_ENTER_LONG},
                [candle(0, 99, 101, 98.5, 100), candle(1, 100, 103, 99.5, 102), candle(2, 102, 102.5, 101, 102)]
            );
            assert.equal(engine.tradeHistory[0].exitOrder.price, 103, 'touch fills when makerExits is off');
        });

        it('marks the exit as non-maker so PnL uses takerFee', async () => {
            const engine = await runBackTest({0: State.STATE_ENTER_LONG}, ENTRY_THEN_TP, {...FEES});
            assert.isFalse(engine.tradeHistory[0].exitWasMaker);
        });
    });

    describe('flag on — limit take-profits', function () {

        it('charges makerFee on the exit leg and takerFee on the entry', async () => {
            const engine = await runBackTest({0: State.STATE_ENTER_LONG}, ENTRY_THEN_TP, {...FEES, makerExits: true});
            const trade = engine.tradeHistory[0];
            assert.isTrue(trade.exitWasMaker);
            // entry taker 0.1%, exit maker 0.02%
            const expected = 1000 + (1030 - 1000) - (1000 * 0.001) - (1030 * 0.0002);
            assert.closeTo(engine.funds, expected, 1e-9);
        });

        it('pays no slippage on the maker exit but still pays it on entry', async () => {
            const engine = await runBackTest(
                {0: State.STATE_ENTER_LONG}, ENTRY_THEN_TP,
                {...FEES, makerExits: true, slippage: 0.001}
            );
            const trade = engine.tradeHistory[0];
            assert.closeTo(trade.entryOrder.price, 100 * 1.001, 1e-9, 'entry is a market order and pays slippage');
            const target = trade.entryOrder.price * 1.03;
            assert.closeTo(trade.exitOrder.price, target, 1e-9, 'resting limit fills at its own price, no slippage');
        });

        it('does NOT fill when the bar only touches the target (no trade-through)', async () => {
            const engine = await runBackTest(
                {0: State.STATE_ENTER_LONG},
                [candle(0, 99, 101, 98.5, 100), candle(1, 100, 103, 99.5, 102), candle(2, 102, 102.5, 101, 102)],
                {...FEES, makerExits: true}
            );
            assert.isNull(engine.tradeHistory[0].exitOrder, 'a tagged level is not a filled order');
        });

        it('fills when the bar trades strictly through the target', async () => {
            const engine = await runBackTest(
                {0: State.STATE_ENTER_LONG},
                [candle(0, 99, 101, 98.5, 100), candle(1, 100, 103.5, 99.5, 102), candle(2, 102, 102.5, 101, 102)],
                {...FEES, makerExits: true}
            );
            assert.equal(engine.tradeHistory[0].exitOrder.price, 103, 'fills at the target once traded through');
        });

        it('fills at the open when the bar gaps beyond the target', async () => {
            const engine = await runBackTest(
                {0: State.STATE_ENTER_LONG},
                [candle(0, 99, 101, 98.5, 100), candle(1, 105, 106, 104, 105.5), candle(2, 105, 106, 104, 105)],
                {...FEES, makerExits: true}
            );
            assert.equal(engine.tradeHistory[0].exitOrder.price, 105, 'cannot fill better than the market gave');
        });

        it('applies the same trade-through rule to shorts', async () => {
            // short TP target is 100/1.03 ≈ 97.087. A bar bottoming above it must not fill.
            // (Deliberately not testing exact equality here — the engine computes
            // 100*(1/1.03) and the test would compute 100/1.03, which need not be bit-identical.)
            const noFill = await runBackTest(
                {0: State.STATE_ENTER_SHORT},
                [candle(0, 101, 102, 99, 100), candle(1, 100, 100.5, 97.5, 98), candle(2, 98, 99, 97.6, 98)],
                {...FEES, makerExits: true}
            );
            assert.isNull(noFill.tradeHistory[0].exitOrder, 'short TP not reached, no fill');

            const through = await runBackTest(
                {0: State.STATE_ENTER_SHORT},
                [candle(0, 101, 102, 99, 100), candle(1, 100, 100.5, 95, 96), candle(2, 96, 97, 95, 96)],
                {...FEES, makerExits: true}
            );
            assert.isTrue(through.tradeHistory[0].exitWasMaker);
            assert.closeTo(through.tradeHistory[0].exitOrder.price, 100 / 1.03, 1e-9, 'short TP fills at target');
        });
    });

    describe('flag on — market exits keep taker accounting', function () {

        it('charges takerFee and slippage on a stop-loss', async () => {
            const engine = await runBackTest(
                {0: State.STATE_ENTER_LONG},
                [candle(0, 99, 101, 98.5, 100), candle(1, 100, 101, 97, 97.5), candle(2, 97, 98, 96, 97)],
                {...FEES, makerExits: true, slippage: 0.001}
            );
            const trade = engine.tradeHistory[0];
            assert.isTrue(trade.stopTriggered);
            assert.isFalse(trade.exitWasMaker, 'a stop is a market order, never a maker fill');
            const stop = trade.entryOrder.price * 0.98;
            assert.closeTo(trade.exitOrder.price, stop * (1 - 0.001), 1e-9, 'stop exit still loses slippage');
        });

        it('charges takerFee and slippage on a strategy-signalled exit', async () => {
            const engine = await runBackTest(
                {0: State.STATE_ENTER_LONG, 1: State.STATE_TAKE_PROFIT},
                [candle(0, 99, 101, 98.5, 100), candle(1, 100, 102, 99.5, 101.5), candle(2, 101, 102, 100, 101)],
                {...FEES, makerExits: true, slippage: 0.001}
            );
            const trade = engine.tradeHistory[0];
            assert.isFalse(trade.exitWasMaker, 'signal exits cross the spread');
            assert.closeTo(trade.exitOrder.price, 101.5 * (1 - 0.001), 1e-9, 'signal exit fills at close minus slippage');
        });
    });

    describe('regression guard', function () {

        it('produces identical results to the pre-GHBF-42 model when the flag is off', async () => {
            const scenarios = [
                {script: {0: State.STATE_ENTER_LONG}, candles: ENTRY_THEN_TP},
                {script: {0: State.STATE_ENTER_LONG}, candles: [candle(0, 99, 101, 98.5, 100), candle(1, 100, 101, 97, 97.5), candle(2, 97, 98, 96, 97)]},
                {script: {0: State.STATE_ENTER_SHORT}, candles: [candle(0, 101, 102, 99, 100), candle(1, 100, 100.5, 95, 96), candle(2, 96, 97, 95, 96)]},
                {script: {0: State.STATE_ENTER_LONG, 1: State.STATE_TAKE_PROFIT}, candles: [candle(0, 99, 101, 98.5, 100), candle(1, 100, 102, 99.5, 101.5), candle(2, 101, 102, 100, 101)]},
            ];
            for (const {script, candles} of scenarios) {
                const engine = await runBackTest(script, candles, {...FEES, slippage: 0.0005});
                const trade = engine.tradeHistory[0];
                // pre-change behaviour: taker on both legs, slippage on every exit
                const entryValue = trade.entryOrder.amount * trade.entryOrder.price;
                const exitValue = trade.exitOrder.amount * trade.exitOrder.price;
                const isLong = trade.entryOrder.side === 'buy';
                const raw = isLong ? (exitValue - entryValue) : (entryValue - exitValue);
                const expected = 1000 + raw - (entryValue * 0.001) - (exitValue * 0.001);
                assert.closeTo(engine.funds, expected, 1e-9, 'flag off must charge takerFee on both legs');
                assert.isFalse(trade.exitWasMaker);
            }
        });
    });
});
