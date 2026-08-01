/**
 * Timeframe helpers for the signalling layer.
 *
 * Exchanges hand back a final candle that is still forming. Reading indicators off it
 * gives values that change under the user between two identical queries, so the
 * signalling layer always works from the last CLOSED candle.
 */

const UNIT_MS = {m: 60000, h: 3600000, d: 86400000, w: 604800000};

/** Supported timeframes, deliberately explicit — an unknown string is a user error, not a guess. */
const SUPPORTED = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w'];

/**
 * @param timeframe {String} e.g. "15m"
 * @return {Number|null} duration in ms, or null when the timeframe is not supported
 */
function toMillis(timeframe) {
    if (typeof timeframe !== 'string') return null;
    let match = /^(\d+)([mhdw])$/.exec(timeframe.trim().toLowerCase());
    if (!match) return null;
    let [, count, unit] = match;
    return Number(count) * UNIT_MS[unit];
}

/**
 * @param timeframe {String}
 * @return {Boolean} whether the signalling layer accepts this timeframe
 */
function isSupported(timeframe) {
    return typeof timeframe === 'string' && SUPPORTED.includes(timeframe.trim().toLowerCase());
}

/**
 * Drop a trailing candle that has not closed yet.
 *
 * @param candles {Array<Array<Number>>} [timestamp, open, high, low, close, volume]
 * @param timeframe {String}
 * @param now {Number} epoch ms, injectable so tests are deterministic
 * @return {Array<Array<Number>>} candles up to and including the last closed one
 */
function dropUnclosed(candles, timeframe, now = Date.now()) {
    if (!Array.isArray(candles) || candles.length === 0) return candles;
    let ms = toMillis(timeframe);
    if (ms == null) return candles;
    let last = candles[candles.length - 1];
    // a candle stamped at t covers [t, t+ms); it has closed only once now >= t+ms
    return (last[0] + ms > now) ? candles.slice(0, -1) : candles;
}

module.exports = {toMillis, isSupported, dropUnclosed, SUPPORTED};
