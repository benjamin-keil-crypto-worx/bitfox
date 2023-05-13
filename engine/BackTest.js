const {State} = require("../lib/states/States");
const util = require("../lib/utility/util");
const {Log} = require("../lib/utility/Log");

const Mock = require("../service/MockService").Service;
const fs = require("fs");

/**
 * Class BackTest
 *
 * This class is used by the BitFoxEngine to run Backtest against a Strategy
 *
 */

/**
 * @typedef {Object} requiredCredentials The Required Credentials object for Exchanges
 * @property {String} apiKey The apiKey ,(Common auth method across exchanges)
 * @property {String} secret the secret key, (Common auth method across exchanges)
 * @property {any} uid Exchange dependent see ccxt documentation or consult with your target exchange
 * @property {any} login Exchange dependent see ccxt documentation or consult with your target exchange
 * @property {any} password Exchange dependent see ccxt documentation or consult with your target exchange
 * @property {any} twofa Exchange dependent see ccxt documentation or consult with your target exchange
 * @property {any} privateKey Exchange dependent see ccxt documentation or consult with your target exchange
 * @property {any} walletAddress Exchange dependent see ccxt documentation or consult with your target exchange
 * @property {any} token Exchange dependent see ccxt documentation or consult with your target exchange
 */

/**
 * @typedef {Object} options HTTP configuration for API calls only tinker with this if you now what you are doing
 * @property {String} defaultType The target for trading activities spot|futures|options|margin
 * @property {Boolean} adjustForTimeDifference Time difference adjustments
 * @property {Number} recvwindow the receive windows for responses!
 */
/**
 * @typedef {Object} backTestConfiguration Engine configuration options
 * @property {Number} amount Engine property, the base currency amount in this execution context
 * @property {Number} profitPct Engine property,the target % for profit taking in this execution context
 * @property {Number} stopLossPct Engine property,the stop loss target % in this execution context
 * @property {Number} fee  Engine property,the fee % an exchange charges for purchasing and selling assets this execution context (Not fully supported yet!!)
 * @property {Boolean} life Engine property,flag to determine if this execution context should make real trade orders
 * @property {Number} interval Engine property,the interval in seconds the engine is using to periodically fetch OHLCV Historical Data and run execution contexts (Strategies & Alerting)
 *
 * @property {Boolean} Public Exchange property, flag to make sure only public API calls are made and Private API calls are mocked
 * @property {String} exchangeName Exchange property, the name of the traget exchange to use
 * @property {String} symbol Exchange property, the name of your trading pair i.e. BTCUSDT ETHUSDT etc.
 * @property {String} timeframe Exchange property, the time frame to choose for Historical Data Fetching
 *                          (Exchange dependent and Exchange must support historical Data retrieval)
 * @property {requiredCredentials} requiredCredentials property, The Required credentials the Exchange is asking for. (Exchange dependent)
 * @property {options} options property, Http nd Exchange  configuration
 *
 * @property {Boolean} backTest Backtest property, flag to indicate if this execution context should run a backtest
 * @property {Number} requiredCandles Backtest property, the number of Historical Data Candles to fetch for each iteration
 * @property {Number} pollRate Backtest property, number of time to pull data from exchange
 *
 * @property {String} sidePreference Strategy property, the trading preference lon|short/biDirectional
 * @property {any} strategyExtras Strategy property, strategy specific arguments for custom implementations
 *
 *
 * @property {String} type Alert & Notification property, the alerting mechanism or type to use (Email|Slack|Telegram)
 * @property {String} notificationToken Alert & Notification property, the Authentication token for Notification support
 * @property {String} telegramChatId Alert & Notification property, (Telegram specific optional parameter to sync chatId at strat upi)
 * @property {String} emailFrom Alert & Notification property,(Email alert the email address the email is sent from)
 * @property {String} emailTo Alert & Notification property, (Email alert the email address the email is sent to)
 * @property {any} alertExtras Alert & Notification property, Alert specific arguments for custom implementations
 */
class BackTest {

