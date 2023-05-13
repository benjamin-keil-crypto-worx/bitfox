/**
 * Class Mock
 <pre>
 * This Class provides the Mocking Logic to the Bitfox Engine, we don't want to make real Trade executions when the
 * BitFox Engine is configured to not run life
 </pre>
 */
class Mock {

    /**
     *
     * @returns {Mock}
     */
    static mocker() {
        return new Mock()
    }

    constructor() {
        this.id = 50000;
        this.orders = [];
    }

    /**
     *
     * @param symbol {String} The Base Quote pay i.e. BTCUSDT ETHUSTD eth
     * @param type {string} the type of order to mock i.e. limit|market
     * @param orderPrice {number} the price of asset at which this order should be mocked for
     * @param qty {number} the amount for which this order should be mocked for
     * @returns {{symbol: string, average, datetime: string, side: string, amount, price, id: string, lastTradeTimestamp: number, type: string, timeInForce: string, timestamp: number, status: string}}
     */
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

    /**
     *
     /**
     * @param symbol {String} The Base Quote pay i.e. BTCUSDT ETHUSTD eth
     * @param type {string} the type of order to mock i.e. limit|market
     * @param orderPrice {number} the price of asset at which this order should be mocked for
     * @param qty {number} the amount for which this order should be mocked for
     * @returns {{symbol: string, average, datetime: string, side: string, amount, price, id: string, lastTradeTimestamp: number, type: string, timeInForce: string, timestamp: number, status: string}}
     */
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

    /**
     * Returns a Mocked order with a closed status
     *
     * @param id {String} The id of the Mocked Order
     * @param symbol {String} The Base Quote pay i.e. BTCUSDT ETHUSTD eth
     * @param price {number}
     * @returns {Object}  see ccxt lib for order structure
     */
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

    /**
     *
     * @param id {String} The id of the Mocked Order
     * @return {Object}  see ccxt lib for order structure
     */
    getOpenOrder(id) {
        return this.orders.filter((order) => {
            (order.id = id)
        })
    }

    /**
     *
     * @param symbol {String} The Base Quote pay i.e. BTCUSDT ETHUSTD eth
     * @returns {Object}  see ccxt lib for order structure
     */
    getAllOrders(symbol) {
        return this.orders;
    }

    /**
     *
     * @param quote {String} The Quote currency i.e USDT
     * @param base {String} The Base Currency i.e. BTC
     * @param quoteAmount The Quote amount
     * @param baseAmount the base amount
     * @returns {{BTC: {total: *, used: number, free: *}, datetime: string, USD: {total: *, used: number, free: *}, free: {}, timestamp: number}}
     */
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

    /**
     *
     * @param currentCandles {Array<number>} the current candles
     * @param order {any} the Order that you want to add to the trade template
     * @param profitTarget {number} the profit target
     * @param funds {number} the funds available in this mocked scenario
     * @param amount {number} the amount available in this mocked scenario
     * @param side {String} the side of the trade i.e. long|shot
     * @returns {{entryTimestamp: Date, tradeDirection, maxDrawDown: number, amount :number, entryOrder, profitTarget, stopTriggered: boolean, funds, totalBars: number, exitOrder: null, exitTimeStamp: null}}
     */

    getTradeTemplate(currentCandles, order, profitTarget, funds, amount, side) {
        return {
            entryTimestamp: new Date(currentCandles[0]),
            exitTimeStamp: null,
            maxDrawDown:0,
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

/**
 *
 * @type {{Mock: Mock}}
 */
module.exports = {Mock: Mock}
