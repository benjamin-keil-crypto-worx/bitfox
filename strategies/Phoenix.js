const {Strategy} = require("./Strategy");
const {Log} = require("../lib/utility/Log");

class Phoenix extends Strategy {

    static init(args){
        return new Phoenix(args);
    }

    constructor(args) {
        super(args);
        this.setContext("Phoenix");
        this.ema20 = null;
        this.ema50 = null;
        this.ema100 = null;
        this.ema200 = null;
        this.rsi = null;
        this.atr = null;
        this.macd = null;

        this.inPosition = false;
        this.positionSide = null;
        this.entryPrice = 0;
        this.entryATR = 0;
        this.barsSinceEntry = 0;
        this.barsSinceLastTrade = 999;

        const extras = args.strategyExtras || {};
        this.atrPeriod = extras.atrPeriod || 14;
        this.rsiPeriod = extras.rsiPeriod || 14;
        this.atrTPScaler = extras.atrTPScaler || 3.0;
        this.atrSLScaler = extras.atrSLScaler || 2.0;
        this.minATRFilter = extras.minATRFilter || 0;
        this.minScore = extras.minScore || 12;
        this.confidenceMargin = extras.confidenceMargin || 5;
        this.minBarsBetweenTrades = extras.minBarsBetweenTrades || 12;
    }

    setState(state){
        this.state = state;
        if(state === this.states.STATE_PENDING){
            this.inPosition = false;
            this.positionSide = null;
            this.barsSinceEntry = 0;
        }
        if([this.states.STATE_STOP_LOSS_TRIGGERED, this.states.STATE_TAKE_PROFIT].includes(state)){
            this.barsSinceLastTrade = 0;
        }
    }

    async setup(klineCandles){
        this.setIndicator(klineCandles, {period: this.rsiPeriod}, this.indicators.RsiIndicator.className);
        this.rsi = this.getIndicator();

        this.setIndicator(klineCandles, {period: this.atrPeriod}, this.indicators.AtrIndicator.className);
        this.atr = this.getIndicator();

        this.setIndicator(klineCandles, {}, this.indicators.MacdIndicator.className);
        this.macd = this.getIndicator();

        this.setIndicator(klineCandles, {period: 20}, this.indicators.EMAIndicator.className);
        this.ema20 = this.getIndicator();

        this.setIndicator(klineCandles, {period: 50}, this.indicators.EMAIndicator.className);
        this.ema50 = this.getIndicator();

        this.setIndicator(klineCandles, {period: 100}, this.indicators.EMAIndicator.className);
        this.ema100 = this.getIndicator();

        this.setIndicator(klineCandles, {period: 200}, this.indicators.EMAIndicator.className);
        this.ema200 = this.getIndicator();

        return this;
    }

    /**
     * Aligned read: `back` bars before the candle at `_index` (0 = current).
     * Uses Strategy.valueAt so warm-up differences between indicator arrays
     * are respected — raw `arr[_index]` reads values stale by the warm-up gap.
     */
    at(arr, _index, isBackTest, back = 0){
        if(!arr || arr.length === 0) return null;
        if(isBackTest) return this.valueAt(arr, _index - back, true);
        let i = arr.length - 1 - back;
        return i >= 0 ? arr[i] : null;
    }

