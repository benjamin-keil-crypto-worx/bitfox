const {assert} = require('chai');
const utils = require('../../lib/utility/util');
const {Regime} = require('../../strategies/Regime');
const {State} = require('../../lib/states/States');

const ohlcv = require('../resources/ohlcv.json');

describe('Regime Strategy', function () {

    let strategy;
    let data;

    beforeEach(async () => {
        data = utils.deepCopy(ohlcv);
        strategy = Regime.init({sidePreference: 'biDirectional'});
        await strategy.setup(data.data);
    });

    it('sets up all five indicators, aligned to the ADX candle window', () => {
        assert.isAbove(strategy.adx.length, 0);
        assert.isAbove(strategy.superTrend.length, 0);
        assert.isAbove(strategy.rsi.length, 0);
        assert.isAbove(strategy.atr.length, 0);
        assert.isAbove(strategy.bollinger.length, 0);
        // the engine aligns against the LAST-set indicator, which must be ADX
        // (longest warm-up, so every other array covers the whole window)
        assert.equal(strategy.getIndicator().length, strategy.adx.length);
        for (const arr of [strategy.superTrend, strategy.rsi, strategy.atr, strategy.bollinger]) {
            assert.isNotNull(strategy.valueAt(arr, 0, true), 'aligned value at window start');
            assert.isNotNull(strategy.valueAt(arr, strategy.adx.length - 1, true), 'aligned value at window end');
        }
        // alignment: the last aligned value equals the raw last element
        assert.deepEqual(strategy.valueAt(strategy.rsi, strategy.adx.length - 1, true), strategy.rsi[strategy.rsi.length - 1]);
    });

    it('starts in STATE_PENDING and setState round-trips', () => {
        assert.equal(strategy.getState(), State.STATE_PENDING);
        for (const s of [State.STATE_ENTER_LONG, State.STATE_ENTER_SHORT, State.STATE_AWAIT_TAKE_PROFIT, State.STATE_PENDING]) {
            strategy.setState(s);
            assert.equal(strategy.getState(), s);
        }
    });

    it('setState(PENDING) clears any tracked position', () => {
        strategy.inPosition = true;
        strategy.side = 'long';
        strategy.setState(State.STATE_PENDING);
        assert.isFalse(strategy.inPosition);
        assert.isNull(strategy.side);
    });

    it('runs over the whole fixture without throwing and only returns known states', async () => {
        const known = Object.values(State);
        for (let i = 0; i < strategy.adx.length; i++) {
            const result = await strategy.run(i, true);
            assert.include(known, result.state, `unknown state at index ${i}`);
            // mimic the engine: process entries so position management is exercised too
            if (result.state === State.STATE_ENTER_LONG || result.state === State.STATE_ENTER_SHORT) {
                strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
            }
            if (result.state === State.STATE_TAKE_PROFIT || result.state === State.STATE_STOP_LOSS_TRIGGERED) {
                strategy.setState(State.STATE_PENDING);
            }
        }
    });

    it('classifies the regime with hysteresis', () => {
        strategy.regime = null;
        assert.equal(strategy.detectRegime({adx: 30}), 'trend');
        assert.equal(strategy.detectRegime({adx: 22}), 'trend', 'hysteresis keeps previous regime');
        assert.equal(strategy.detectRegime({adx: 15}), 'range');
        assert.equal(strategy.detectRegime({adx: 22}), 'range', 'hysteresis keeps previous regime');
    });

    it('exits a long at the ATR stop with STATE_STOP_LOSS_TRIGGERED', async () => {
        const i = 10;
        strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        strategy.inPosition = true;
        strategy.side = 'long';
        strategy.entryRegime = 'trend';
        strategy.entryPrice = Number.MAX_VALUE;
        strategy.stopPrice = Number.MAX_VALUE; // any price is below the stop
        const result = await strategy.run(i, true);
        assert.equal(result.state, State.STATE_STOP_LOSS_TRIGGERED);
        assert.equal(result.custom.reason, 'atr_stop');
        assert.isFalse(strategy.inPosition);
    });

    it('exits a range-mode long at the middle band with STATE_TAKE_PROFIT', async () => {
        // find an index where the close sits at or above the middle band
        let idx = -1;
        for (let i = 5; i < strategy.adx.length; i++) {
            const boll = strategy.valueAt(strategy.bollinger, i, true);
            const price = strategy.closeAt(i, true, null);
            if (boll && price >= boll.middle) { idx = i; break; }
        }
        assert.isAtLeast(idx, 0, 'fixture must contain a close above the middle band');
        strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        strategy.inPosition = true;
        strategy.side = 'long';
        strategy.entryRegime = 'range';
        strategy.entryPrice = 0;
        strategy.stopPrice = 0; // never hit
        const result = await strategy.run(idx, true);
        assert.equal(result.state, State.STATE_TAKE_PROFIT);
        assert.equal(result.custom.reason, 'mean_reversion_target');
    });

    it('ratchets a trending long trailing stop upward, never down', async () => {
        const i = 10;
        strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        strategy.inPosition = true;
        strategy.side = 'long';
        strategy.entryRegime = 'trend';
        strategy.entryPrice = 0;
        strategy.stopPrice = -1;
        await strategy.run(i, true);
        const raised = strategy.stopPrice;
        assert.isAbove(raised, -1, 'trailing stop must ratchet up');
        if (strategy.inPosition) {
            // re-running at the same price must never lower the stop
            await strategy.run(i, true);
            assert.isAtLeast(strategy.stopPrice, raised);
        }
    });
});
