/**
 * BitFox signalling bot — read-only market analysis over Telegram.
 *
 * Requires NO exchange API credentials. Market data and backtests use public endpoints,
 * so this process cannot place an order. That is deliberate: under the honest engine 13
 * of 14 bundled strategies lose money after costs (see .claude/context/STRATEGY-LEDGER.md),
 * which does not justify giving any of them trade authority.
 *
 *   TELEGRAM_BOT_TOKEN=...           (required)
 *   TELEGRAM_ALLOWED_CHAT_IDS=1,2    (optional; open to everyone when unset)
 *   EXCHANGE=bybit                   (optional, default bybit)
 *
 * Run: node signal-bot.js
 */
let {SignalBot} = require("./signal/SignalBot");
let fs = require("fs");
let path = require("path");

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return;
    let lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        let eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        let key = line.substring(0, eqIdx).trim();
        let val = line.substring(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}

let envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    loadEnv(envPath);
    console.log("[BitFox] Loaded .env config");
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("[BitFox] ERROR: Set TELEGRAM_BOT_TOKEN in .env (create a bot with @BotFather)");
    process.exit(1);
}

let allowed = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
if (allowed.length === 0) {
    console.warn("[BitFox] WARNING: TELEGRAM_ALLOWED_CHAT_IDS is not set — anyone who finds this bot can query it.");
    console.warn("[BitFox]          Read-only, so no funds are at risk, but it consumes your exchange rate limit.");
} else {
    console.log(`[BitFox] Allowlist active: ${allowed.length} chat id(s)`);
}

SignalBot.fromEnv().start();
console.log("[BitFox] Signal bot running (read-only). Send /help in Telegram.");
