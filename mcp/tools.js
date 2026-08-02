const {CommandRouter} = require("../signal/CommandRouter");
const {SnapshotStore} = require("../signal/SnapshotStore");
const {Analysis} = require("../signal/Analysis");
const registry = require("../signal/Strategies");
const fmt = require("../signal/Formatter");
const tf = require("../signal/Timeframe");

/**
 * MCP tool definitions and handlers, kept transport-agnostic so the whole surface is
 * testable without spawning a server.
 *
 * ⚠ TOOL DESCRIPTIONS ARE THE HONESTY LAYER.
 *
 * Descriptions are the only instructions a model reliably reads before calling. An LLM
 * handed bare indicator values will produce "STRONG BUY"; handed the track record, the
 * sample size and the cost model, it can be honest. Putting a model in front of this data
 * does not launder the claim — the tool surface has to carry it, which is why every
 * description below states what the number is and is not.
 */

const STANDING_CAVEAT =
    'Measurement over one window, not a forecast. Costs applied: 0.1% taker per leg + 0.05% slippage ' +
    '(0.25% round trip). Under this cost model 13 of 14 bundled strategies lose money and simply holding ' +
    'the asset beat all of them. BitFox places no orders and holds no exchange credentials.';

class Tools {

    /**
     * @param opts {Object} {router, store}
     */
    constructor(opts = {}) {
        this.router = opts.router || CommandRouter.create(opts);
        this.store = opts.store || this.router.store || SnapshotStore.create(opts);
    }

    static create(opts = {}) { return new Tools(opts); }

    /** Shared guard so no tool ever throws a stack trace across the protocol boundary. */
    async guard(fn) {
        try { return await fn(); }
        catch (err) { return {error: err.message || String(err)}; }
    }

    async getRegime({symbol, cachedOnly}) {
        return this.guard(async () => {
            let sym = String(symbol).toUpperCase();
            let horizons;
            if (cachedOnly) {
                // A cold classification loads three horizons and can take tens of seconds,
                // which some MCP clients will time out on. cachedOnly returns instantly with
                // whatever is warm and says plainly what is missing, rather than hanging.
                horizons = {};
                for (const [label, timeframe] of Object.entries(this.router.horizons)) {
                    let hit = this.router.cache.entries.get(this.router.cache.key(sym, timeframe));
                    horizons[label] = hit ? require("../signal/Regime").classify(hit.candles, timeframe) : null;
                }
            } else {
                horizons = await this.router.classifyHorizons(sym, Date.now());
            }
            let missing = Object.entries(horizons).filter(([, v]) => v === null).map(([k]) => k);
            if (missing.length === Object.keys(horizons).length) {
                return cachedOnly
                    ? {error: `Nothing cached for ${sym}. Call again without cachedOnly to fetch.`, uncachedHorizons: missing}
                    : {error: `Could not load enough closed candles for ${sym} on any horizon.`};
            }
            return {
                symbol: sym,
                horizons,
                ...(missing.length ? {uncachedHorizons: missing} : {}),
                directionNote: 'Direction (vs EMA200, EMA order) is reported but NOT weighted as favourable. ' +
                    'A measurement across 15,073 trades found -0.39%/trade both with and against the EMA200 trend, ' +
                    'so trend alignment carries no measured edge here.',
                caveat: STANDING_CAVEAT,
            };
        });
    }

    async getReadings({symbol, timeframe}) {
        return this.guard(async () => {
            let sym = String(symbol).toUpperCase(), t = String(timeframe).toLowerCase();
            if (!tf.isSupported(t)) return {error: `Unsupported timeframe "${timeframe}". Supported: ${tf.SUPPORTED.join(', ')}`};
            let candles = await this.router.cache.get(sym, t, {pollRate: this.router.pollRates[t]});
            if (!candles || candles.length < 210) return {error: `Not enough closed candles for ${sym} ${t}.`};
            let a = Analysis.from(candles);
            return {
                symbol: sym, timeframe: t, timestamp: a.timestamp(),
                trend: a.trend(), momentum: a.momentum(), levels: a.levels(), volatility: a.volatility(),
                caveat: STANDING_CAVEAT,
            };
        });
    }

    async getBacktest({symbol, timeframe, strategy}) {
        return this.guard(async () => {
            let sym = String(symbol).toUpperCase(), t = String(timeframe).toLowerCase();
            if (!tf.isSupported(t)) return {error: `Unsupported timeframe "${timeframe}". Supported: ${tf.SUPPORTED.join(', ')}`};
            let resolved = registry.resolve(strategy);
            if (!resolved) return {error: `Unknown strategy "${strategy}". Available: ${registry.names().join(', ')}`};

            let candles = await this.router.cache.get(sym, t, {pollRate: this.router.pollRates[t]});
            if (!candles || candles.length < 210) return {error: `Not enough closed candles for ${sym} ${t}.`};
            let r = await this.router.runner.run(candles, sym, t, resolved.name);
            if (r.error) return {error: r.error};

            let warnings = [];
            if (r.trades > 0 && r.pf < 1.0) warnings.push('This strategy lost money over the tested window.');
            if (r.trades < fmt.MIN_MEANINGFUL_TRADES) {
                warnings.push(`Only ${r.trades} trades — below ${fmt.MIN_MEANINGFUL_TRADES} this figure is noise, however good it looks.`);
            }
            return {
                ...r,
                ledgerStatus: registry.status(resolved.name),
                warnings,
                caveat: STANDING_CAVEAT,
            };
        });
    }