    /**
     *
     * @param strategy {Strategy} The Target Strategy To Backtest
     * @param args {backTestConfiguration} options and/or parameters that where supplied to the BitFoxEngine during instantiation
     * @returns {BackTest} A instance of type Backtest
     */
    static getBackTester(strategy, args) {
        return new BackTest(strategy, args)
    }

    /**
     *
     * @param strategy {Strategy}
     * @param args  {backTestConfiguration} object with Backtest and specific Parameters usually supplied through BitFoxEngine at instantiation see BitFox Class for more
     */
    constructor(strategy, args) {

        this.strategy = strategy;
        this.args = args;
        this.mockService =Mock.getService(args)
        this.tradeHistory = [];
        this.tradeDirection = null;
        this.profitTarget = this.args.profitPct
        this.stopLossTarget = this.args.stopLossPct || 0;
        this.funds = null;
        this.barAvgCount = [];
        this.barCount = 0;
        this.maxBarCount = 0;
        this.minBarCount = 1000000;
        this.stopOrderCount = 0;
        this.tradeSuccessCount = 0;


        this.adjustForBalance = false;
        this.maxLongDrawDown = 0;
        this.maxShortDrawDown = 0;
    }

    /**
     *
     * @returns {boolean} Check to see if a Trade Template has an exitOrder
     */
    hasExitOrder(){ return this.tradeHistory.length>1 ||this.tradeHistory[this.tradeHistory.length-1].exitOrder != null;}

    /**
     *
     * @param candles {Array}  open, high, low, close and volume values
     * @returns {Promise<boolean>} method to start Back testing
     */
    async backTest(candles) {
        let me = this;
        let buff = await this.adjustForDelay(candles);
        let indexCount = 0;
        while (buff.length > 0) {
            let currentCandles = buff.splice(0, 1)
            let result = await this.strategy.run(indexCount, true);
            await this.processResult(result, indexCount, currentCandles[0]);
            indexCount++;
        }

        if(this.tradeHistory.length<=0){
            return false;
        }
        let copy = JSON.parse(JSON.stringify(this.tradeHistory));
        let avgBuff = [];
        let avgBuff2 = [];
        if (this.hasExitOrder()) {
            copy.forEach((trade) => {
                if (trade.exitTimeStamp != null) {
                    let approximatedQuoteProfit =  Math.abs((trade.exitOrder.amount * trade.exitOrder.price) -(trade.entryOrder.amount * trade.entryOrder.price) );
                    let approximatedBaseProfit  = Math.abs(trade.exitOrder.amount - trade.entryOrder.amount);
                    avgBuff.push(Math.abs(approximatedQuoteProfit));
                    avgBuff2.push(Math.abs(approximatedBaseProfit));
                    
                    Log.trade(`Entry Time: ${trade.entryTimestamp} Exit Time ${trade.exitTimeStamp}`);
                    Log.log(`Entry Order Price: ${trade.entryOrder.price} Exit Order price @ ${trade.exitOrder.price}`);
                    Log.log(`Trade Side: ${trade.entryOrder.side === 'sell' ? 'Short' : 'Long'} `);
                    if(trade.stopTriggered){
                        Log.short(`Stop Triggered`);
                        this.stopOrderCount = this.stopOrderCount+1;
                    }
                    else{
                        this.tradeSuccessCount = this.tradeSuccessCount+1;
                    }
                    Log.log(`Total Bar Count: ${trade.totalBars}`);
                    Log.log(`Approximated Quote Profit: ${approximatedQuoteProfit.toFixed(9)}`);
                    Log.log(`Approximated Base  Profit: ${approximatedBaseProfit.toFixed(9)}`);
                    Log.log(`Max Draw Down: ${trade.maxDrawDown}`);
                    let unrealizedQuoteLoss = Math.abs((trade.maxDrawDown*trade.amount)-trade.funds) 
                    let unrealizedBaseLoss =  unrealizedQuoteLoss / trade.maxDrawDown;
                    let adjustUnrealizedLoss = (trade.entryOrder.side === 'sell') ?  unrealizedBaseLoss : unrealizedQuoteLoss; 

                    Log.log(`Unrealized Losses Drawdown: ${adjustUnrealizedLoss.toFixed(9)}`);
                    Log.log(`Amount: ${trade.amount}`);
                    Log.log(`Funds: ${trade.funds}`);
                    console.log();
                }
            })

            Log.yellow(`Average Quote Profit: ${util.average(avgBuff)}`);
            Log.yellow(`Average Base Profit: ${util.average(avgBuff2)}`);

        }
        let funds = this.tradeHistory[this.tradeHistory.length-1].funds;
        Log.yellow(`Total Trades : ${this.tradeHistory.length}`);
        this.tradeHistory.length >= 2 ? Log.yellow(`Starting Funds: ${this.tradeHistory[0].funds} Current Funds ${funds}`) : null;
        this.tradeHistory.length >= 2 ? Log.yellow(`Starting Amount: ${this.tradeHistory[0].amount} Current Amount ${this.tradeHistory[this.tradeHistory.length - 1].amount}`) : null;
        Log.yellow(`Maximum Bars  Per Trade: ${this.maxBarCount}`);
        Log.yellow(`Minimum Bars Per Trade: ${this.minBarCount}`);
        let tradesLength = (this.tradeHistory[this.tradeHistory.length-1].exitOrder !== null) ? this.tradeHistory.length : this.tradeHistory.length-1;
        let successRate = (this.tradeSuccessCount / tradesLength) * 100;
        Log.yellow(`Number Stop Orders Triggered : ${this.stopOrderCount}`);
        Log.yellow(`Number of Successful Trades : ${this.tradeSuccessCount}`);
        Log.yellow(`Overall Success Rate : ${successRate} %`);
        this.tradeHistory[this.tradeHistory.length-1].exitOrder === null ? console.log("Ongoing Trade \n",JSON.stringify(this.tradeHistory[this.tradeHistory.length-1].entryOrder,null,2)) : null;
    }

