const {Strategy} = require("./Strategy")

/**
 * Class DonchianTrend
 *
 * Longer-horizon Donchian breakout trend-following with self-managed, ATR-scaled exits
 * and risk-based position sizing.
 *
 * Hypothesis: a breakout to a multi-week extreme forces capitulation from short sellers and
 * from trend followers who took profit too early. The payoff is a fat right tail — a low win
 * rate (~35-40%) carried by a few very large winners. Every other BitFox strategy is a
 * short-horizon oscillator, and none of them survived honest costs; this is the opposite
 * profile, and its edge per trade is measured in tens of percent rather than tenths.
 *
 * Signal:
 *   - Long  when close breaks above the highest high of the prior `entryPeriod` bars
 *     AND close is above EMA(`trendEmaPeriod`) — the regime filter improved every variant
 *     tested during screening, so breakouts against the primary trend are not taken.
 *   - Short is the mirror image.
 *   - Exit on the opposite `exitPeriod` channel extreme, on a `stopAtrMult` x ATR stop,
 *     or after `maxBarsInTrade` bars as a safety valve.
 *
 * Sizing: the strategy reports its `stopPrice` and `riskPct` on the entry result, which lets
 * the engine size the position so the stop costs a fixed fraction of equity. This is not
 * cosmetic — on the screening data the same trades produce a 63% median drawdown under fixed
 * notional versus 20.4% when risk-sized. Under an engine without sizing support the strategy
 * still runs, it just reverts to fixed notional.
 *
 * Exits are strategy-managed, so the engine's profitPct/stopLossPct must be configured as wide
 * disaster backstops only (e.g. profitPct 10, stopLossPct 0.90) or they will race these exits.
 *
 * Indicator arrays have different warm-ups; every array is read through Strategy.valueAt,
 * never indexed raw.
 */
class DonchianTrend extends Strategy {

    static init(args) { return new DonchianTrend(args); }

    constructor(args) {
        super(args);
        this.setContext("DonchianTrend");
        let extras = (args && args.strategyExtras) || {};
        this.entryPeriod = extras.entryPeriod || 20;
        this.exitPeriod = extras.exitPeriod || 10;
        this.trendEmaPeriod = extras.trendEmaPeriod || 200;
        this.atrPeriod = extras.atrPeriod || 14;
        this.stopAtrMult = extras.stopAtrMult || 3.0;
        this.riskPct = extras.riskPct || 0.01;
        this.maxBarsInTrade = extras.maxBarsInTrade || 400;

        this.inPosition = false;
        this.side = null;
        this.entryPrice = 0;
        this.stopPrice = 0;
        this.barsSinceEntry = 0;
    }

    setState(state) {
        this.state = state;
        // the engine resets to PENDING once it has processed our exit (or a cancelled order):
        // whatever position we were tracking is gone
        if (state === this.states.STATE_PENDING) {
            this.inPosition = false;
            this.side = null;
        }
    }

    getState() { return this.state; }

    async setup(klineCandles) {
        this.setIndicator(klineCandles, {period: this.entryPeriod}, this.indicators.DonchianIndicator.className);
        this.entryChannel = this.getIndicator();

        this.setIndicator(klineCandles, {period: this.exitPeriod}, this.indicators.DonchianIndicator.className);
        this.exitChannel = this.getIndicator();

        this.setIndicator(klineCandles, {period: this.atrPeriod}, this.indicators.AtrIndicator.className);
        this.atr = this.getIndicator();

        // EMA(trendEmaPeriod) has by far the longest warm-up at the default 200, so it emits the
        // fewest rows and is set LAST — BackTest.adjustForDelay trims the candle window to the
        // last-set indicator, and making that the shortest array keeps every other read in range.
        this.setIndicator(klineCandles, {period: this.trendEmaPeriod}, this.indicators.EMAIndicator.className);
        this.trendEma = this.getIndicator();

        return this;
    }

    closeAt(_index, isBackTest, ticker) {
        if (!isBackTest && ticker != null) return ticker;
        return super.closeAt(_index, isBackTest);
    }

