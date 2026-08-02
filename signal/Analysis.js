const {Strategy} = require("../strategies/Strategy");

/**
 * Class Analysis
 *
 * Computes indicator READINGS for the latest closed candle. It deliberately produces
 * numbers and states, never opinions — interpretation is the user's job. See
 * `signal/Formatter.js` for why that separation is enforced rather than encouraged.
 *
 * Every reading is taken from the LAST element of an indicator array. Indicator arrays
 * are shorter than the candle array by their warm-up, so last-of-array corresponds to
 * the latest candle by construction; no offset arithmetic is needed for a live read.
 * (This is the same alignment `Strategy.valueAt` applies when `isBackTest` is false.)
 */
class Analysis extends Strategy {

    /**
     * @param candles {Array<Array<Number>>} OHLCV rows, last entry must be a CLOSED candle
     * @return {Analysis}
     */
    static from(candles) {
        let a = new Analysis({});
        a.candles = candles;
        return a;
    }

    constructor(args) {
        super(args);
        this.setContext('Analysis');
        this.candles = [];
    }

    /** @return {Number} close of the latest closed candle */
    price() { return this.candles[this.candles.length - 1][4]; }

    /** @return {Number} timestamp of the latest closed candle */
    timestamp() { return this.candles[this.candles.length - 1][0]; }

    /**
     * @param name {String} indicator class name from lib/indicators/Indicators.js
     * @param args {Object} indicator arguments
     * @return {Array} the raw indicator series
     */
    series(name, args) {
        this.setIndicator(this.candles, args, name);
        return this.getIndicator() || [];
    }

    /**
     * @param name {String}
     * @param args {Object}
     * @return {any} the reading for the latest closed candle, or null when warm-up is incomplete
     */
    latest(name, args) {
        let s = this.series(name, args);
        return s.length ? s[s.length - 1] : null;
    }

    /**
     * How many bars ago the SuperTrend direction last changed.
     * @param series {Array<{trend:String}>}
     * @return {Number|null} 0 means it flipped on the latest candle
     */
    barsSinceFlip(series) {
        if (!series || series.length === 0) return null;
        let current = series[series.length - 1].trend;
        for (let i = series.length - 2, bars = 1; i >= 0; i--, bars++) {
            if (series[i].trend !== current) return bars - 1;
        }
        return null; // never flipped inside the available window
    }

    /**
     * @return {Object} EMA stack, SuperTrend state, ADX
     */
    trend() {
        let price = this.price();
        let ema = {};
        for (let p of [20, 50, 100, 200]) ema[p] = this.latest('EMAIndicator', {period: p});

        let stSeries = this.series('SuperTrendIndicator', {});
        let st = stSeries.length ? stSeries[stSeries.length - 1] : null;

        let periods = [20, 50, 100, 200].filter(p => ema[p] != null);
        let values = periods.map(p => ema[p]);
        let descending = values.every((v, i) => i === 0 || values[i - 1] > v);
        let ascending = values.every((v, i) => i === 0 || values[i - 1] < v);

        return {
            price,
            ema,
            // reported as an ordering, not a verdict: "20>50>100>200" states a fact about
            // the numbers; "bullish" would state a conclusion the backtests do not support
            stackOrder: periods.length < 4 ? null : (descending ? '20>50>100>200' : ascending ? '20<50<100<200' : 'mixed'),
            superTrend: st ? {trend: st.trend, value: st.value, barsSinceFlip: this.barsSinceFlip(stSeries)} : null,
            adx: this.latest('AdxIndicator', {}),
        };
    }

    /** @return {Object} RSI, MACD, MFI, Stochastic */
    momentum() {
        return {
            price: this.price(),
            rsi: this.latest('RsiIndicator', {period: 14}),
            macd: this.latest('MacdIndicator', {}),
            mfi: this.latest('MfiIndicator', {}),
            stochastic: this.latest('StochasticIndicator', {}),
        };
    }

    /** @return {Object} Donchian channel and Bollinger bands */
    levels() {
        return {
            price: this.price(),
            donchian: this.latest('DonchianIndicator', {period: 20}),
            bollinger: this.latest('BollingerIndicator', {}),
        };
    }

    /**
     * @return {Object} ATR (absolute and as % of price), Bollinger width, and where current
     *                  ATR% sits in its own recent distribution
     */
    volatility() {
        let price = this.price();
        let atrSeries = this.series('AtrIndicator', {period: 14});
        let atr = atrSeries.length ? atrSeries[atrSeries.length - 1] : null;
        let boll = this.latest('BollingerIndicator', {});

        let percentile = null;
        if (atrSeries.length > 20) {
            // percentile of the current reading within the available ATR history
            let below = atrSeries.filter(v => v < atr).length;
            percentile = below / atrSeries.length * 100;
        }
        return {
            price,
            atr,
            atrPct: atr != null ? atr / price * 100 : null,
            bbWidthPct: boll ? (boll.upper - boll.lower) / price * 100 : null,
            atrPercentile: percentile,
        };
    }
}

module.exports = {Analysis};