    async run(_index=0, isBackTest=false, ticker=null){
        if(this.state === this.states.STATE_AWAIT_ORDER_FILLED){
            this.inPosition = true;
            return this.getStrategyResult(this.state, {});
        }

        if(this.state === this.states.STATE_ENTER_LONG || this.state === this.states.STATE_ENTER_SHORT){
            this.state = this.states.STATE_AWAIT_ORDER_FILLED;
            return this.getStrategyResult(this.state, {});
        }

        if(this.inPosition && [this.states.STATE_AWAIT_TAKE_PROFIT, this.states.STATE_PENDING].includes(this.state)){
            this.barsSinceEntry++;
            let currentPrice = this.closeAt(_index, isBackTest);
            let currentATR = this.at(this.atr, _index, isBackTest) ?? this.entryATR;

            let exitState = this.evaluateExit(currentPrice, currentATR);
            if(exitState){
                return this.getStrategyResult(exitState, {
                    reason: exitState === this.states.STATE_TAKE_PROFIT ? 'take_profit' : 'stop_loss',
                    entryPrice: this.entryPrice,
                    currentPrice: currentPrice,
                    barsHeld: this.barsSinceEntry
                });
            }

            return this.getStrategyResult(this.states.STATE_AWAIT_TAKE_PROFIT, {});
        }

        if(this.state === this.states.STATE_PENDING){
            let currentPrice = this.closeAt(_index, isBackTest);
            let curRSI = this.at(this.rsi, _index, isBackTest);
            let curATR = this.at(this.atr, _index, isBackTest);
            let curMacd = this.at(this.macd, _index, isBackTest);

            let curEMA20 = this.at(this.ema20, _index, isBackTest);
            let curEMA50 = this.at(this.ema50, _index, isBackTest);
            let curEMA100 = this.at(this.ema100, _index, isBackTest);
            let curEMA200 = this.at(this.ema200, _index, isBackTest);

            let prevEMA20 = this.at(this.ema20, _index, isBackTest, 1);
            let prevEMA50 = this.at(this.ema50, _index, isBackTest, 1);
            let prevRSI = this.at(this.rsi, _index, isBackTest, 1);

            this.barsSinceLastTrade++;

            let signal = this.evaluateEntry(
                currentPrice, curRSI, curATR, curMacd,
                curEMA20, curEMA50, curEMA100, curEMA200,
                prevEMA20, prevEMA50, prevRSI
            );

            let skipTrade = this.barsSinceLastTrade < this.minBarsBetweenTrades;

            if(signal.enterLong && !skipTrade && (this.sidePreference === 'long' || this.sidePreference === 'biDirectional')){
                this.inPosition = true;
                this.positionSide = 'long';
                this.entryPrice = currentPrice;
                this.entryATR = curATR;
                this.barsSinceEntry = 0;
                this.barsSinceLastTrade = 0;
                this.state = this.states.STATE_ENTER_LONG;
                return this.getStrategyResult(this.state, {
                    reason: 'entry_long',
                    price: currentPrice,
                    atr: curATR,
                    rsi: curRSI
                });
            }

            if(signal.enterShort && !skipTrade && (this.sidePreference === 'short' || this.sidePreference === 'biDirectional')){
                this.inPosition = true;
                this.positionSide = 'short';
                this.entryPrice = currentPrice;
                this.entryATR = curATR;
                this.barsSinceEntry = 0;
                this.barsSinceLastTrade = 0;
                this.state = this.states.STATE_ENTER_SHORT;
                return this.getStrategyResult(this.state, {
                    reason: 'entry_short',
                    price: currentPrice,
                    atr: curATR,
                    rsi: curRSI
                });
            }

            return this.getStrategyResult(this.state, {
                price: currentPrice,
                rsi: curRSI,
                trend: signal.trend
            });
        }

        return this.getStrategyResult(this.state, {});
    }

