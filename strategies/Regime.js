const {Strategy} = require("./Strategy")

/**
 * Class Regime
 *
 * Regime-adaptive dual-mode strategy with self-managed, ATR-scaled exits.
 *
 * Regime detection via ADX with a hysteresis band:
 *   - ADX >= adxTrendMin  -> trending regime: trade SuperTrend flips in the DI direction,
 *     exit on SuperTrend reversal or an ATR trailing stop.
 *   - ADX <  adxRangeMax  -> ranging regime: mean-revert at the Bollinger bands with RSI
 *     confirmation, exit at the middle band.
 *   - in between          -> keep the previous regime (prevents mode flapping).
 *
 * All exits are strategy-managed (initial 2xATR stop, trailing stop in trends, regime-flip
 * exits). The engine's profitPct/stopLossPct should be configured as wide disaster
 * backstops only (e.g. profitPct 10, stopLossPct 0.90).
 *
 * Indicator arrays have different warm-ups; this strategy aligns every array to the
 * candle window of the LAST-set indicator via explicit offsets (do not index them raw).
 */
class Regime extends Strategy {

    static init(args) { return new Regime(args); }

    constructor(args) {
        super(args);
        this.setContext("Regime");
        let extras = (args && args.strategyExtras) || {};
        this.adxPeriod = extras.adxPeriod || 14;
        this.adxTrendMin = extras.adxTrendMin || 25;
        this.adxRangeMax = extras.adxRangeMax || 20;
        this.stPeriod = extras.stPeriod || 7;
        this.stMultiplier = extras.stMultiplier || 3;
        this.bbPeriod = extras.bbPeriod || 20;
        this.bbStdDev = extras.bbStdDev || 2;
        this.rsiPeriod = extras.rsiPeriod || 14;
        this.rsiOversold = extras.rsiOversold || 30;
        this.rsiOverbought = extras.rsiOverbought || 70;
        this.atrPeriod = extras.atrPeriod || 14;
        this.stopAtrMult = extras.stopAtrMult || 2.0;
        this.trailAtrMult = extras.trailAtrMult || 2.5;
        this.minBarsBetweenTrades = extras.minBarsBetweenTrades || 6;

        this.regime = null;
        this.inPosition = false;
        this.side = null;
        this.entryPrice = 0;
        this.stopPrice = 0;
        this.entryRegime = null;
        this.barsSinceEntry = 0;
        this.barsSinceExit = Infinity;
    }

    setState(state) {
        this.state = state;
        // the engine resets to PENDING after it processed our exit (or a cancelled order):
        // whatever position we tracked is gone
        if (state === this.states.STATE_PENDING) {
            this.inPosition = false;
            this.side = null;
        }
    }

    getState() { return this.state; }

    async setup(klineCandles) {
        this.setIndicator(klineCandles, {period: this.stPeriod, multiplier: this.stMultiplier}, this.indicators.SuperTrendIndicator.className);
        this.superTrend = this.getIndicator();

        this.setIndicator(klineCandles, {period: this.rsiPeriod}, this.indicators.RsiIndicator.className);
        this.rsi = this.getIndicator();

        this.setIndicator(klineCandles, {period: this.atrPeriod}, this.indicators.AtrIndicator.className);
        this.atr = this.getIndicator();

        this.setIndicator(klineCandles, {period: this.bbPeriod, stdDev: this.bbStdDev}, this.indicators.BollingerIndicator.className);
        this.bollinger = this.getIndicator();

        // ADX has the longest warm-up (2*period) -> set LAST so the engine's candle window
        // matches it (BackTest.adjustForDelay aligns against the last-set indicator)
        this.setIndicator(klineCandles, {period: this.adxPeriod}, this.indicators.AdxIndicator.className);
        this.adx = this.getIndicator();

        // align every array to the ADX candle window: value for candle i is arr[offset + i]
        let window = this.adx.length;
        this.offsets = {
            superTrend: this.superTrend.length - window,
            rsi: this.rsi.length - window,
            atr: this.atr.length - window,
            bollinger: this.bollinger.length - window,
            adx: 0,
            close: this.kline.c.length - window,
        };
        return this;
    }

    valueAt(arr, offset, _index, isBackTest) {
        let i = isBackTest ? offset + _index : arr.length - 1;
        return (i >= 0 && i < arr.length) ? arr[i] : null;
    }

    closeAt(_index, isBackTest, ticker) {
        if (!isBackTest && ticker != null) return ticker;
        return this.valueAt(this.kline.c, this.offsets.close, _index, isBackTest);
    }

    detectRegime(adxEntry) {
        if (adxEntry.adx >= this.adxTrendMin) { this.regime = 'trend'; }
        else if (adxEntry.adx < this.adxRangeMax) { this.regime = 'range'; }
        // hysteresis band: keep previous regime
        return this.regime;
    }

    openPosition(side, price, atrValue) {
        this.inPosition = true;
        this.side = side;
        this.entryPrice = price;
        this.entryRegime = this.regime;
        this.barsSinceEntry = 0;
        this.stopPrice = (side === 'long') ? price - this.stopAtrMult * atrValue : price + this.stopAtrMult * atrValue;
        this.state = (side === 'long') ? this.states.STATE_ENTER_LONG : this.states.STATE_ENTER_SHORT;
    }

    exitPosition(exitState, reason) {
        this.inPosition = false;
        this.side = null;
        this.barsSinceExit = 0;
        this.state = exitState;
        return this.getStrategyResult(this.state, {reason: reason, regime: this.regime});
    }

