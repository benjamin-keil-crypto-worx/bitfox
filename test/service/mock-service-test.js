let {Service} = require("../../service/MockService");

"use strict";

const assert = require( "assert" );
const chai = require("chai");
const utils = require( "../../lib/utility/util" );
const {State} = require("../../lib/states/States");

let hasKeys = {                             // exchange capabilities
    'CORS': false,
    'cancelOrder': true,
    'createDepositAddress': false,
    'createOrder': true,
    'fetchBalance': true,
    'fetchCanceledOrders': false,
    'fetchClosedOrder': false,
    'fetchClosedOrders': false,
    'fetchCurrencies': false,
    'fetchDepositAddress': false,
    'fetchMarkets': true,
    'fetchMyTrades': false,
    'fetchOHLCV': false,
    'fetchOpenOrder': false,
    'fetchOpenOrders': false,
    'fetchOrder': false,
    'fetchOrderBook': true,
    'fetchOrders': false,
    'fetchStatus': 'emulated',
    'fetchTicker': true,
    'fetchTickers': false,
    'fetchBidsAsks': false,
    'fetchTrades': true,
    'withdraw': false,
}

let options = {
    "public":true,
    "exchange": "bybit",
    "symbol": "ADAUSDT",
    "timeframe": "15m",
}

const exchangeService = Service.getService(options);


describe( "Mock Service Tests ", async () => {
    it( "It should Initialize", async () => {
        await exchangeService.setUpClient("bybit",options);
    })
    it( "It should Return Mock Market Buy Order", async () => {
        await exchangeService.setUpClient("bybit",options);
        let order = await exchangeService.marketBuyOrder("BTC/USDT",20,10,{});
        chai.assert.strictEqual(order.symbol, "BTC/USDT", "Symbol is BTC/USDT");
        chai.assert.strictEqual(order.type, "market", "type is market");
        chai.assert.strictEqual(order.side, "buy", "side is buy");
        chai.assert.strictEqual(order.price, 10, "price is 10");
        chai.assert.strictEqual(order.amount, 20, "amount is 20");
    });
    it( "It should Return Mock Market Sell Order", async  () => {
        await exchangeService.setUpClient("bybit",options);
        let order = await exchangeService.marketBuyOrder("BTC/USDT",20,10,{});
        chai.assert.strictEqual(order.symbol, "BTC/USDT", "Symbol is BTC/USDT");
        chai.assert.strictEqual(order.type, "market", "type is market");
        chai.assert.strictEqual(order.side, "buy", "side is buy");
        chai.assert.strictEqual(order.price, 10, "price is 10");
        chai.assert.strictEqual(order.amount, 20, "amount is 20");
    });
    it( "It should Return Mock Limit Buy Order", async () => {
        await exchangeService.setUpClient("bybit",options);
        let order = await exchangeService.limitBuyOrder("BTC/USDT",20,10,{});
        chai.assert.strictEqual(order.symbol, "BTC/USDT", "Symbol is BTC/USDT");
        chai.assert.strictEqual(order.type, "limit", "type is market");
        chai.assert.strictEqual(order.side, "buy", "side is buy");
        chai.assert.strictEqual(order.price, 10, "price is 10");
        chai.assert.strictEqual(order.amount, 20, "amount is 20");
    });
    it( "It should Return Mock Limit Sell Order", async () => {
        await exchangeService.setUpClient("bybit",options);
        let order = await exchangeService.limitSellOrder("BTC/USDT",20,10,{});
        chai.assert.strictEqual(order.symbol, "BTC/USDT", "Symbol is BTC/USDT");
        chai.assert.strictEqual(order.type, "limit", "type is market");
        chai.assert.strictEqual(order.side, "sell", "side is buy");
        chai.assert.strictEqual(order.price, 10, "price is 10");
        chai.assert.strictEqual(order.amount, 20, "amount is 20");
    });
    it( "It should Return All  Orders", async () => {
        await exchangeService.setUpClient("bybit",options);
        let order1 = await exchangeService.marketBuyOrder("BTC/USDT",20,10,{});
        let order2 = await exchangeService.marketSellOrder("BTC/USDT",20,10,{});
        let order3 = await exchangeService.limitSellOrder("BTC/USDT",20,10,{});
        let order4 = await exchangeService.limitBuyOrder("BTC/USDT",20,10,{});
        let orders = await exchangeService.allOrders("BTC/USDT");
        chai.assert.isOk(orders.filter((order)=>{return order.id===order1.id}).length >0,"Order1 is Returned");
        chai.assert.isOk(orders.filter((order)=>{return order.id===order2.id}).length >0,"Order2 is Returned");
        chai.assert.isOk(orders.filter((order)=>{return order.id===order3.id}).length >0,"Order3 is Returned");
        chai.assert.isOk(orders.filter((order)=>{return order.id===order4.id}).length >0,"Order4 is Returned");
    });
    it( "It should Return a exchange Ticker ", async () => {
        await exchangeService.setUpClient("bybit",options);
        let ticker = await exchangeService.fetchTicker("BTC/USDT");
        chai.assert.isOk(ticker.last," ticker is Returned");
    });

    it( "It should Return a exchange order book ", async () => {
        await exchangeService.setUpClient("bybit",options);
        let orderBook = await exchangeService.fetchOrderBook("BTC/USDT", 20,{});
        chai.assert.containsAllKeys(orderBook, ["bids","asks"],"has bid's and asks");
        chai.assert.isOk((orderBook.asks.length>19),"Order Book asks good length ");
        chai.assert.isOk((orderBook.bids.length>19),"Order Book bids good length ");
    }).timeout(5000);
    it( "It should Return a trade template ", async () => {
        await exchangeService.setUpClient("bybit",options);
        let order1 = await exchangeService.marketBuyOrder("BTC/USDT",20,10,{});
        let tradeTemplate = await exchangeService.getTradeTemplate([new Date()], order1, 1, 30, 20, 'buy');
        chai.assert.isOk(tradeTemplate,"Trade Template return fine");
        chai.assert.isOk(tradeTemplate.entryTimestamp,"Trade Template returns fine");
        chai.assert.isOk(tradeTemplate.entryOrder,"Trade Template entryOrder returns fine");
    });
    it( "It should Return Balance Mock", async () => {
        await exchangeService.setUpClient("bybit",options);
        let balance =exchangeService.getBalance("USDT","BTC",1000,5)
        chai.assert.isOk(balance,"balance returns fine");
        chai.assert.containsAllKeys(balance, ["timestamp","datetime","free","BTC","USD"],"Balance Has all Keys");
        chai.assert.strictEqual(balance.free.USDT,1000, "free USDT Balance returns Correct");
        chai.assert.strictEqual(balance.free.BTC,5, "free BTC Balance returns Correct");
        chai.assert.strictEqual(balance.BTC.free, 5, "BTC free balance returns Correct");
        chai.assert.strictEqual(balance.BTC.used, 0, "BTC used balance returns Correct");
        chai.assert.strictEqual(balance.BTC.total, 5, "BTC total balance returns Correct");
        chai.assert.strictEqual(balance.USD.free, 1000, "USD free balance returns Correct");
        chai.assert.strictEqual(balance.USD.used, 0, "USD used balance returns Correct");
        chai.assert.strictEqual(balance.USD.total, 1000, "USD total balance returns Correct");

    });

    it( "It should Return a exchange has check of true", async () => {
        await exchangeService.setUpClient("bybit",options);
        chai.assert.isOk( exchangeService.has("fetchOHLCV"),"has check works");
    });
} );
