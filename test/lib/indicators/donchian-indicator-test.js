"use strict";

const chai = require("chai");
const {DonchianIndicator} = require("../../../lib/indicators/Indicators");
const {IndicatorList} = require("../../../lib/indicators/Indicators");

describe("Test Donchian Indicator", () => {

    // h/l chosen so every channel value is checkable by hand
    const h = [1, 2, 3, 4, 5, 6];
    const l = [0, 1, 2, 3, 4, 5];
    const c = [1, 2, 3, 4, 5, 6];

    it("produces one row per bar after the warm-up", () => {
        const out = DonchianIndicator.getData(c, h, l, c, c, {period: 3}, null);
        chai.assert.equal(out.length, h.length - 3);
    });

    it("computes upper/lower/middle from the preceding window", () => {
        const out = DonchianIndicator.getData(c, h, l, c, c, {period: 3}, null);
        // row 0 -> bar 3, built from bars 0..2
        chai.assert.deepEqual(out[0], {upper: 3, lower: 0, middle: 1.5});
        // row 1 -> bar 4, built from bars 1..3
        chai.assert.deepEqual(out[1], {upper: 4, lower: 1, middle: 2.5});
        // row 2 -> bar 5, built from bars 2..4
        chai.assert.deepEqual(out[2], {upper: 5, lower: 2, middle: 3.5});
    });

    it("excludes the current bar so a breakout is detectable", () => {
        // without this property close > upper could never be true and the strategy
        // built on it would never emit a single entry
        const hh = [1, 1, 1, 10];
        const ll = [1, 1, 1, 1];
        const cc = [1, 1, 1, 10];
        const out = DonchianIndicator.getData(cc, hh, ll, cc, cc, {period: 3}, null);
        chai.assert.equal(out.length, 1);
        chai.assert.equal(out[0].upper, 1, "channel must not absorb the breakout bar's own high");
        chai.assert.isTrue(cc[3] > out[0].upper, "close breaks out of the prior channel");
    });

    it("defaults to a period of 20", () => {
        const big = Array.from({length: 30}, (_, i) => i + 1);
        const out = DonchianIndicator.getData(big, big, big, big, big, {}, null);
        chai.assert.equal(out.length, 10);
    });

    it("returns an empty array when there is not enough data", () => {
        const out = DonchianIndicator.getData([1, 2], [1, 2], [1, 2], [1, 2], [1, 2], {period: 20}, null);
        chai.assert.deepEqual(out, []);
    });

    it("is registered in the indicator list", () => {
        chai.assert.include(IndicatorList.getData(), "DonchianIndicator");
    });
});
