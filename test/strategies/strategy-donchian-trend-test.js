"use strict";

const chai = require("chai");
const {State} = require("../../lib/states/States");
const {DonchianTrend} = require("../../strategies/DonchianTrend");

/**
 * Synthetic series rather than the shared fixture: the strategy needs 200+ bars just to warm
 * up EMA(200), and a hand-built rise-then-crash series makes the breakout and the exit land
 * at indices the test can name exactly.
 *
 * candle: [timestamp, open, high, low, close, volume]
 */
const HOUR = 3600000;
// the per-bar advance (0.2) must exceed the intrabar range (0.05) or the previous bar's high
// would always sit above the current close and no breakout could ever print
const STEP = 0.2, WICK = 0.05;
function buildCandles(riseBars, crashBars) {
    const out = [];
    let price = 100;
    for (let i = 0; i < riseBars; i++) {
        price = 100 + i * STEP;                      // steady uptrend -> close above EMA200
        out.push([1700000000000 + i * HOUR, price, price + WICK, price - WICK, price, 1000]);
    }
    const peak = price;
    for (let i = 0; i < crashBars; i++) {
        price = peak - (i + 1) * 2;                  // sharp reversal -> stop / channel exit
        out.push([1700000000000 + (riseBars + i) * HOUR, price, price + WICK, price - WICK, price, 1000]);
    }
    return out;
}

describe("Test DonchianTrend", () => {

    const RISE = 220, CRASH = 40;
    const candles = buildCandles(RISE, CRASH);

    describe("indicator setup", () => {
        let strategy = DonchianTrend.init({});
        before(async () => { await strategy.setup(candles.map(c => [...c])); });

        it("initializes every indicator", () => {
            chai.assert.isTrue(strategy.entryChannel.length > 0);
            chai.assert.isTrue(strategy.exitChannel.length > 0);
            chai.assert.isTrue(strategy.atr.length > 0);
            chai.assert.isTrue(strategy.trendEma.length > 0);
        });

        it("sets the shortest indicator last so the candle window stays in range", () => {
            // BackTest.adjustForDelay trims candles to the LAST-set indicator
            chai.assert.equal(strategy.getIndicator(), strategy.trendEma);
            chai.assert.isTrue(strategy.trendEma.length <= strategy.entryChannel.length);
            chai.assert.isTrue(strategy.trendEma.length <= strategy.exitChannel.length);
            chai.assert.isTrue(strategy.trendEma.length <= strategy.atr.length);
        });
    });

    describe("entry", () => {
        let strategy;
        before(async () => {
            strategy = DonchianTrend.init({});
            await strategy.setup(candles.map(c => [...c]));
        });

        it("starts in STATE_PENDING", () => {
            chai.assert.equal(strategy.getState(), State.STATE_PENDING);
        });

        it("enters long on a breakout above the channel while above the trend EMA", async () => {
            const result = await strategy.run(0, true);
            chai.assert.equal(strategy.getState(), State.STATE_ENTER_LONG);
            chai.assert.equal(result.state, State.STATE_ENTER_LONG);
        });

        it("reports a stopPrice and riskPct so the engine can size the position", async () => {
            const s = DonchianTrend.init({});
            await s.setup(candles.map(c => [...c]));
            const result = await s.run(0, true);
            chai.assert.isNumber(result.custom.stopPrice);
            chai.assert.equal(result.custom.riskPct, 0.01);
            chai.assert.isBelow(result.custom.stopPrice, s.entryPrice, "long stop sits below entry");
        });

        it("places the stop stopAtrMult x ATR below entry", async () => {
            const s = DonchianTrend.init({strategyExtras: {stopAtrMult: 2.0}});
            await s.setup(candles.map(c => [...c]));
            const result = await s.run(0, true);
            const atr = s.valueAt(s.atr, 0, true);
            chai.assert.approximately(result.custom.stopPrice, s.entryPrice - 2.0 * atr, 1e-9);
        });

        it("does not enter short while price is above the trend EMA", async () => {
            const s = DonchianTrend.init({});
            await s.setup(candles.map(c => [...c]));
            for (let i = 0; i < 10; i++) {
                const r = await s.run(i, true);
                chai.assert.notEqual(r.state, State.STATE_ENTER_SHORT);
                if (r.state === State.STATE_ENTER_LONG) break;
            }
        });

        it("honours a long-only side preference", async () => {
            const s = DonchianTrend.init({sidePreference: "long"});
            await s.setup(candles.map(c => [...c]));
            chai.assert.equal(s.sidePreference, "long");
            const r = await s.run(0, true);
            chai.assert.equal(r.state, State.STATE_ENTER_LONG);
        });
    });

    describe("exit", () => {
        it("exits the position once the market reverses", async () => {
            const s = DonchianTrend.init({});
            await s.setup(candles.map(c => [...c]));

            const entry = await s.run(0, true);
            chai.assert.equal(entry.state, State.STATE_ENTER_LONG);

            // the engine moves the strategy on once the entry order is handled
            s.setState(State.STATE_AWAIT_TAKE_PROFIT);
            s.inPosition = true;
            s.side = 'long';

            const window = s.trendEma.length;
            let exitState = null, exitReason = null;
            for (let i = 1; i < window; i++) {
                const r = await s.run(i, true);
                if ([State.STATE_TAKE_PROFIT, State.STATE_STOP_LOSS_TRIGGERED].includes(r.state)) {
                    exitState = r.state; exitReason = r.custom.reason; break;
                }
            }
            chai.assert.isNotNull(exitState, "position must close during the crash");
            chai.assert.oneOf(exitReason, ['atr_stop', 'channel_exit', 'max_bars']);
        });

        it("holds the position while the trend is intact", async () => {
            const s = DonchianTrend.init({});
            await s.setup(candles.map(c => [...c]));
            await s.run(0, true);
            s.setState(State.STATE_AWAIT_TAKE_PROFIT);
            s.inPosition = true;
            s.side = 'long';
            const r = await s.run(1, true);
            chai.assert.equal(r.state, State.STATE_AWAIT_TAKE_PROFIT);
        });
    });

    describe("state handling", () => {
        let strategy = DonchianTrend.init({});

        it("round-trips every state through setState", () => {
            const states = [
                State.STATE_AWAIT_TAKE_PROFIT, State.STATE_TAKE_PROFIT,
                State.STATE_STOP_LOSS_TRIGGERED, State.STATE_AWAIT_ORDER_FILLED,
                State.STATE_ENTER_LONG, State.STATE_ENTER_SHORT
            ];
            states.forEach(st => {
                strategy.setState(st);
                chai.assert.equal(strategy.getState(), st);
            });
        });

        it("clears tracked position state when the engine resets to PENDING", () => {
            strategy.inPosition = true;
            strategy.side = 'long';
            strategy.setState(State.STATE_PENDING);
            chai.assert.equal(strategy.getState(), State.STATE_PENDING);
            chai.assert.isFalse(strategy.inPosition);
            chai.assert.isNull(strategy.side);
        });

        it("holds during indicator warm-up instead of signalling", async () => {
            const s = DonchianTrend.init({});
            // no setup() -> no indicators; run must not throw or emit an entry
            s.entryChannel = []; s.exitChannel = []; s.atr = []; s.trendEma = [];
            s.kline = {c: []};
            const r = await s.run(0, true);
            chai.assert.equal(r.state, State.STATE_PENDING);
            chai.assert.equal(r.custom.reason, 'warmup');
        });
    });
});
