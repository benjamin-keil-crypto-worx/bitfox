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

/**
 * Ledger verdicts, mirrored from `.claude/context/STRATEGY-LEDGER.md`.
 *
 * Hardcoded rather than parsed: the ledger is prose and a parser would break silently,
 * which is worse than a stale line here. Exposed so an AI client cannot present a no-go
 * strategy as viable — without this, `list_strategies` reads as a menu of options.
 *
 * Keep in sync when a ledger verdict changes.
 */
const LEDGER_STATUS = {
    DonchianTrend:   'borderline — the only strategy with positive walk-forward OOS (pooled PF 1.456 over 334 trades); clears 5 of 6 ship-bar criteria. Intended for 1d',
    Phoenix:         'no-go — best honest result ADA 4h PF 1.05; does not generalize (BTC 4h PF 0.78)',
    Bollinger:       'no-go — settled 2026-08-02; BTC 15m PF 1.26 was a single-cell wonder, pooled median PF 0.96 with 1 of 8 symbols positive over 730 trades',
    SuperTrend:      'no-go — PF 0.75-0.97 everywhere tested. Its old headline figures were a backtest fill-model artifact',
    RSITrend:        'no-go — PF 0.40-0.76',
    EmaTrend:        'no-go — PF 0.38-0.91',
    MfiMacd:         'no-go — PF 0.39-0.91',
    ThorsHammer:     'no-go — PF 0.25-0.87; 1d sample sizes tiny',
    ZemaCrossOver:   'no-go — PF 0.53-0.81, heavy churn',
    SmartAccumulate: 'no-go — PF 0.61-0.86, heavy churn',
};

/** @return {Array<String>} */
function names() { return Object.keys(REGISTRY); }

/** @param name {String} @return {String} */
function status(name) { return LEDGER_STATUS[name] || 'not recorded in the ledger'; }

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

module.exports = {REGISTRY, LEDGER_STATUS, names, status, resolve};
