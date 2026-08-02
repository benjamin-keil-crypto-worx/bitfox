const {DataLoaderEngine} = require("../engine/DataLoader");
const tf = require("./Timeframe");

/**
 * Class CandleCache
 *
 * Loading 30k candles per query would make the bot unusable and would hammer the
 * exchange's rate limit. Candles are cached per symbol+timeframe with a TTL of one
 * candle duration — a 15m cell cannot produce new information more than once per 15m,
 * so refreshing faster buys nothing.
 *
 * The loader is injectable so tests never touch the network.
 */
class CandleCache {

    /**
     * @param opts {Object} {exchangeName, pollRate, loader}
     * @return {CandleCache}
     */
    static create(opts = {}) { return new CandleCache(opts); }

    constructor(opts = {}) {
        this.exchangeName = opts.exchangeName || 'bybit';
        this.pollRate = opts.pollRate || 10;
        this.entries = new Map();
        this.loads = 0;                       // observable by tests to assert cache hits
        this.loader = opts.loader || null;    // injectable: (symbol, timeframe, pollRate) => Promise<candles>
    }

    key(symbol, timeframe) { return `${symbol}|${timeframe}`; }

    /** @return {Promise<Array>} raw candles straight from the exchange */
    async fetch(symbol, timeframe, pollRate) {
        if (this.loader) return await this.loader(symbol, timeframe, pollRate);
        let dl = DataLoaderEngine.getInstance({
            exchangeName: this.exchangeName, symbol, requiredCandles: 200,
            pollRate, timeframe, verbose: false
        });
        await dl.setUpClient({
            public: true,
            options: {'defaultType': 'spot', 'adjustForTimeDifference': true, 'recvwindow': 7000}
        });
        return await dl.load();
    }

    /**
     * @param symbol {String}
     * @param timeframe {String}
     * @param opts {Object} {pollRate, now}
     * @return {Promise<Array>} candles ending at the last CLOSED candle
     */
    async get(symbol, timeframe, opts = {}) {
        let now = opts.now || Date.now();
        let pollRate = opts.pollRate || this.pollRate;
        let k = this.key(symbol, timeframe);
        let ttl = tf.toMillis(timeframe) || 60000;
        let hit = this.entries.get(k);

        if (hit && (now - hit.at) < ttl && hit.pollRate >= pollRate) {
            return hit.candles;
        }
        let raw = await this.fetch(symbol, timeframe, pollRate);
        this.loads++;
        // never expose a forming candle: readings taken from it change between two
        // otherwise identical queries
        let candles = tf.dropUnclosed(raw, timeframe, now);
        this.entries.set(k, {candles, at: now, pollRate});
        return candles;
    }

    clear() { this.entries.clear(); }
}

module.exports = {CandleCache};