    async listStrategies() {
        return this.guard(async () => ({
            strategies: registry.names().map(name => ({name, ledgerStatus: registry.status(name)})),
            note: 'ledgerStatus is the measured verdict from walk-forward and benchmark testing. ' +
                'A "no-go" strategy is available to query but has no demonstrated edge — this is an ' +
                'inventory, not a menu of viable options.',
            caveat: STANDING_CAVEAT,
        }));
    }

    async listSnapshots({limit} = {}) {
        return this.guard(async () => ({
            snapshots: this.store.list(limit || 25).map(s => ({
                id: s.id, symbol: s.symbol, createdAt: new Date(s.createdAt).toISOString(),
            })),
            note: 'Snapshots generated from Telegram appear here — that is the cross-surface hook.',
        }));
    }

    async getSnapshot({id}) {
        return this.guard(async () => {
            let markdown = this.store.read(id);
            if (markdown == null) return {error: `No snapshot with id "${id}". Use list_snapshots to see available ids.`};
            return {id, markdown};
        });
    }
}

/**
 * Tool metadata. `schema` values are plain descriptors; the server converts them to the
 * SDK's expected shape, keeping this module dependency-free and unit-testable.
 */
const DEFINITIONS = [
    {
        name: 'get_regime',
        title: 'Market regime across horizons',
        description: 'Classify the CURRENT market regime for a symbol across short/medium/long horizons ' +
            '(ADX trend bucket, ATR-percentile volatility bucket, EMA stack order). This describes the regime ' +
            'the market is IN; it does not forecast the next one. Direction is reported but not weighted as ' +
            'favourable — trend alignment has no measured edge in this repo. Measurements, not advice.',
        params: {
            symbol: {type: 'string', required: true, description: 'e.g. BTCUSDT'},
            cachedOnly: {type: 'boolean', required: false, description: 'return instantly from cache only; a cold fetch loads three horizons and can take tens of seconds'},
        },
        handler: (t, a) => t.getRegime(a),
    },
    {
        name: 'get_readings',
        title: 'Indicator readings',
        description: 'Current indicator readings (trend, momentum, levels, volatility) for a symbol and ' +
            'timeframe, taken from the last CLOSED candle. Raw measurements with no interpretation attached.',
        params: {
            symbol: {type: 'string', required: true, description: 'e.g. BTCUSDT'},
            timeframe: {type: 'string', required: true, description: 'e.g. 15m, 4h, 1d'},
        },
        handler: (t, a) => t.getReadings(a),
    },
    {
        name: 'get_backtest',
        title: 'Measured historical performance',
        description: 'Honest backtest of a strategy on a symbol/timeframe, with costs applied. ALWAYS returns ' +
            'sample size and cost model, and warns when the strategy lost money or when the sample is below 50 ' +
            'trades. A high profit factor on a small sample is noise — the warnings are not optional context.',
        params: {
            symbol: {type: 'string', required: true, description: 'e.g. BTCUSDT'},
            timeframe: {type: 'string', required: true, description: 'e.g. 15m, 4h, 1d'},
            strategy: {type: 'string', required: true, description: 'strategy name; see list_strategies'},
        },
        handler: (t, a) => t.getBacktest(a),
    },
    {
        name: 'list_strategies',
        title: 'Registered strategies and their verdicts',
        description: 'List the strategies available to query, each with its measured ledger verdict. This is an ' +
            'inventory, not a menu of viable options — most are recorded as no-go and have no demonstrated edge.',
        params: {},
        handler: (t) => t.listStrategies(),
    },
    {
        name: 'list_snapshots',
        title: 'Stored regime snapshots',
        description: 'List stored regime snapshots newest first, including ones generated from Telegram.',
        params: {limit: {type: 'number', required: false, description: 'max results, default 25'}},
        handler: (t, a) => t.listSnapshots(a || {}),
    },
    {
        name: 'get_snapshot',
        title: 'Retrieve a snapshot',
        description: 'Fetch a stored regime snapshot by id as markdown — including snapshots captured from ' +
            'Telegram. The document carries its own caveats and sample sizes.',
        params: {id: {type: 'string', required: true, description: 'snapshot id from list_snapshots'}},
        handler: (t, a) => t.getSnapshot(a),
    },
];

module.exports = {Tools, DEFINITIONS, STANDING_CAVEAT};
