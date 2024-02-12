let {builder} = require("bifox").bitfox;

/**
 * Instantiate a BitFox Backtest Engine
 */

module.exports.getTestEngineForBackTest = () =>{
   return builder()
            .requiredCandles(200)
            .sidePreference("biDirectional")
            .backtest(true)
            .pollRate(50)
            .public(true)
            .exchange("bybit")
            .symbol("ADAUSDT")
            .timeframe("15m")
            .amount(200)
            .profitPct(1.03)
            .strategyExtras({grids:5, period:200})
            .stopLossPct(0.98)
            .fee(0.002)
            .key("FAKE_KEY")
            .secret("FAKE_SECRET")
            .life(false)
            .interval(10)
            .build();
}

/**
 * 
 * Instantiate a standalone Server BitFox Engine 
 */
module.exports.getEngineForServer = () =>{
   return builder()
       .requiredCandles(150)
       .public(true)
       .exchange("bybit")
       .symbol("ADAUSDT")
       .timeframe("5m")
       .key("FAKE_KEY")
       .secret("FAKE_SECRET")
       .life(false)
       .build();
}

/**
 * 
 * Instantiate a Paper trade BitFox Engine (runs in real time but trades are simulated! ) 
 */
module.exports.getLifePaperTradeEngine = () =>{
   return builder()
   .requiredCandles(200)
   .pollRate(10)
   .sidePreference("biDirectional")
   .timeframe("5m")
   .public(true)
   .exchange("bybit")
   .symbol("ADAUSDC")
   .amount(150)
   .profitPct(0.03)
   .useLimitOrder(true)
   //.strategyExtras({periodFast:9, periodSlow:13})
   .stopLossPct(0.015)
   .key("FAKE_KEY")
   .secret("FAKE_SECRET")
   .life(true)
   .interval(30)
   .notifyOnly(false)
   .build();
}

/**
 * 
 * Instantiate a Notify Only Email Notification BitFox Engine 
 */
module.exports.getEmailNotificationEngine = () =>{
    return builder()
    .requiredCandles(200)
    .pollRate(10)
    .sidePreference("biDirectional")
    .timeframe("5m")
    .public(true)
    .exchange("bybit")
    .symbol("ADAUSDC")
    .amount(150)
    .profitPct(0.03)
    .useLimitOrder(true)
    //.strategyExtras({periodFast:9, periodSlow:13})
    .stopLossPct(0.015)
    .key("FAKE_KEY")
    .secret("FAKE_SECRET")
    .life(true)
    .interval(30)
    .notifyOnly(true)
    .notificationToken("Your_token")
    .emailFrom("someone@from_this_email_address.com")
    .emailto("someone@with_this_email_address.com")
    .build();
 }

 /**
 * 
 * Instantiate a Notify Only Slack Notification BitFox Engine 
 */
module.exports.getSlackNotificationEngine = () =>{
    return builder()
    .requiredCandles(200)
    .pollRate(10)
    .sidePreference("biDirectional")
    .timeframe("5m")
    .public(true)
    .exchange("bybit")
    .symbol("ADAUSDC")
    .amount(150)
    .profitPct(0.03)
    .useLimitOrder(true)
    //.strategyExtras({periodFast:9, periodSlow:13})
    .stopLossPct(0.015)
    .key("FAKE_KEY")
    .secret("FAKE_SECRET")
    .life(true)
    .interval(30)
    .notifyOnly(true)
    .notificationToken("Your_token")
    .slackChannel("yourSlackChannelId")
    .build();
 }
 
 /**
 * 
 * Instantiate a Notify Only Telegram Notification BitFox Engine 
 */
module.exports.getTelegramNotificationEngine = () =>{
    return builder()
    .requiredCandles(200)
    .pollRate(10)
    .sidePreference("biDirectional")
    .timeframe("5m")
    .public(true)
    .exchange("bybit")
    .symbol("ADAUSDC")
    .amount(150)
    .profitPct(0.03)
    .useLimitOrder(true)
    //.strategyExtras({periodFast:9, periodSlow:13})
    .stopLossPct(0.015)
    .key("FAKE_KEY")
    .secret("FAKE_SECRET")
    .life(true)
    .interval(30)
    .notifyOnly(true)
    .notificationToken("Your_token")
    .telegramChatId("yourTelegramChatId")
    .build();
 }
 
 /**
 * 
 * Instantiate a Notify Only Ntfy Notification BitFox Engine 
 */
module.exports.getNtfyNotificationEngine = () =>{
    return builder()
    .requiredCandles(200)
    .pollRate(10)
    .sidePreference("biDirectional")
    .timeframe("5m")
    .public(true)
    .exchange("bybit")
    .symbol("ADAUSDC")
    .amount(150)
    .profitPct(0.03)
    .useLimitOrder(true)
    //.strategyExtras({periodFast:9, periodSlow:13})
    .stopLossPct(0.015)
    .key("FAKE_KEY")
    .secret("FAKE_SECRET")
    .life(true)
    .interval(30)
    .notifyOnly(true)
    .notificationToken("Your_token")
    .ntfyAddress("http://123.456.78:80")
    .ntfyTopic("some-cool-topic-name")
    .build();
 }
 

/**
 * 
 * Instantiate a BitFox Trading Bot Engine (runs in real time trades are executed on exchange ) 
 */
module.exports.getLifeTradingBotEngine = () =>{
    return builder()
    .requiredCandles(200)
    .pollRate(10)
    .sidePreference("biDirectional")
    .timeframe("5m")
    .public(false)
    .exchange("bybit")
    .symbol("ADAUSDC")
    .amount(150)
    .profitPct(0.03)
    .useLimitOrder(true)
    //.strategyExtras({periodFast:9, periodSlow:13})
    .stopLossPct(0.015)
    .key("THIS_IS_NOT_MY_KEY")
    .secret("THIS_IS_NOT_MY_SECRET")
    .life(true)
    .interval(30)
    .notifyOnly(false)
    .build();
 }