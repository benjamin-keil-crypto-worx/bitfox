/**
 *  @typedef {Object} ticker A ticker is a statistical calculation with the information calculated over the past 24 hours for a specific market.
 *  @property {String} symbol string symbol of the market ('BTC/USD', 'ETH/BTC', ...)
 *  @property {String} info  { the original non-modified unparsed reply from exchange API },
 *  @property {String}timestamp int (64-bit Unix Timestamp in milliseconds since Epoch 1 Jan 1970)
 *  @property {Date} datetime ISO8601 datetime string with milliseconds
 *  @property {Number} high highest price
 *  @property {Number} low lowest price
 *  @property {Number} bid current best bid (buy) price
 *  @property {Number} bidVolume current best bid (buy) amount (may be missing or undefined)
 *  @property {Number} ask current best ask (sell) price
 *  @property {Number} askVolume current best ask (sell) amount (may be missing or undefined)
 *  @property {Number} vwap  volume weighed average price
 *  @property {Number} open opening price
 *  @property {Number} close closing price (closing price for current period)
 *  @property {Number} last same as `close`, duplicated for convenience
 *  @property {Number} previousClose closing price for the previous period
 *  @property {Number} change absolute change, `last - open`
 *  @property {Number} percentage relative change, `(change/open) * 100`
 *  @property {Number} average average price, `(last + open) / 2`
 *  @property {Number} baseVolume volume of base currency traded for last 24 hours
 *  @property {Number} quoteVolume  volume of quote currency traded for last 24 hours
 */



/**
 * @typedef {Object} orderBook the current order book for any given trading on the exchange
 * @property {Array<Array<number>>} bids An array of [price, amount] pairs
 * @property {Array<Array<number>>} asks An array of [price, amount] pairs
 * @property {String} symbol  'ETH/BTC',  a unified market symbol
 * @property {Number} timestamp 1499280391811, Unix Timestamp in milliseconds (seconds * 1000)
 * @property {String} datetime '2017-07-05T18:47:14.692Z', // ISO8601 datetime string with milliseconds
 * @property {Number} nonce    1499280391811, an increasing unique identifier of the orderbook snapshot
 */

/**
 * @typedef {Object} currency the Currency Information from exchange
 * @property {String} id       'btc',     string literal for referencing within an exchange
 * @property {String} code     'BTC',     uppercase unified string literal code the currency
 * @property {String} name     'Bitcoin', string, human-readable name, if specified
 * @property {Boolean} active    true,    boolean, currency status (tradeable and withdrawable)
 * @property {Number} fee      0.123,     withdrawal fee, flat
 * @property {Number} precision 8,        number of decimal digits "after the dot" (depends on exchange.precisionMode)
 * @property {Boolean} deposit   true     boolean, deposits are available
 * @property {Boolean} withdraw  true     boolean, withdraws are available
 */

