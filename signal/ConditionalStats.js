const {Analysis} = require("./Analysis");
const regime = require("./Regime");
const {MIN_MEANINGFUL_TRADES} = require("./Formatter");

/**
 * Per-regime statistics for realised trades.
 *
 * ⚠ THIS MODULE'S MAIN JOB IS NOT TO LIE.
 *
 * Bucketing trades by regime is a multiple-comparisons problem. Slice 730 trades three
 * ways by trend and three ways by volatility and some bucket will show a spectacular
 * profit factor by chance alone. This repo has already been burned by that exact shape
 * three times — Bollinger 1d PF 1.20 on n=14, Crocodile 1d PF 3.65 on n=14 that collapsed
 * to 1.07 pooled at n=177, Bollinger 15m PF 1.33 that died at 1 of 8 symbols.
 *
 * Bucketing makes thin samples the default rather than the exception, so the safeguards
 * are structural rather than advisory:
 *
 *   1. Buckets below MIN_MEANINGFUL_TRADES are flagged `reliable: false`.
 *   2. `bucketsExamined` is reported, so "best of 9" can be discounted as selection.
 *   3. Buckets are emitted in a FIXED order (regime.ALL_KEYS). Sorting by performance and
 *      showing the winner is selection bias, mechanised.
 *   4. The unconditional pooled baseline is always returned alongside.
 */

const COST_PCT = 0.25;   // 0.1% taker x2 + 0.05% slippage, matching the benchmark convention

/**
 * Map a candle index to a value in an indicator series that is shorter by its warm-up.
 * @return {any|null}
 */
function atCandle(series, candleCount, candleIndex) {
    if (!series || series.length === 0) return null;
    let offset = candleCount - series.length;
    let i = candleIndex - offset;
    return (i >= 0 && i < series.length) ? series[i] : null;
}

/**
 * Trailing percentile of `values[i]` within `values[0..i]`.
 *
 * Deliberately NOT the percentile within the whole window: that would rank a past bar
 * against volatility that had not happened yet, which is lookahead and would make every
 * bucketed result optimistic.
 *
 * @return {Array<Number|null>}
 */
function trailingPercentile(values) {
    let out = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
        if (values[i] == null) continue;
        let seen = 0, below = 0;
        for (let j = 0; j <= i; j++) {
            if (values[j] == null) continue;
            seen++;
            if (values[j] < values[i]) below++;
        }
        out[i] = seen > 1 ? (below / seen) * 100 : null;
    }
    return out;
}

function summarise(returns) {
    if (!returns.length) return null;
    let wins = returns.filter(r => r > 0);
    let losses = returns.filter(r => r <= 0);
    let gp = wins.reduce((a, b) => a + b, 0);
    let gl = Math.abs(losses.reduce((a, b) => a + b, 0));
    return {
        n: returns.length,
        pf: gl === 0 ? Infinity : gp / gl,
        avg: returns.reduce((a, b) => a + b, 0) / returns.length,
        winRate: wins.length / returns.length * 100,
        reliable: returns.length >= MIN_MEANINGFUL_TRADES,
    };
}

/**
 * Bucket a strategy's realised trades by the regime that held at ENTRY.
 *
 * @param trades {Array} engine tradeHistory entries with entryOrder/exitOrder/entryTimestamp
 * @param candles {Array<Array<Number>>}
 * @return {Object} {pooled, buckets, bucketsExamined, reliableBuckets, minTrades}
 */
function bucketByRegime(trades, candles) {
    let a = Analysis.from(candles);
    let adxSeries = a.series('AdxIndicator', {});
    let atrSeries = a.series('AtrIndicator', {period: 14});
    let atrPctSeries = atrSeries.map((v, i) => {
        let candleIdx = candles.length - atrSeries.length + i;
        let close = candles[candleIdx] ? candles[candleIdx][4] : null;
        return (v != null && close) ? v / close * 100 : null;
    });
    let volPct = trailingPercentile(atrPctSeries);

    let tsIndex = new Map(candles.map((c, i) => [c[0], i]));
    let byBucket = {};
    let pooled = [];

    for (const t of trades) {
        if (!t.entryOrder || !t.exitOrder) continue;
        let ts = t.entryTimestamp instanceof Date ? t.entryTimestamp.getTime() : Number(t.entryTimestamp);
        let idx = tsIndex.get(ts);
        if (idx == null) continue;

        let isLong = t.entryOrder.side === 'buy';
        let ret = (isLong ? 1 : -1) *
            (t.exitOrder.price - t.entryOrder.price) / t.entryOrder.price * 100 - COST_PCT;
        pooled.push(ret);

        let adxVal = atCandle(adxSeries, candles.length, idx);
        let volVal = atCandle(volPct, candles.length, idx);
        let k = regime.key(
            regime.trendBucket(adxVal ? adxVal.adx : null),
            regime.volBucket(volVal)
        );
        (byBucket[k] ||= []).push(ret);
    }

    // FIXED order — never sorted by performance
    let buckets = regime.ALL_KEYS.map(k => ({key: k, ...(summarise(byBucket[k] || []) || {n: 0, reliable: false})}));
    let populated = buckets.filter(b => b.n > 0);

    return {
        pooled: summarise(pooled),
        buckets,
        bucketsExamined: populated.length,
        reliableBuckets: populated.filter(b => b.reliable).length,
        minTrades: MIN_MEANINGFUL_TRADES,
    };
}

module.exports = {bucketByRegime, trailingPercentile, summarise, atCandle, COST_PCT};
