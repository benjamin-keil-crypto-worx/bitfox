const {Analysis} = require("./Analysis");

/**
 * Regime classification — measurement, not prediction.
 *
 * Classifying the regime the market is IN is a reading. Forecasting the regime it is
 * ENTERING is not, and the `Regime` strategy (GHBF-32) already failed walk-forward doing
 * exactly that. This module only ever describes the present.
 *
 * Three independent dimensions, deliberately NOT combined into a composite score. A
 * single number would hide which dimension moved and would invite exactly the
 * "confidence: 78%" framing the signalling layer exists to avoid.
 */

/** Documented constants rather than tuned parameters — these are conventional ADX/percentile cuts. */
const THRESHOLDS = {
    adx: {ranging: 20, trending: 25},          // <20 ranging, 20-25 transitional, >25 trending
    volPercentile: {low: 33, elevated: 66},    // percentile of ATR% within the loaded window
};

/** Default horizons. Short/medium/long are relative labels, not claims about holding period. */
const DEFAULT_HORIZONS = {short: '15m', medium: '4h', long: '1d'};

/**
 * @param adx {Number|null}
 * @return {String} 'ranging' | 'transitional' | 'trending' | 'unknown'
 */
function trendBucket(adx) {
    if (adx == null || Number.isNaN(adx)) return 'unknown';
    if (adx < THRESHOLDS.adx.ranging) return 'ranging';
    if (adx <= THRESHOLDS.adx.trending) return 'transitional';
    return 'trending';
}

/**
 * @param percentile {Number|null}
 * @return {String} 'low' | 'normal' | 'elevated' | 'unknown'
 */
function volBucket(percentile) {
    if (percentile == null || Number.isNaN(percentile)) return 'unknown';
    if (percentile < THRESHOLDS.volPercentile.low) return 'low';
    if (percentile <= THRESHOLDS.volPercentile.elevated) return 'normal';
    return 'elevated';
}

/**
 * Classify one cell from its candles.
 *
 * @param candles {Array<Array<Number>>} ending at the last CLOSED candle
 * @param timeframe {String}
 * @return {Object} the regime reading for this cell
 */
function classify(candles, timeframe) {
    let a = Analysis.from(candles);
    let t = a.trend();
    let v = a.volatility();
    let adx = t.adx ? t.adx.adx : null;

    return {
        timeframe,
        timestamp: a.timestamp(),
        price: t.price,
        adx,
        trend: trendBucket(adx),
        volPercentile: v.atrPercentile,
        volatility: volBucket(v.atrPercentile),
        atrPct: v.atrPct,
        // Structure is reported as an ordering, never scored. The trend-gate measurement
        // (2026-08-02, 15,073 trades) found -0.39%/trade BOTH with and against the EMA200
        // trend, so treating "with trend" as favourable would assert what the data denies.
        stackOrder: t.stackOrder,
        aboveEma200: (t.ema[200] != null) ? t.price > t.ema[200] : null,
        aboveEma50: (t.ema[50] != null) ? t.price > t.ema[50] : null,
        windowBars: candles.length,
    };
}

/**
 * Regime key used to bucket historical trades. Combines the two measured dimensions;
 * structure is excluded on purpose — it has no measured relationship to outcomes.
 *
 * @param trend {String}
 * @param vol {String}
 * @return {String} e.g. "trending/elevated"
 */
function key(trend, vol) { return `${trend}/${vol}`; }

/** Every bucket that can exist, in a STABLE order (see ConditionalStats on why order matters). */
const ALL_KEYS = ['ranging', 'transitional', 'trending']
    .flatMap(t => ['low', 'normal', 'elevated'].map(v => key(t, v)));

module.exports = {THRESHOLDS, DEFAULT_HORIZONS, trendBucket, volBucket, classify, key, ALL_KEYS};
