let { Client } = require("../server/client");



let client = Client.getInstance();

client.setExchangeName("bybit")
    .setLife(false)
    .setPublic(false)
    .setSymbol("BTCUSDT")
    .setTimeFrame("5m")
    .setUrl("http://localhost")
    .setPort(6661)
    .setXsession("eC1zZXNzaW9uLWlkOjIzY2QxMWE0MTA3ODIzMDI1YTQwNGNjZTE3YzFmZTUwMDgyMzhhYzMwMjUxYjMxZDU1Zjc1YmNlODZkYjM2ZjM=")

/** Make Ping Request */
client.ping().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})

/** Make Health Check Request */
client.health().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})

/** Make a Ballance Request (need to be Authenticated against the given exchange) */
client.getballance().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})

/** Fetch A Ticker  */
client.ticker().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})

/** Make a orderbook Request */
client.orderbook().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})

/** Make Historical Candlestick Data Request */
client.candles().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})

/** Make Buy Request (need to be Authenticated against the given exchange) */
client.buy().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})

/** Make Buy Request (need to be Authenticated against the given exchange) */
client.sell().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})

/** Sends out a Shutdown signal to the server! */
client.shutdown().then(result => {
    console.log(result.data)
}).catch(error => {
    console.error(error);
})
