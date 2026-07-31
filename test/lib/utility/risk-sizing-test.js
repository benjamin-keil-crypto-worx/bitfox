"use strict";

const chai = require("chai");
const utils = require("../../../lib/utility/util");

describe("Test risk based position sizing", () => {

    it("sizes so the stop costs exactly riskPct of equity", () => {
        // risking 1% of 10000 = 100 quote, over a 5 quote stop distance -> 20 base units
        const size = utils.riskPositionSize(10000, 100, 95, 0.01);
        chai.assert.equal(size, 20);
        chai.assert.equal(size * (100 - 95), 100, "loss at the stop equals the intended risk");
    });

    it("sizes a wider stop smaller for the same risk", () => {
        const tight = utils.riskPositionSize(10000, 100, 95, 0.01);
        const wide = utils.riskPositionSize(10000, 100, 80, 0.01);
        chai.assert.isBelow(wide, tight);
        chai.assert.equal(wide * (100 - 80), 100, "same quote risk on the wider stop");
    });

    it("works symmetrically for a short stop above the entry", () => {
        const size = utils.riskPositionSize(10000, 100, 105, 0.01);
        chai.assert.equal(size, 20);
    });

    it("caps notional at maxNotionalMult x equity", () => {
        // a 0.1 wide stop implies 1000 units = 100000 notional on 10000 equity
        const size = utils.riskPositionSize(10000, 100, 99.9, 0.01);
        chai.assert.equal(size, 100, "capped to 1x notional (10000/100)");
    });

    it("honours a higher notional cap when asked", () => {
        const size = utils.riskPositionSize(10000, 100, 99.9, 0.01, 3);
        chai.assert.equal(size, 300);
    });

    it("returns null for inputs that cannot produce a size", () => {
        chai.assert.isNull(utils.riskPositionSize(10000, 100, 100, 0.01), "zero stop distance");
        chai.assert.isNull(utils.riskPositionSize(10000, 100, 95, 0), "zero risk");
        chai.assert.isNull(utils.riskPositionSize(0, 100, 95, 0.01), "no equity");
        chai.assert.isNull(utils.riskPositionSize(10000, 0, 95, 0.01), "no price");
        chai.assert.isNull(utils.riskPositionSize(NaN, 100, 95, 0.01), "non-finite equity");
        chai.assert.isNull(utils.riskPositionSize(10000, 100, undefined, 0.01), "missing stop");
    });
});
