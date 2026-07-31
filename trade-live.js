let {builder} = require("./index").bitfox;
let {Phoenix} = require("./strategies/Phoenix");
let {SuperTrendFull} = require("./strategies/SuperTrendFull");
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

let strategyName = process.env.STRATEGY || 'Phoenix';
let symbol = process.env.SYMBOL || 'ADAUSDT';
let timeframe = process.env.TIMEFRAME || '1h';
let amount = parseFloat(process.env.AMOUNT) || 50;
let key = process.env.BYBIT_API_KEY;
let secret = process.env.BYBIT_API_SECRET;

if (!key || !secret || key === 'your_api_key_here') {
    console.error("[BitFox] ERROR: Set BYBIT_API_KEY and BYBIT_API_SECRET in .env");
    process.exit(1);
}

let strategyMap = {
    'Phoenix': Phoenix,
    'SuperTrend': require("./strategies/SuperTrend").SuperTrend,
    'SuperTrendFull': SuperTrendFull,
    'RSITrend': require("./strategies/RSITrend").RSITrend,
    'EmaTrend': require("./strategies/EmaTrend").EmaTrend,
    'Regime': require("./strategies/Regime").Regime,
    'DonchianTrend': require("./strategies/DonchianTrend").DonchianTrend
};

let StrategyClass = strategyMap[strategyName];
if (!StrategyClass) {
    console.error(`[BitFox] Unknown strategy: ${strategyName}. Available: ${Object.keys(strategyMap).join(', ')}`);
    process.exit(1);
}

console.log(`[BitFox] Starting live trading`);
console.log(`[BitFox] Strategy: ${strategyName} | ${symbol} ${timeframe} | Amount: ${amount} USDT`);

let builderInstance = builder()
    .exchange("bybit")
    .symbol(symbol)
    .timeframe(timeframe)
    .amount(amount)
    .profitPct(1.03)
    .stopLossPct(0.98)
    .life(true)
    .key(key)
    .secret(secret);

let notifyType = process.env.NOTIFICATION_TYPE;
let notifyToken = process.env.TELEGRAM_BOT_TOKEN || process.env.SLACK_WEBHOOK_URL;

if (notifyType && notifyToken) {
    builderInstance = builderInstance
        .type(notifyType)
        .notificationToken(notifyToken);

    if (notifyType === 'telegram' && process.env.TELEGRAM_CHAT_ID) {
        builderInstance = builderInstance.telegramChatId(process.env.TELEGRAM_CHAT_ID);
    }
    if (notifyType === 'email') {
        if (process.env.EMAIL_FROM) builderInstance = builderInstance.emailFrom(process.env.EMAIL_FROM);
        if (process.env.EMAIL_TO) builderInstance = builderInstance.emailTo(process.env.EMAIL_TO);
    }
    if (notifyType === 'ntfy') {
        if (process.env.NTFY_TOPIC) builderInstance = builderInstance.ntfyTopic(process.env.NTFY_TOPIC);
        if (process.env.NTFY_ADDRESS) builderInstance = builderInstance.ntfyAddress(process.env.NTFY_ADDRESS);
    }

    console.log(`[BitFox] Notifications enabled: ${notifyType}`);
} else {
    console.log("[BitFox] No notifications configured");
}

let engine = builderInstance.build();

(async () => {
    try {
        console.log("[BitFox] Setting up exchange client...");
        await engine.setupAndLoadClient();
        console.log("[BitFox] Exchange client ready");

        engine.applyStrategy(StrategyClass);
        console.log(`[BitFox] Strategy applied: ${strategyName}`);

        if (strategyName === 'Phoenix') {
            engine.on("onOrderPlaced", (data) => {
                console.log(`[Trade] Order placed: ${data.order.side} ${data.order.amount} @ ${data.order.price}`);
            });
            engine.on("onTradeComplete", (data) => {
                console.log(`[Trade] Complete: entry=${data.entryOrder.price} exit=${data.exitOrder.price}`);
            });
            engine.on("onStopLossTriggered", (data) => {
                console.log(`[Trade] Stop loss: entry=${data.entryOrder.price} exit=${data.exitOrder.price}`);
            });
            engine.on("onStrategyResponse", (data) => {
                if (data.result && data.result.state) {
                    console.log(`[Signal] ${data.result.state}${data.result.custom?.reason ? ' - ' + data.result.custom.reason : ''}`);
                }
            });
        }

        engine.on("onError", (error) => {
            console.error(`[Error] ${error.message || error}`);
        });

        console.log("[BitFox] Engine running. Press Ctrl+C to stop.");
        await engine.run();
    } catch (err) {
        console.error(`[BitFox] Fatal: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    }
})();

process.on('SIGINT', () => {
    console.log("\n[BitFox] Shutting down...");
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error(`[BitFox] Uncaught: ${err.message}`);
});

process.on('unhandledRejection', (err) => {
    console.error(`[BitFox] Unhandled rejection: ${err.message}`);
});
