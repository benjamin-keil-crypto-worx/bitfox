const {Phoenix} = require("../strategies/Phoenix");
const {SuperTrend} = require("../strategies/SuperTrend");
const {RSITrend} = require("../strategies/RSITrend");
const {EmaTrend} = require("../strategies/EmaTrend");
const {Bollinger} = require("../strategies/Bollinger");
const {MfiMacd} = require("../strategies/MfiMacd");
const {SmartAccumulate} = require("../strategies/SmartAccumulate");
const {ZemaCrossOver} = require("../strategies/ZemaCrossOver");
const {ThorsHammer} = require("../strategies/ThorsHammer");
const {DonchianTrend} = require("../strategies/DonchianTrend");

/**
 * Strategies the signalling layer can read and benchmark.
 *
 * Registered here rather than discovered, so `/signal` and `/backtest` accept exactly
 * the set that is known to run against the honest engine. MarketMaker is deliberately
 * absent — it is STATE_CONTEXT_INDEPENDENT and incompatible with the backtest engine.
 */
const REGISTRY = {
    Phoenix, SuperTrend, RSITrend, EmaTrend, Bollinger,
    MfiMacd, SmartAccumulate, ZemaCrossOver, ThorsHammer, DonchianTrend,
};

/** @return {Array<String>} */
function names() { return Object.keys(REGISTRY); }

/**
 * Case-insensitive lookup so `/backtest ADAUSDT 15m bollinger` works.
 * @param name {String}
 * @return {{name:String, cls:Function}|null}
 */
function resolve(name) {
    if (!name) return null;
    let key = Object.keys(REGISTRY).find(k => k.toLowerCase() === String(name).toLowerCase());
    return key ? {name: key, cls: REGISTRY[key]} : null;
}

module.exports = {REGISTRY, names, resolve};
