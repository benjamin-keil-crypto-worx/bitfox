const {Alert} = require("./Alert")
class SimplePriceAlert extends Alert{
    static init(args) {
        return new SimplePriceAlert(args);
    }

    constructor(args) {
        super(args);
        let cond = (args.extras && args.extras.condition) ? args.extras.condition : "eq"
        this.condition = ["gt", "lt", "eq"].includes(cond) ? cond : "eq";
        this.targetPrice = args.extras.targetPrice;
    }

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

    async setup(klineCandles)
    {
        this.kline = klineCandles;
        return this;
    }
}

module.exports = {SimplePriceAlert:SimplePriceAlert}
