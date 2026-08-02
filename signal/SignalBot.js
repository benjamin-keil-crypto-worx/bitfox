const {CommandRouter, SLOW_COMMANDS} = require("./CommandRouter");

/**
 * Class SignalBot
 *
 * Telegram transport for the read-only signalling layer. All logic lives in
 * CommandRouter; this class only moves strings in and out, which is why the command
 * surface is fully testable without a network connection.
 *
 * Requires NO exchange credentials. Market data and backtests use public endpoints,
 * so this bot cannot place an order even if it were asked to.
 */
class SignalBot {

    /**
     * @param opts {Object} {token, allowedChatIds, exchangeName, rateLimit, botFactory, router}
     * @return {SignalBot}
     */
    static create(opts = {}) { return new SignalBot(opts); }

    constructor(opts = {}) {
        this.token = opts.token;
        this.router = opts.router || CommandRouter.create(opts);
        this.botFactory = opts.botFactory || null;   // injectable for tests
        this.bot = null;
        // chat ids seen this run, so first contact is logged once rather than every message
        this.seenChats = new Set();
    }

    /**
     * Read configuration from the environment, matching trade-live.js conventions.
     * @return {SignalBot}
     */
    static fromEnv(env = process.env) {
        let allowed = (env.TELEGRAM_ALLOWED_CHAT_IDS || '')
            .split(',').map(s => s.trim()).filter(Boolean);
        return SignalBot.create({
            token: env.TELEGRAM_BOT_TOKEN,
            allowedChatIds: allowed,
            exchangeName: env.EXCHANGE || 'bybit',
        });
    }

    /** @return {SignalBot} starts polling and wires the message handler */
    start() {
        if (!this.token) throw new Error('TELEGRAM_BOT_TOKEN is required to start the signal bot');
        const TelegramBot = this.botFactory || require('node-telegram-bot-api');
        this.bot = new TelegramBot(this.token, {polling: true});

        this.bot.on('error', (e) => console.error('[SignalBot]', e.message));
        this.bot.on('polling_error', (e) => console.error('[SignalBot] polling', e.message));

        this.bot.on('message', async (msg) => {
            if (!msg || !msg.text) return;
            this.noteChat(msg);
            await this.acknowledge(msg);
            let reply = await this.router.handle(msg.chat.id, msg.text);
            if (reply == null) return;
            // /snapshot returns {text, filePath}: Telegram caps messages at 4096 chars and a
            // multi-horizon snapshot exceeds that, so the summary goes in chat and the full
            // document goes out as an attachment the user can hand to any AI client.
            if (typeof reply === 'object' && reply.filePath) {
                await this.bot.sendMessage(msg.chat.id, reply.text);
                await this.bot.sendDocument(msg.chat.id, reply.filePath);
                return;
            }
            await this.bot.sendMessage(msg.chat.id, reply);
        });
        return this;
    }

    /**
     * Log the first message from a chat id, so an operator can recover the value needed
     * for TELEGRAM_ALLOWED_CHAT_IDS from the server log without touching Telegram.
     * Once per chat per run — logging every message would bury it.
     *
     * @param msg {Object} the inbound Telegram message
     * @return {Boolean} whether this was first contact
     */
    noteChat(msg) {
        let id = String(msg.chat.id);
        if (this.seenChats.has(id)) return false;
        this.seenChats.add(id);
        let allowed = this.router.isAllowed(msg.chat.id);
        console.log(`[SignalBot] first contact from chat id ${id}` +
            ` (${allowed ? 'allowed' : 'NOT on allowlist'})`);
        return true;
    }

    /**
     * Tell the user we are working before a slow command. On a cold cache /snapshot loads
     * three horizons and runs a backtest per strategy — tens of seconds of silence reads
     * as a broken bot.
     *
     * Deliberately best-effort: a failed acknowledgement must never prevent the real reply.
     *
     * @param msg {Object} the inbound Telegram message
     * @return {Promise<Boolean>} whether an acknowledgement was sent
     */
    async acknowledge(msg) {
        let parsed = this.router.parse(msg.text);
        if (!parsed || !SLOW_COMMANDS.includes(parsed.command)) return false;
        // only ack work we will actually do — an unauthorised or rate-limited chat gets
        // its refusal without a misleading "working..." first
        if (!this.router.isAllowed(msg.chat.id)) return false;
        try {
            await this.bot.sendMessage(msg.chat.id, `Working on /${parsed.command}… this can take a while on a cold cache.`);
            return true;
        } catch (e) { return false; }
    }

    stop() { if (this.bot && this.bot.stopPolling) this.bot.stopPolling(); }
}

module.exports = {SignalBot};
