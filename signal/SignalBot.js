const {CommandRouter} = require("./CommandRouter");

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

    stop() { if (this.bot && this.bot.stopPolling) this.bot.stopPolling(); }
}

module.exports = {SignalBot};
