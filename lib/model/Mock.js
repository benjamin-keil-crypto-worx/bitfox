class Mock {
    static mocker() {
        return new Mock()
    }

    constructor() {
        this.id = 50000;
        this.orders = [];
    }

    buyOrder(symbol, type, orderPrice, qty) {
        this.id = this.id + 1;
        let order = {
            'id': `${this.id}`, // string
            'datetime': new Date().toISOString(), // ISO8601 datetime of 'timestamp' with milliseconds
            'timestamp': new Date().getTime(), // order placing/opening Unix timestamp in milliseconds
            'lastTradeTimestamp': new Date().getTime(), // Unix timestamp of the most recent trade on this order
            'status': 'open',        // 'open', 'closed', 'canceled', 'expired', 'rejected'
            'symbol': `${symbol}`,     // symbol
            'type': `${type}`,       // 'market', 'limit'
            'timeInForce': 'GTC',         // 'GTC', 'IOC', 'FOK', 'PO'
            'side': 'buy',         // 'buy', 'sell'
            'price': orderPrice,   // float price in quote currency (may be empty for market orders)
            'average': orderPrice,   // float average filling price
            'amount': qty         // ordered amount of base currency
        };
        this.orders.push(order)
        return order;
    }

    sellOrder(symbol, type, orderPrice, qty) {
        this.id = this.id + 1;
        let order = {
            'id': `${this.id}`, // string
            'datetime': new Date().toISOString(), // ISO8601 datetime of 'timestamp' with milliseconds
            'timestamp': new Date().getTime(), // order placing/opening Unix timestamp in milliseconds
            'lastTradeTimestamp': new Date().getTime(), // Unix timestamp of the most recent trade on this order
            'status': 'open',        // 'open', 'closed', 'canceled', 'expired', 'rejected'
            'symbol': `${symbol}`,     // symbol
            'type': `${type}`,       // 'market', 'limit'
            'timeInForce': 'GTC',         // 'GTC', 'IOC', 'FOK', 'PO'
            'side': 'sell',         // 'buy', 'sell'
            'price': orderPrice,   // float price in quote currency (may be empty for market orders)
            'average': orderPrice,   // float average filling price
            'amount': qty         // ordered amount of base currency
        };
        this.orders.push(order)
        return order;
    }

    getClosedOrder(id, symbol, price) {
        let predicate = (order) => {
            return order.side === 'buy' ? (price > order.price) : (price < order.price)
        }
        let result = this.orders.filter((order) => {
            return (order.id = id && predicate(order))
        })
        if (result && result.length > 0) {
            // Remove this order as it closed now
            let order = result[0];
            order.status = 'closed';
            this.orders = this.orders.filter((order) => {
                return order.id !== id
            });
            return order;
        }
        return null;
    }

    getOpenOrder(id) {
        return this.orders.filter((order) => {
            (order.id = id)
        })
    }

    getAllOrders(symbol) {
        return this.orders;
    }

    getBalance(quote, base, quoteAmount, baseAmount) {
        let free = {}
        free[quote] = quoteAmount;
        free[base] = baseAmount;
        return {
            'timestamp': new Date().getTime(), // Unix Timestamp in milliseconds (seconds * 1000)
            'datetime': new Date().toISOString(), // ISO8601 datetime string with milliseconds

            //-------------------------------------------------------------------------
            // indexed by availability of funds first, then by currency

            'free': free,


            //-------------------------------------------------------------------------
            // indexed by currency first, then by availability of funds

            'BTC': {           // string, three-letter currency code, uppercase
                'free': free[base],   // float, money available for trading
                'used': 0,
                'total': free[base]// float, total balance (free + used)
            },

            'USD': {           // ...
                'free': free[quote],   // ...
                'used': 0,
                'total': free[quote]
            }
        }
    }

    getTradeTemplate(currentCandles, order, profitTarget, funds, amount, side) {
        return {
            entryTimestamp: new Date(currentCandles[0]),
            exitTimeStamp: null,
            totalBars: 0,
            entryOrder: order,
            exitOrder: null,
            tradeDirection: side,
            profitTarget: profitTarget,
            stopTriggered:false,
            funds: funds,
            amount: amount
        }
    }
}

module.exports = {Mock: Mock}