    openPosition(side, price, atrValue) {
        this.inPosition = true;
        this.side = side;
        this.entryPrice = price;
        this.barsSinceEntry = 0;
        this.stopPrice = (side === 'long') ? price - this.stopAtrMult * atrValue
                                           : price + this.stopAtrMult * atrValue;
        this.state = (side === 'long') ? this.states.STATE_ENTER_LONG : this.states.STATE_ENTER_SHORT;
    }

    exitPosition(exitState, reason) {
        this.inPosition = false;
        this.side = null;
        this.state = exitState;
        return this.getStrategyResult(this.state, {reason: reason});
    }

    /**
     * @returns {any} the payload the engine reads to risk-size the entry
     */
    entryPayload(reason) {
        return {reason: reason, stopPrice: this.stopPrice, riskPct: this.riskPct, side: this.side};
    }

    async run(_index = 0, isBackTest = false, ticker = null) {
        let entryCh = this.valueAt(this.entryChannel, _index, isBackTest);
        let exitCh = this.valueAt(this.exitChannel, _index, isBackTest);
        let atrValue = this.valueAt(this.atr, _index, isBackTest);
        let ema = this.valueAt(this.trendEma, _index, isBackTest);
        let price = this.closeAt(_index, isBackTest, ticker);

        // warm-up / data guard: hold until every aligned indicator has a value
        if (entryCh == null || exitCh == null || atrValue == null || ema == null || price == null) {
            return this.getStrategyResult(this.state, {reason: 'warmup'});
        }

        if (this.state === this.states.STATE_AWAIT_TAKE_PROFIT && this.inPosition) {
            return this.managePosition(price, exitCh);
        }

        if (this.state === this.states.STATE_PENDING) {
            return this.evaluateEntry(price, entryCh, ema, atrValue);
        }

        // ENTER_* / AWAIT_ORDER_FILLED / transient states: nothing to decide this tick
        return this.getStrategyResult(this.state, {});
    }

    evaluateEntry(price, entryCh, ema, atrValue) {
        let breakoutUp = price > entryCh.upper && price > ema;
        let breakoutDown = price < entryCh.lower && price < ema;

        if (breakoutUp && this.sidePreference !== 'short') {
            this.openPosition('long', price, atrValue);
            return this.getStrategyResult(this.state, this.entryPayload('donchian_breakout_up'));
        }
        if (breakoutDown && this.sidePreference !== 'long') {
            this.openPosition('short', price, atrValue);
            return this.getStrategyResult(this.state, this.entryPayload('donchian_breakout_down'));
        }
        return this.getStrategyResult(this.state, {});
    }

    managePosition(price, exitCh) {
        this.barsSinceEntry++;

        if (this.side === 'long') {
            if (price <= this.stopPrice) {
                return this.exitPosition(this.states.STATE_STOP_LOSS_TRIGGERED, 'atr_stop');
            }
            if (price < exitCh.lower) {
                return this.exitPosition(
                    price > this.entryPrice ? this.states.STATE_TAKE_PROFIT : this.states.STATE_STOP_LOSS_TRIGGERED,
                    'channel_exit');
            }
        } else {
            if (price >= this.stopPrice) {
                return this.exitPosition(this.states.STATE_STOP_LOSS_TRIGGERED, 'atr_stop');
            }
            if (price > exitCh.upper) {
                return this.exitPosition(
                    price < this.entryPrice ? this.states.STATE_TAKE_PROFIT : this.states.STATE_STOP_LOSS_TRIGGERED,
                    'channel_exit');
            }
        }

        if (this.barsSinceEntry >= this.maxBarsInTrade) {
            let profitable = (this.side === 'long') ? price > this.entryPrice : price < this.entryPrice;
            return this.exitPosition(
                profitable ? this.states.STATE_TAKE_PROFIT : this.states.STATE_STOP_LOSS_TRIGGERED,
                'max_bars');
        }

        return this.getStrategyResult(this.states.STATE_AWAIT_TAKE_PROFIT, {stop: this.stopPrice});
    }
}

module.exports = {DonchianTrend: DonchianTrend}
