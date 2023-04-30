"use strict";
const assert = require( "assert" );
const chai = require("chai");


let {BitFoxEngine, Strategy, Bollinger, RSITrend, SmartAccumulate,EmaTrend,MfiMacd,SimplePriceAlert,builder} = require("../../engine/BitFox");

let keys=  ["requiredCandles","sidePreference","type","backtest",
            "pollRate","public","exchangeName","symbol","timeframe",
            "amount","profitPct","stopLossPct","fee","requiredCredentials",
            "life","interval","strategyExtras","alertExtras","notifyOnly"];
const build =(builder) =>{
    return builder().requiredCandles(200)
        .sidePreference("long")
        .type("Telegram")
        .backtest(false)
        .pollRate(10)
        .public(true)
        .exchange("bybit")
        .symbol("BTCUSDT")
        .timeframe("4h")
        .amount(100)
        .profitPct(0.03)
        .stopLossPct(0.02)
        .fee(0.002)
        .key("FAKE_KEY")
        .secret("FAKE_SECRET")
        .life(false)
        .interval(10)
        .strategyExtras({period:12,stDev:3})
        .alertExtras({condition:"gt", targetPrice:20000})
        .notifyOnly(false)

}
const getEngine = (builder) =>{
   return builder.build();
}
const getConfig =(builder) =>{
    return builder.getConfig();
}
describe( "BitFox Tests", async () => {

    it( "It Should Build Configuration Object With Correct Structure", async () => {
        let config = getConfig(build(builder));
        chai.assert.containsAllKeys(config, keys,"Builder has created all Configuration Keys");
        chai.assert.doesNotHaveAnyKeys(config, ["token"],"Notification Token is not added");
        chai.assert.containsAllKeys(config.requiredCredentials, ["secret","apiKey"],"Required Credentials Has Keys");
        chai.assert.containsAllKeys(config.strategyExtras, ["period","stDev"],"strategyExtras has all Keys");
        chai.assert.containsAllKeys(config.alertExtras, ["condition","targetPrice"],"alertExtras has all keys");

    });

    it( "It Should Build Configuration Object With Correct Values", async () => {
        let config = getConfig(build(builder));
        chai.assert.strictEqual(config.requiredCandles,200, "requiredCandles is 200")
        chai.assert.strictEqual(config.sidePreference,'long', "sidePreference is long")
        chai.assert.strictEqual(config.type,"Telegram", "type is Telegram")
        chai.assert.strictEqual(config.backtest,false, "backtest is 200")
        chai.assert.strictEqual(config.pollRate,10, "pollRate is 10")
        chai.assert.strictEqual(config.public,true, "public is true")
        chai.assert.strictEqual(config.exchangeName,"bybit", "exchangeName is bybit")
        chai.assert.strictEqual(config.symbol,"BTCUSDT", "requiredCredentials is 200")
        chai.assert.strictEqual(config.timeframe,"4h", "timeframe is 4h")
        chai.assert.strictEqual(config.amount,100, "amount is 100")
        chai.assert.strictEqual(config.profitPct,0.03, "profitPct is 0.03")
        chai.assert.strictEqual(config.stopLossPct,0.02, "stopLossPct is 0.02")
        chai.assert.strictEqual(config.fee,0.002, "requiredCredentials is 200")
        chai.assert.strictEqual(JSON.stringify(config.requiredCredentials),JSON.stringify({ apiKey:"FAKE_KEY", secret:"FAKE_SECRET" }), "requiredCredentials is Ok")
        chai.assert.strictEqual(config.life,false, "life is false")
        chai.assert.strictEqual(config.interval,10, "interval is 10")
        chai.assert.strictEqual(JSON.stringify(config.strategyExtras),JSON.stringify({ period: 12, stDev: 3 }), "strategyExtras is Ok")
        chai.assert.strictEqual(JSON.stringify(config.alertExtras),   JSON.stringify({ condition: 'gt', targetPrice: 20000 }), "alertExtras is Ok")
        chai.assert.strictEqual(config.notifyOnly,false, "notifyOnly is false")
    });

    it( "It Should Return A List of Exchanges", async () => {
        let exchanges = BitFoxEngine.getExchanges();
        chai.assert.isOk((exchanges.length>0 && exchanges.includes("bybit")), 'All Exchanges are returned');
    });

    it( "It Should Return A List of Market Symbols", async () => {
        let engine = getEngine(build(builder));
        await engine.setupAndLoadClient();
        let symbols = await engine.getSymbols();
        chai.assert.isOk((symbols.length>0 && symbols.includes("BTC/USDT")), 'All Symbols are returned');
    });

    it( "It Should Return A Timeout Value", async () => {
        let engine = getEngine(build(builder));
        await engine.setupAndLoadClient();
        let timeout = await engine.getTimeout();
        chai.assert.isOk(timeout>0, 'Timeout is returned');
    });

    it( "It Should Return An API  Rate Limit Value", async () => {
        let engine = getEngine(build(builder));
        await engine.setupAndLoadClient();
        let rateLimit = await engine.getRateLimit();
        chai.assert.isOk(rateLimit>0, 'Rate Limit is returned');
    });

    it( "It Should Return a list of Time Frames", async () => {
        let engine = getEngine(build(builder));
        await engine.setupAndLoadClient();
        let timeFrames = await engine.getTimeFrames();
        chai.assert.isOk(timeFrames, 'Timeframes are returned');
    });

    it( "It Should Return Required Credentials for a given Exchange", async () => {
        let engine = getEngine(build(builder));
        await engine.setupAndLoadClient();
        let requiredCreds = await engine.getRequiredCredentials();
        chai.assert.isOk(requiredCreds, 'required credentials are returned');
    });

    it( "It Should Return Available Currencies on the Exchange", async () => {
        let engine = getEngine(build(builder));
        await engine.setupAndLoadClient();
        let currencies = await engine.getCurrencies();
        chai.assert.isOk(currencies, 'currencies are returned');
    });

    it( "It Should Return Available Markets on the Exchange", async () => {
        let engine = getEngine(build(builder));
        await engine.setupAndLoadClient();
        let markets = await engine.getMarkets();
        chai.assert.isOk(markets, 'markets are returned');
    });
} );