    /**
     *
     * @param candles {Array}  open, high, low, close and volume values
     * @returns {Promise<any[]>} This method is responsible to adjust candle and indicator data to adjust for differences indicator data length,
     *                           and Candle Data lengths. Indicator Data with a long moving average period will usually have less Data than the original
     *                           Candle Data Array so we leverage this method to adjust the Array lengths
     */

    async adjustForDelay(candles) {
        let data = (await this.strategy.setup(candles)).getIndicator();
        // get the difference in length of both arrays
        let diff = Math.abs(candles.length - data.length);
        // prepare candle buffer i.e. drop difference in candles
        return candles.splice(diff, (candles.length - 1));
    }

    /**
     *
     * @param result {{state:any, timestamp:date, custom:any, context:String}} Result coming back from the Strategy
     * @param indexCount {Number} this is a count to keep track of Indicator and Candle Data indexes
     * @param currentCandles {Array}  open,high,low, close and volume values
     * @returns {Promise<void>} Processes the Strategy Response by evaluating the returned State of the Strategy
     */
    async processResult(result, indexCount, currentCandles) {

        switch (result.state) {
            case State.STATE_ENTER_LONG : {
                this.handleStateLong(currentCandles);
                if(!this.adjustForBalance) {this.adjustForBalance = false};

            }
                break;
            case State.STATE_ENTER_SHORT: {
                this.handleStateShort(currentCandles);
                if(!this.adjustForBalance) {this.adjustForBalance = false};
            }
                break;
            case State.STATE_TAKE_PROFIT: {
                this.strategy.setState(State.STATE_PENDING);
            }
                break;
            case State.STATE_STOP_LOSS_TRIGGERED: {
                this.strategy.setState(State.STATE_PENDING);
            }
                break;
            case State.STATE_AWAIT_TAKE_PROFIT: {
                
                this.barCount++;
                let currentOrder = this.tradeHistory[this.tradeHistory.length - 1].entryOrder;
                if (this.tradeDirection === 'long' ) {
                    this.calculateLongDrawDown(currentOrder, currentCandles);
                    this.handleStateAwaitLongResult(currentOrder, currentCandles);
                } else {
                    this.calculateShortDrawDown(currentOrder, currentCandles);
                    this.handleStateAwaitShortResult(currentOrder, currentCandles);
                }
            }
                break;
        }
    }