    evaluateEntry(price, rsi, atr, macd, ema20, ema50, ema100, ema200, prevEMA20, prevEMA50, prevRSI){
        let result = {
            enterLong: false,
            enterShort: false,
            trend: 'neutral',
            confidence: 0
        };

        if(!price || !rsi || !atr || atr === 0 || !ema20 || !ema50 || !ema200
            || prevEMA20 == null || prevEMA50 == null || prevRSI == null){
            return result;
        }

        let aboveEMA200 = price > ema200;
        let aboveEMA100 = price > ema100;
        let aboveEMA50 = price > ema50;
        let aboveEMA20 = price > ema20;
        let ema20AboveEMA50 = ema20 > ema50;

        let ema20CrossedAbove50 = prevEMA20 <= prevEMA50 && ema20 > ema50;
        let ema20CrossedBelow50 = prevEMA20 >= prevEMA50 && ema20 < ema50;

        let macdHistogram = macd && macd.histogram != null ? macd.histogram : 0;
        let prevMacdHistogram = 0;
        let macdRising = macdHistogram > 0;

        let rsiRising = rsi > 50;
        let rsiCrossedAbove = prevRSI <= 50 && rsi > 50;
        let rsiCrossedBelow = prevRSI >= 50 && rsi < 50;

        let volOk = atr >= this.minATRFilter;

        let bullishScore = 0;
        let bearishScore = 0;

        if(aboveEMA200) bullishScore += 3;
        else bearishScore += 3;

        if(aboveEMA100) bullishScore += 2;
        else bearishScore += 2;

        if(aboveEMA50) bullishScore += 2;
        else bearishScore += 2;

        if(aboveEMA20) bullishScore += 1;
        else bearishScore += 1;

        if(ema20AboveEMA50) bullishScore += 2;
        else bearishScore += 2;

        if(ema20CrossedAbove50) bullishScore += 3;
        if(ema20CrossedBelow50) bearishScore += 3;

        if(macdRising) bullishScore += 2;
        else bearishScore += 2;

        if(rsiRising) bullishScore += 1;
        else bearishScore += 1;

        if(rsiCrossedAbove) bullishScore += 2;
        if(rsiCrossedBelow) bearishScore += 2;

        if(rsi > 70) bearishScore += 1;
        if(rsi < 30) bullishScore += 1;

        result.trend = bullishScore > bearishScore ? 'bullish' : (bearishScore > bullishScore ? 'bearish' : 'neutral');
        result.confidence = Math.abs(bullishScore - bearishScore);

        if(volOk && bullishScore >= this.minScore && bullishScore > bearishScore + this.confidenceMargin){
            result.enterLong = true;
        }

        if(volOk && bearishScore >= this.minScore && bearishScore > bullishScore + this.confidenceMargin){
            result.enterShort = true;
        }

        return result;
    }

    evaluateExit(currentPrice, currentATR){
        if(!this.entryPrice || !this.entryATR || this.entryATR === 0){
            currentATR = currentATR || this.entryATR || 0;
            if(currentATR === 0) return null;
        }

        let atr = currentATR || this.entryATR;
        let atrTP = this.entryATR * this.atrTPScaler;
        let atrSL = this.entryATR * this.atrSLScaler;

        if(this.positionSide === 'long'){
            let tpPrice = this.entryPrice + atrTP;
            let slPrice = this.entryPrice - atrSL;

            if(currentPrice >= tpPrice){
                this.inPosition = false;
                this.positionSide = null;
                return this.states.STATE_TAKE_PROFIT;
            }

            if(currentPrice <= slPrice){
                this.inPosition = false;
                this.positionSide = null;
                return this.states.STATE_STOP_LOSS_TRIGGERED;
            }

            let trailStop = Math.max(slPrice, this.entryPrice * 0.98);
            if(this.barsSinceEntry > 3 && currentPrice < trailStop){
                this.inPosition = false;
                this.positionSide = null;
                return this.states.STATE_STOP_LOSS_TRIGGERED;
            }
        }

        if(this.positionSide === 'short'){
            let tpPrice = this.entryPrice - atrTP;
            let slPrice = this.entryPrice + atrSL;

            if(currentPrice <= tpPrice){
                this.inPosition = false;
                this.positionSide = null;
                return this.states.STATE_TAKE_PROFIT;
            }

            if(currentPrice >= slPrice){
                this.inPosition = false;
                this.positionSide = null;
                return this.states.STATE_STOP_LOSS_TRIGGERED;
            }

            let trailStop = Math.min(slPrice, this.entryPrice * 1.02);
            if(this.barsSinceEntry > 3 && currentPrice > trailStop){
                this.inPosition = false;
                this.positionSide = null;
                return this.states.STATE_STOP_LOSS_TRIGGERED;
            }
        }

        return null;
    }
}

module.exports = {Phoenix: Phoenix};