/**
 * @typedef marketStructure
 *  @property {String} id       'btcusd',      string literal for referencing within an exchange
 *  @property {String} symbol  'BTC/USD',      uppercase string literal of a pair of currencies
 *  @property {String} base    'BTC',          uppercase string, unified base currency code, 3 or more letters
 *  @property {String} quote   'USD',          uppercase string, unified quote currency code, 3 or more letters
 *  @property {String} baseId  'btc',          any string, exchange-specific base currency id
 *  @property {String} quoteId 'usd',          any string, exchange-specific quote currency id
 *  @property {Boolean} active   true,          boolean, market status
 *  @property {String} type    'spot',         spot for spot, future for expiry futures, swap for perpetual swaps, 'option' for options
 *  @property {Boolean} spot     true,          whether the market is a spot market
 *  @property {Boolean} margin   true,          whether the market is a margin market
 *  @property {Boolean} future   false,         whether the market is a expiring future
 *  @property {Boolean} swap     false,         whether the market is a perpetual swap
 *  @property {Boolean} option   false,         whether the market is an option contract
 *  @property {Boolean} contract false,         whether the market is a future, a perpetual swap, or an option
 *  @property {String} settle   'USDT',        the unified currency code that the contract will settle in, only set if `contract` is true
 *  @property {String} settleId 'usdt',        the currencyId of that the contract will settle in, only set if `contract` is true
 *  @property {Number} contractSize 1,         the size of one contract, only used if `contract` is true
 *  @property {Boolean} linear   true,          the contract is a linear contract (settled in quote currency)
 *  @property {Boolean} inverse  false,         the contract is an inverse contract (settled in base currency)
 *  @property {Number} expiry  1641370465121,  the unix expiry timestamp in milliseconds, undefined for everything except market['type'] `future`
 *  @property {String} expiryDatetime '2022-03-26T00:00:00.000Z', The datetime contract will in iso8601 format
 *  @property {Number} strike 4000,            price at which a put or call option can be exercised
 *  @property {String} optionType 'call',      call or put string, call option represents an option with the right to buy and put an option with the right to sell
 *  @property {Number} taker    0.002,         taker fee rate, 0.002 = 0.2%
 *  @property {Number} maker    0.0016,        maker fee rate, 0.0016 = 0.16%
 *  @property {Boolean} percentage true,        whether the taker and maker fee rate is a multiplier or a fixed flat amount
 *  @property {Boolean} tierBased false,        whether the fee depends on your trading tier (your trading volume)
 *  @property {String} feeSide 'get',          string literal can be 'get', 'give', 'base', 'quote', 'other'
 */

/**
 * @typedef {object} fee Fee structure
 *
 * @property {String} currency  'BTC',  which currency the fee is (usually quote)
 * @property {Number} cost      0.0009, the fee amount in that currency
 * @property {Number} rate     0.002,  the fee rate (if available)
 *
 */
/**
 * @typedef {Object} order  an order from an exchange
 * {
 *  @property {String} id                '12345-67890:09876/54321', string
 *  @property {String} clientOrderId     'abcdef-ghijklmnop-qrstuvwxyz', a user-defined clientOrderId, if any
 *  @property {String} datetime          '2017-08-17 12:42:48.000',  ISO8601 datetime of 'timestamp' with milliseconds
 *  @property {Number} timestamp          1502962946216,  order placing/opening Unix timestamp in milliseconds
 *  @property {Number} lastTradeTimestamp 1502962956216,  Unix timestamp of the most recent trade on this order
 *  @property {String} status      'open',       'open', 'closed', 'canceled', 'expired', 'rejected'
 *  @property {String} symbol      'ETH/BTC',    symbol
 *  @property {String} type        'limit',      'market', 'limit'
 *  @property {String} timeInForce 'GTC',        'GTC', 'IOC', 'FOK', 'PO'
 *  @property {String} side         'buy',        'buy', 'sell'
 *  @property {Number} price'       0.06917684,  float price in quote currency (may be empty for market orders)
 *  @property {Number} average      0.06917684,  float average filling price
 *  @property {Number} amount       1.5,         ordered amount of base currency
 *  @property {Number} filled       1.1,         filled amount of base currency
 *  @property {Number} remaining    0.4,         remaining amount to fill
 *  @property {Number} cost         0.076094524, 'filled' * 'price' (filling price used where available)
 *  @property {Array<any>} trades     [ ... ],   a list of order trades/executions
 *  @property {Object} info           {...}      the original unparsed order structure as is
 *
 */

/**
 * @typedef {Object} timeframe empty if the exchange.has['fetchOHLCV'] !== true
 * @property {String} 1m   1minute (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 5m   5minutes (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 15m  15minutes (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 30m  30minutes (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1h   1hour (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 2h   2hours (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 4h   4hours (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 12h  12hours (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1d   1day (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1W   1week (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1M   1month (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 * @property {String} 1y   1year (Exchange dependent the exchange ned to support this interval consult your exchange documentation!)
 */

module.exports= {};