    /**
     *
     * @param currentOrder {any} see ccxt documentation for order structure
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void} Method to handle Await Short result meaning the Backtest engine has determined a Short
     *                 position is open, and it is now waiting to identify if the short is in profit or a stop order should be placed
     */
    handleStateAwaitShortResult(currentOrder, currentCandles) {
        let pT = this.strategy.calculateShortProfitTarget(currentOrder.price, this.profitTarget)
        let sT = (this.stopLossTarget>0) ? this.strategy.calculateShortStopTarget(currentOrder.price,this.stopLossTarget) : 0;
        let isinProfitRange = util.priceInShortProfitRange(currentCandles[3], pT)
        let isInStopLossRange = (sT > 0) ? util.priceInShortStopRange(currentCandles[2], sT) : false;
        if (isinProfitRange) {
            this.completeTrade(currentCandles);
        }if(isInStopLossRange){
            this.applyStopLoss(currentCandles)
        }
        this.strategy.setState((isinProfitRange) ? State.STATE_TAKE_PROFIT : (isInStopLossRange) ? State.STATE_STOP_LOSS_TRIGGERED : State.STATE_AWAIT_TAKE_PROFIT)
    }

    /**
     *
     * @param currentOrder {any} see ccxt documentation for order structure
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void} Method to assign max Draw Down price value it will be used in the final output 
     */
    calculateLongDrawDown(currentOrder, currentCandles) {
        if(currentOrder.price < currentCandles[4] && currentOrder.price > this.maxLongDrawDown){
            this.maxLongDrawDown =currentCandles[4];
        }
    }

    /**
     *
     * @param currentOrder {any} see ccxt documentation for order structure
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void} Method to assign max Draw Down price value it will be used in the final output 
     */
    calculateShortDrawDown(currentOrder, currentCandles) {
        if(currentOrder.price > currentCandles[4] && currentOrder.price > this.maxShortDrawDown){
            this.maxShortDrawDown = currentCandles[4];
        }
    }

