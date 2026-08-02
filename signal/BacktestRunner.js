const {BackTestEngine} = require("../engine/BackTest");
const registry = require("./Strategies");

const DEFAULT_COSTS = {taker: 0.001, maker: 0.001, slippage: 0.0005};

/**
 * Class BacktestRunner
 *
 * Runs a registered strategy over cached candles and reduces the engine's metrics to a
 * reportable summary. Results are cached because a backtest over a fixed candle window
 * is deterministic — re-running it for the same cell inside the cache window cannot
 * produce a different answer, only a slower one.
 */
class BacktestRunner {

    static create(opts = {}) { return new BacktestRunner(opts); }

    constructor(opts = {}) {
        this.costs = {...DEFAULT_COSTS, ...(opts.costs || {})};
        this.cache = new Map();
        this.ttl = opts.ttl ?? 15 * 60000;
        this.inFlight = new Set();
        this.runs = 0;
    }

    key(symbol, timeframe, strategy) { return `${symbol}|${timeframe}|${strategy}`; }

    /**
     * @param candles {Array}
     * @param symbol {String}
     * @param timeframe {String}
     * @param strategyName {String}
     * @param opts {Object} {now}
     * @return {Promise<Object>} summary, or {error} when the strategy is unknown / already running
     */
    async run(candles, symbol, timeframe, strategyName, opts = {}) {
        let now = opts.now || Date.now();
        let resolved = registry.resolve(strategyName);
        if (!resolved) {
            return {error: `Unknown strategy "${strategyName}". Available: ${registry.names().join(', ')}`};
        }
        let k = this.key(symbol, timeframe, resolved.name);

        let hit = this.cache.get(k);
        if (hit && (now - hit.at) < this.ttl) return hit.result;

        // one run per cell at a time; a duplicate request gets told rather than queued
        if (this.inFlight.has(k)) {
            return {error: `A backtest for ${symbol} ${timeframe} ${resolved.name} is already running — try again shortly.`};
        }
        this.inFlight.add(k);
        try {
            let result = await this.execute(candles, symbol, timeframe, resolved);
            this.cache.set(k, {result, at: now});
            return result;
        } finally {
            this.inFlight.delete(k);
        }
    }

    /**
     * @return {Promise<Object>} the reportable summary
     */
    async execute(candles, symbol, timeframe, resolved) {
        let args = {
            symbol, timeframe, amount: 1000,
            profitPct: 1.03, stopLossPct: 0.98,
            sidePreference: 'biDirectional',
            public: true, exchangeName: 'bybit',
            takerFee: this.costs.taker, makerFee: this.costs.maker, slippage: this.costs.slippage,
        };
        let strategy = resolved.cls.init(args);
        // BackTest writes trade history to ~/bitfox/<context>-<date>.json with no symbol or
        // timeframe in the name, so two cells running the same strategy would clobber each
        // other's output. Making the context cell-specific keeps each run in its own file.
        strategy.setContext(`SignalBot-${resolved.name}-${symbol}-${timeframe}`);

        let engine = BackTestEngine.getBackTester(strategy, args);
        await engine.backTest(candles.map(c => [...c]));
        this.runs++;

        let days = Math.round((candles[candles.length - 1][0] - candles[0][0]) / 86400000);
        if (!engine.metrics || engine.metrics.completedTrades === 0) {
            return {symbol, timeframe, strategy: resolved.name, trades: 0, days, costs: this.costs};
        }
        let m = engine.metrics;
        return {
            symbol, timeframe, strategy: resolved.name, days,
            trades: m.completedTrades,
            pf: m.profitFactor,
            winRate: m.winRate,
            returnPct: m.totalReturnPct,
            maxDD: m.maxDrawdownPct * 100,
            costs: this.costs,
        };
    }
}

module.exports = {BacktestRunner, DEFAULT_COSTS};
