const {Alert} = require("./Alert")

/**
 * Class SimplePriceAlert
 <pre>
 * This class is just a Demonstration of how you could implement custom Alert processes
 *
 * It will Alert users of this class to price simple alerts based on provided conditions
 </pre>
 *
 */
class SimplePriceAlert extends Alert{

    /**
     *
     * @param args {any}  Alert Args
     * @return {SimplePriceAlert}
     */
    static init(args) {
        return new SimplePriceAlert(args);
    }

    /**
     *
     * @param args  Alert Args
     */
    constructor(args) {
        super(args);
        let cond = (args.extras && args.extras.condition) ? args.extras.condition : "eq"
        this.condition = ["gt", "lt", "eq"].includes(cond) ? cond : "eq";
        this.targetPrice = args.extras.targetPrice;
    }

    /**
     *
     * @param _index {number} not used
     * @param backtest {Boolean} not used
     * @param ticker {any} ticker instance with last price infor mation
     * @return {Promise<{custom: string, state: string, timestamp: number}>}
     */
    async run(_index=0, backtest =false, ticker=null) {
        let currentPrice = ticker;
        switch (this.condition) {
            case "gt": {
                if (currentPrice > this.targetPrice) {
                    await super.notify(this.args, `BotVox Alert ${this.args.symbol} \n current Price ${currentPrice} greater than ${this.targetPrice}`)
                    return { state:this.states.STATE_TRIGGER_ALERT, timestamp:new Date().getTime(), custom:`${this.args.symbol}  ${currentPrice} ${this.condition} ${this.targetPrice}`}
                }
            }
                break;
            case "lt": {
                if (currentPrice < this.targetPrice) {
                    await super.notify(this.args, `BotVox Alert ${this.args.symbol} \n current Price ${currentPrice} less than ${this.targetPrice}`);
                    return { state:this.states.STATE_TRIGGER_ALERT, timestamp:new Date().getTime(), custom:`${this.args.symbol}  ${currentPrice} ${this.condition} ${this.targetPrice}`}


                }
            }
                break;
            case "eq": {
                if (currentPrice === this.targetPrice) {
                    await super.notify(this.args, `BotVox Alert ${this.args.symbol} \n current Price ${currentPrice} equal to  ${this.targetPrice}`)
                    return { state:this.states.STATE_TRIGGER_ALERT, timestamp:new Date().getTime(), custom:`${this.args.symbol}  ${currentPrice} ${this.condition} ${this.targetPrice}`}
                }
            }
                break;
        }
        return { state:this.states.STATE_PENDING, timestamp:new Date().getTime(), custom:`${this.args.symbol}  ${currentPrice} ${this.condition} ${this.targetPrice}`}
    }

    /**
     *
     * @param klineCandles {Array<number>} The Candles not used
     * @return {Promise<SimplePriceAlert>}
     */
    async setup(klineCandles)
    {
        this.kline = klineCandles;
        return this;
    }
}

module.exports = {SimplePriceAlert:SimplePriceAlert}