    /**
     *
     * @param currentOrder {any} see ccxt documentation for order structure
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void} Method to handle Await Short result meaning the Backtest engine has determined a Long
     *                 position is open, and it is now waiting to identify if the long is in profit or a stop order should be placed
     */
    handleStateAwaitLongResult(currentOrder, currentCandles) {
        let pT = this.strategy.calculateLongProfitTarget(currentOrder.price, this.profitTarget)
        let sT = (this.stopLossTarget>0) ? this.strategy.calculateLongStopTarget(currentOrder.price,this.stopLossTarget) : 0;
        let isinProfitRange = util.priceInLongProfitRange(currentCandles[2], pT);
        let isInStopLossRange = (sT > 0) ? util.priceInLongStopRange(currentCandles[3], sT) : null;
        if (isinProfitRange) {
            this.completeTrade(currentCandles);
        }if(isInStopLossRange){
            this.applyStopLoss(currentCandles)
        }
        this.strategy.setState((isinProfitRange) ? State.STATE_TAKE_PROFIT : (isInStopLossRange) ? State.STATE_STOP_LOSS_TRIGGERED : State.STATE_AWAIT_TAKE_PROFIT)
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void} Method to handle state Short meaning the Backtest engine has determined a short
     *                 position can be entered
     */
    handleStateShort(currentCandles) {
        this.adjustEntryBalance(currentCandles);
        this.strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        let sO = this.mockService.limitSellOrder(this.args.symbol, this.args.amount,  currentCandles[4],);
        this.tradeHistory.push(
            this.mockService.getTradeTemplate(currentCandles, sO, this.profitTarget, this.funds, this.args.amount, 'short')
        )
        this.tradeDirection = 'short'
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void} Method to handle state Short meaning the Backtest engine has determined a long
     *                 position can be entered
     */
    handleStateLong(currentCandles) {
        this.adjustEntryBalance(currentCandles);
        this.strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        let bO = this.mockService.limitBuyOrder(this.args.symbol, this.args.amount, currentCandles[4])
        this.tradeHistory.push(
            this.mockService.getTradeTemplate(currentCandles, bO, this.profitTarget, this.funds, this.args.amount, 'long')
        )
        this.tradeDirection = 'long';
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void} Method adjust internal balance this is just to keep track of fictional funds and base amounts
     *                 the Backtest engine will use it later to output Trade and Funding Statistics
     */
    adjustUnrealizedBalance(currentCandles) {
        let trade = (this.tradeHistory.length > 0) ? this.tradeHistory[this.tradeHistory.length - 1] : null;
        let {funds, amount} = this.strategy.determineUnrealizedBalance(trade, currentCandles, this.args.amount);
        this.args.amount = amount;
        this.funds = funds;
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void}  this is a method to recalculate entry amounts after trades have been exited ,
     *                  the Backtest engine will use it later to output Trade and Funding Statistics
     */
    adjustEntryBalance(currentCandles) {
        if(this.adjustForBalance){
            this.args.amount =  (this.funds / currentCandles[4]);
        }
        let {funds, amount} = this.strategy.determineEntryBalance(currentCandles, this.args.amount);
        this.args.amount = amount;
        this.funds = funds;
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void}  this method is to apply a fictional stop loss order for backtesting statistics
     */
    applyStopLoss(currentCandles) {
        let currentTrade = this.tradeHistory[this.tradeHistory.length - 1];
        currentTrade.stopTriggered = true;
        this.completeTrade(currentCandles)
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void}  this method completes ongoing trades i.e. it creates a exit order. It places a sell order when the entry was a long trade
     *                  and buy order when the entry was a sell order
     */
    completeTrade(currentCandles) {
        let currentTrade = this.tradeHistory[this.tradeHistory.length - 1];
        currentTrade.totalBars = this.barCount;
        this.barAvgCount.push(this.barCount)
        if (this.tradeDirection === 'long') {
            currentTrade.maxDrawDown = this.maxLongDrawDown;
            this.maxLongDrawDown = 0;
            this.executeSellOrder(currentTrade, currentCandles);
        } else {
            currentTrade.maxDrawDown = this.maxShortDrawDown;
            this.maxShortDrawDown = 0;
            this.executeBuyOrder(currentCandles, currentTrade);
        }
        if(this.maxBarCount < this.barCount){ this.maxBarCount = this.barCount}
        if(this.minBarCount > this.barCount){ this.minBarCount = this.barCount}
        this.barCount = 0;
    }

    /**
     *
     * @param currentCandles  {Array}  open, high, low, close and volume values
     * @param currentTrade {any} A internal representation of an ongoing trade
     * @returns {void}  this method executes a fictional buy order
     */
    executeBuyOrder(currentCandles, currentTrade) {
        // add exit buy order
        let buyBackAmount = this.funds / currentCandles[3];
        currentTrade.exitOrder = this.mockService.marketBuyOrder(this.args.symbol,  buyBackAmount, currentCandles[3]);
        this.adjustUnrealizedBalance(currentCandles)
        currentTrade.funds = this.funds;
        currentTrade.amount = buyBackAmount;
        this.args.amount = buyBackAmount;
        currentTrade.exitTimeStamp = new Date(currentCandles[0]);
    }

    /**
     *
     * @param currentCandles  {Array}  open, high, low, close and volume values
     * @param currentTrade {any} A internal representation of an ongoing trade
     * @returns {void}  this method executes a fictional buy order
     */
    executeSellOrder(currentTrade, currentCandles) {
        // add exit sell order
        currentTrade.exitOrder = this.mockService.marketSellOrder(this.args.symbol,  this.args.amount, currentCandles[2],);
        this.adjustUnrealizedBalance(currentCandles)
        let newAmount = this.funds / currentCandles[2];
        currentTrade.funds = this.funds;
        currentTrade.amount = newAmount;
        this.args.amount = newAmount;
        currentTrade.exitTimeStamp = new Date(currentCandles[0]);
    }
}

/**
 *
 * @type {{BackTestEngine: BackTest}}
 */
module.exports = {BackTestEngine: BackTest}
