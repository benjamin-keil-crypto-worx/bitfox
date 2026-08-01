const {Analysis} = require("./Analysis");
const {CandleCache} = require("./CandleCache");
const {BacktestRunner} = require("./BacktestRunner");
const registry = require("./Strategies");
const fmt = require("./Formatter");
const tf = require("./Timeframe");

const COMMANDS = ['trend', 'momentum', 'levels', 'vol', 'signal', 'backtest', 'help', 'start'];

/**
 * Class CommandRouter
 *
 * Parses and dispatches read-only analysis commands. Deliberately transport-agnostic —
 * it takes a chat id and a text string and returns a string — so the whole surface is
 * testable offline without a Telegram connection.
 *
 * There is no code path here that places an order. That is the product decision, not an
 * oversight: see #47.
 */
class CommandRouter {

    static create(opts = {}) { return new CommandRouter(opts); }

    /**
     * @param opts {Object} {allowedChatIds, rateLimit:{max,windowMs}, cache, runner, pollRates}
     */
    constructor(opts = {}) {
        // empty/absent list = open access (documented). Enforced strictly when set.
        this.allowedChatIds = (opts.allowedChatIds || []).map(String).filter(Boolean);
        this.rateLimit = opts.rateLimit || {max: 20, windowMs: 60000};
        this.cache = opts.cache || CandleCache.create(opts);
        this.runner = opts.runner || BacktestRunner.create(opts);
        this.hits = new Map();
        // Each poll fetches 200 candles. Sized so /backtest gets a sample worth reporting
        // rather than a fast answer that means nothing — a PF on 12 trades is noise, and
        // this is the knob that decides whether the number is worth printing at all.
        // Cost is a slower first query per cell; every query inside the TTL is free.
        this.pollRates = opts.pollRates || {
            '1m': 30, '3m': 40, '5m': 60, '15m': 60, '30m': 50, '1h': 60,
            '2h': 40, '4h': 30, '6h': 20, '12h': 15, '1d': 10, '1w': 5
        };
    }

    /**
     * @param chatId {String|Number}
     * @return {Boolean} whether this chat may use the bot
     */
    isAllowed(chatId) {
        if (this.allowedChatIds.length === 0) return true;
        return this.allowedChatIds.includes(String(chatId));
    }

    /**
     * @param chatId {String|Number}
     * @param now {Number}
     * @return {Boolean} false when the chat has exceeded its command budget
     */
    withinRateLimit(chatId, now = Date.now()) {
        let key = String(chatId);
        let times = (this.hits.get(key) || []).filter(t => now - t < this.rateLimit.windowMs);
        if (times.length >= this.rateLimit.max) { this.hits.set(key, times); return false; }
        times.push(now);
        this.hits.set(key, times);
        return true;
    }

    /**
     * @param text {String}
     * @return {{command:String, args:Array<String>}|null}
     */
    parse(text) {
        if (typeof text !== 'string') return null;
        let trimmed = text.trim();
        if (!trimmed.startsWith('/')) return null;
        // tolerate the @botname suffix Telegram appends in groups
        let parts = trimmed.slice(1).split(/\s+/);
        let command = parts[0].split('@')[0].toLowerCase();
        return {command, args: parts.slice(1)};
    }

    /**
     * @param chatId {String|Number}
     * @param text {String}
     * @param opts {Object} {now}
     * @return {Promise<String|null>} reply text, or null when the input is not a command for us
     */
    async handle(chatId, text, opts = {}) {
        let now = opts.now || Date.now();
        let parsed = this.parse(text);
        if (!parsed) return null;
        if (!COMMANDS.includes(parsed.command)) {
            return `Unknown command /${parsed.command}. Try /help.`;
        }
        if (!this.isAllowed(chatId)) {
            return `This bot is restricted. Ask the operator to add your chat id (${chatId}) to TELEGRAM_ALLOWED_CHAT_IDS.`;
        }
        if (!this.withinRateLimit(chatId, now)) {
            return `Rate limit reached (${this.rateLimit.max} commands per ${Math.round(this.rateLimit.windowMs / 1000)}s). Try again shortly.`;
        }

        try {
            return await this.dispatch(parsed, opts, now);
        } catch (err) {
            // never leak a stack trace into chat
            return `Could not complete /${parsed.command}: ${err.message}`;
        }
    }

    async dispatch(parsed, opts, now) {
        let {command, args} = parsed;
        if (command === 'help' || command === 'start') return fmt.help();

        let [symbolRaw, timeframeRaw, strategyRaw] = args;
        if (!symbolRaw || !timeframeRaw) {
            return `Usage: /${command} <SYMBOL> <TIMEFRAME>${command === 'backtest' ? ' <STRATEGY>' : ''}\nExample: /${command} ADAUSDT 15m${command === 'backtest' ? ' Bollinger' : ''}`;
        }
        let symbol = symbolRaw.toUpperCase();
        let timeframe = timeframeRaw.toLowerCase();
        if (!tf.isSupported(timeframe)) {
            return `Unsupported timeframe "${timeframeRaw}". Supported: ${tf.SUPPORTED.join(', ')}`;
        }
        if (command === 'backtest' && !strategyRaw) {
            return `Usage: /backtest <SYMBOL> <TIMEFRAME> <STRATEGY>\nAvailable: ${registry.names().join(', ')}`;
        }

        let candles = await this.cache.get(symbol, timeframe, {pollRate: this.pollRates[timeframe], now});
        if (!candles || candles.length < 210) {
            return `Not enough closed candles for ${symbol} ${timeframe} to compute indicators.`;
        }

        if (command === 'backtest') {
            let r = await this.runner.run(candles, symbol, timeframe, strategyRaw, {now});
            return r.error ? r.error : fmt.backtest(r);
        }
        if (command === 'signal') return await this.signal(candles, symbol, timeframe, now);

        let a = Analysis.from(candles);
        let ts = a.timestamp();
        switch (command) {
            case 'trend':    return fmt.trend(symbol, timeframe, ts, a.trend());
            case 'momentum': return fmt.momentum(symbol, timeframe, ts, a.momentum());
            case 'levels':   return fmt.levels(symbol, timeframe, ts, a.levels());
            case 'vol':      return fmt.volatility(symbol, timeframe, ts, a.volatility());
        }
        return `Unknown command /${command}. Try /help.`;
    }

    /**
     * What each registered strategy emits on the latest closed candle, next to the profit
     * factor measured on this same cell. A state without its track record is exactly the
     * misleading half-truth this bot exists to avoid.
     */
    async signal(candles, symbol, timeframe, now) {
        let a = Analysis.from(candles);
        let rows = [];
        for (let name of registry.names()) {
            let state = 'unavailable', pf = null, trades = null;
            try {
                let {cls} = registry.resolve(name);
                let strategy = cls.init({symbol, timeframe, amount: 1000, profitPct: 1.03, stopLossPct: 0.98,
                                         sidePreference: 'biDirectional', public: true, exchangeName: 'bybit'});
                await strategy.setup(candles);
                let result = await strategy.run(candles.length - 1, false);
                state = (result && result.state) ? result.state : strategy.getState();
            } catch (err) { state = 'error'; }

            try {
                let bt = await this.runner.run(candles, symbol, timeframe, name, {now});
                if (!bt.error && bt.trades > 0) { pf = bt.pf; trades = bt.trades; }
            } catch (err) { /* track record simply stays unreported */ }

            rows.push({strategy: name, state, pf, trades});
        }
        return fmt.signal(symbol, timeframe, a.timestamp(), a.price(), rows);
    }
}

module.exports = {CommandRouter, COMMANDS};