    async run(_index = 0, isBackTest = false, ticker = null) {
        let adxEntry = this.valueAt(this.adx, this.offsets.adx, _index, isBackTest);
        let st = this.valueAt(this.superTrend, this.offsets.superTrend, _index, isBackTest);
        let rsi = this.valueAt(this.rsi, this.offsets.rsi, _index, isBackTest);
        let atrValue = this.valueAt(this.atr, this.offsets.atr, _index, isBackTest);
        let boll = this.valueAt(this.bollinger, this.offsets.bollinger, _index, isBackTest);
        let price = this.closeAt(_index, isBackTest, ticker);

        // warm-up / data guard: hold until every aligned indicator has a value
        if (adxEntry == null || st == null || rsi == null || atrValue == null || boll == null || price == null) {
            return this.getStrategyResult(this.state, {reason: 'warmup'});
        }

        this.detectRegime(adxEntry);

        if (this.state === this.states.STATE_AWAIT_TAKE_PROFIT && this.inPosition) {
            return this.managePosition(price, st, atrValue, boll);
        }

        if (this.state === this.states.STATE_PENDING) {
            this.barsSinceExit++;
            if (this.barsSinceExit < this.minBarsBetweenTrades) {
                return this.getStrategyResult(this.state, {reason: 'cooldown', regime: this.regime});
            }
            let prevSt = (isBackTest && _index > 0) ? this.valueAt(this.superTrend, this.offsets.superTrend, _index - 1, isBackTest)
                                                    : (this.superTrend.length > 1 ? this.superTrend[this.superTrend.length - 2] : null);
            return this.evaluateEntry(price, adxEntry, st, rsi, atrValue, boll, prevSt);
        }

        // ENTER_* / AWAIT_ORDER_FILLED / transient states: nothing to decide this tick
        return this.getStrategyResult(this.state, {regime: this.regime});
    }

    evaluateEntry(price, adxEntry, st, rsi, atrValue, boll, prevSt) {
        if (this.regime === 'trend') {
            // edge-triggered: enter only on a fresh SuperTrend flip, not while a trend is
            // already running — continuous entries chase extended trends into their stops
            let flippedLong = st.trend === 'long' && prevSt != null && prevSt.trend === 'short';
            let flippedShort = st.trend === 'short' && prevSt != null && prevSt.trend === 'long';
            if (flippedLong && adxEntry.pdi > adxEntry.mdi && this.sidePreference !== 'short') {
                this.openPosition('long', price, atrValue);
            } else if (flippedShort && adxEntry.mdi > adxEntry.pdi && this.sidePreference !== 'long') {
                this.openPosition('short', price, atrValue);
            }
        } else if (this.regime === 'range') {
            if (price <= boll.lower && rsi < this.rsiOversold && this.sidePreference !== 'short') {
                this.openPosition('long', price, atrValue);
            } else if (price >= boll.upper && rsi > this.rsiOverbought && this.sidePreference !== 'long') {
                this.openPosition('short', price, atrValue);
            }
        }
        return this.getStrategyResult(this.state, {regime: this.regime});
    }

    managePosition(price, st, atrValue, boll) {
        this.barsSinceEntry++;

        if (this.side === 'long') {
            if (price <= this.stopPrice) {
                return this.exitPosition(this.states.STATE_STOP_LOSS_TRIGGERED, 'atr_stop');
            }
            if (this.entryRegime === 'trend') {
                // ratchet the trailing stop up; never loosen it
                this.stopPrice = Math.max(this.stopPrice, price - this.trailAtrMult * atrValue);
                if (st.trend === 'short') {
                    return this.exitPosition(price > this.entryPrice ? this.states.STATE_TAKE_PROFIT : this.states.STATE_STOP_LOSS_TRIGGERED, 'trend_reversal');
                }
            } else {
                if (price >= boll.middle) {
                    return this.exitPosition(this.states.STATE_TAKE_PROFIT, 'mean_reversion_target');
                }
                if (this.regime === 'trend') {
                    // the range this trade was betting on is gone
                    return this.exitPosition(price > this.entryPrice ? this.states.STATE_TAKE_PROFIT : this.states.STATE_STOP_LOSS_TRIGGERED, 'regime_flip');
                }
            }
        } else {
            if (price >= this.stopPrice) {
                return this.exitPosition(this.states.STATE_STOP_LOSS_TRIGGERED, 'atr_stop');
            }
            if (this.entryRegime === 'trend') {
                this.stopPrice = Math.min(this.stopPrice, price + this.trailAtrMult * atrValue);
                if (st.trend === 'long') {
                    return this.exitPosition(price < this.entryPrice ? this.states.STATE_TAKE_PROFIT : this.states.STATE_STOP_LOSS_TRIGGERED, 'trend_reversal');
                }
            } else {
                if (price <= boll.middle) {
                    return this.exitPosition(this.states.STATE_TAKE_PROFIT, 'mean_reversion_target');
                }
                if (this.regime === 'trend') {
                    return this.exitPosition(price < this.entryPrice ? this.states.STATE_TAKE_PROFIT : this.states.STATE_STOP_LOSS_TRIGGERED, 'regime_flip');
                }
            }
        }
        return this.getStrategyResult(this.states.STATE_AWAIT_TAKE_PROFIT, {regime: this.regime, stop: this.stopPrice});
    }
}

module.exports = {Regime: Regime}
