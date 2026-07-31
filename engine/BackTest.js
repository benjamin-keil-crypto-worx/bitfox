const {State} = require("../lib/states/States");
const util = require("../lib/utility/util");
const {Log} = require("../lib/utility/Log");

const Mock = require("../service/MockService").Service;
const fs = require("fs");
const os = require("os");
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
        this.tradeLossCount = 0;
        this.totalQuoteProfit = 0;
        this.totalQuoteLoss = 0;
        this.peakEquity = 0;
        this.maxDrawdownPct = 0;
        this.equityCurve = [];

        this.makerFee = args.makerFee ?? 0.001;
        this.takerFee = args.takerFee ?? 0.001;
        this.slippage = args.slippage ?? 0.0005;
        // risk-based sizing: only active when a strategy supplies a stopPrice on its entry
        // result (and a riskPct is available). Otherwise sizing stays fixed-notional as before.
        this.riskPct = args.riskPct ?? null;
        this.maxNotionalMult = args.maxNotionalMult ?? 1;
        this.sharpeRatio = 0;
        this.metrics = null;

        this.initialFunds = this.args.amount || 0;
        this.adjustForBalance = false;
        this.maxLongDrawDown = 0;
        this.maxShortDrawDown = 0;
        this.outDir = null;
        this.createOutputDirectory();
    }

    createOutputDirectory(){
        this.outDir= `${os.homedir()}/bitfox`;
        if (!fs.existsSync( this.outDir)){
            fs.mkdirSync( this.outDir);
        }
    }
    /**
     *
     * @returns {boolean} Check to see if a Trade Template has an exitOrder
     */
    hasExitOrder(){ return this.tradeHistory.length>1 ||this.tradeHistory[this.tradeHistory.length-1].exitOrder != null;}

    writeResultFile( data,context ){
        let date = new Date().toISOString().split("T")[0];
        let fileName = `${context}-${date}.json`
        try {
            fs.writeFileSync(`${this.outDir}/${fileName}`, data);
            // file written successfully
        } catch (err) {
            console.error(err);
        }
    }
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
            this.trackEquity(currentCandles[0]);
            indexCount++;
        }

        if(this.tradeHistory.length<=0){
            Log.yellow("No trades were executed during the backtest period.");
            return false;
        }
        let resultString = JSON.stringify(this.tradeHistory);
        this.writeResultFile(resultString, this.strategy.getContext().context );
        let copy = JSON.parse(resultString);

        let avgQuoteProfit = [];
        let avgBaseProfit = [];
        let returns = [];
        if (this.hasExitOrder()) {
            copy.forEach((trade) => {
                if (trade.exitTimeStamp != null) {
                    let entryValue = trade.entryOrder.amount * trade.entryOrder.price;
                    let exitValue = trade.exitOrder.amount * trade.exitOrder.price;
                    let isLong = trade.entryOrder.side === 'buy';
                    let rawPnl = isLong ? (exitValue - entryValue) : (entryValue - exitValue);
                    let pnlAfterFees = rawPnl - (entryValue * this.takerFee) - (exitValue * this.takerFee);
                    let tradeReturn = pnlAfterFees / entryValue;

                    returns.push(tradeReturn);
                    this.totalQuoteProfit += (pnlAfterFees > 0 ? pnlAfterFees : 0);
                    this.totalQuoteLoss += (pnlAfterFees < 0 ? Math.abs(pnlAfterFees) : 0);

                    let approximatedQuoteProfit = Math.abs(exitValue - entryValue);
                    let approximatedBaseProfit = Math.abs(trade.exitOrder.amount - trade.entryOrder.amount);
                    avgQuoteProfit.push(approximatedQuoteProfit);
                    avgBaseProfit.push(approximatedBaseProfit);

                    Log.trade(`Entry: ${trade.entryTimestamp} Exit: ${trade.exitTimeStamp}`);
                    Log.log(`Side: ${isLong ? 'Long' : 'Short'} Entry: ${trade.entryOrder.price} Exit: ${trade.exitOrder.price}`);
                    if(trade.stopTriggered){
                        Log.short(`Stop Triggered`);
                        this.stopOrderCount++;
                    }
                    // a win is net-positive PnL, independent of how the trade exited
                    if (pnlAfterFees > 0) {
                        this.tradeSuccessCount++;
                    } else {
                        this.tradeLossCount++;
                    }
                    Log.log(`Bars: ${trade.totalBars} PnL: ${pnlAfterFees.toFixed(8)} (${(tradeReturn*100).toFixed(2)}%)`);
                    Log.log(`Max DD: ${trade.maxDrawDown}`);
                    console.log();
                }
            })
        }

        this.calculatePerformanceMetrics(copy, returns, avgQuoteProfit, avgBaseProfit);
        return true;
    }

    trackEquity(currentCandle){
        if(!this.funds) return;
        this.equityCurve.push(this.funds);
        if(this.funds > this.peakEquity){
            this.peakEquity = this.funds;
        }
        if(this.peakEquity > 0){
            let dd = (this.peakEquity - this.funds) / this.peakEquity;
            if(dd > this.maxDrawdownPct){
                this.maxDrawdownPct = dd;
            }
        }
    }

    calculatePerformanceMetrics(trades, returns, avgQuoteProfit, avgBaseProfit){
        let totalTrades = trades.length;
        let completedTrades = trades.filter(t => t.exitTimeStamp != null).length;
        let wins = this.tradeSuccessCount;
        let losses = completedTrades - wins;
        let winRate = completedTrades > 0 ? (wins / completedTrades) * 100 : 0;
        let profitFactor = this.totalQuoteLoss > 0 ? this.totalQuoteProfit / this.totalQuoteLoss : (this.totalQuoteProfit > 0 ? Infinity : 0);
        let avgReturn = returns.length > 0 ? util.average(returns) : 0;

        // Sharpe: per-trade ratio annualized by the actual trade frequency (sqrt of trades per year),
        // derived from real trade timestamps — NOT sqrt(365), which assumes exactly one trade per day.
        let sharpePerTrade = 0;
        let sharpeRatio = 0;
        let tradesPerYear = 0;
        let completed = trades.filter(t => t.exitTimeStamp != null);
        if(returns.length > 1){
            let mean = util.average(returns);
            let variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
            let stdDev = Math.sqrt(variance);
            sharpePerTrade = stdDev > 0 ? mean / stdDev : 0;
            let firstEntry = new Date(completed[0].entryTimestamp).getTime();
            let lastExit = new Date(completed[completed.length - 1].exitTimeStamp).getTime();
            let spanDays = (lastExit - firstEntry) / 86400000;
            tradesPerYear = spanDays > 0 ? completed.length / (spanDays / 365) : 0;
            sharpeRatio = tradesPerYear > 0 ? sharpePerTrade * Math.sqrt(tradesPerYear) : sharpePerTrade;
        }
        this.sharpeRatio = sharpeRatio;

        let startingFunds = this.initialFunds;
        let endingFunds = trades.length > 0 ? trades[trades.length - 1].funds : 0;
        let totalReturnPct = startingFunds > 0 ? ((endingFunds - startingFunds) / startingFunds) * 100 : 0;
        let openTrades = totalTrades - completedTrades;

        this.metrics = {
            totalTrades, completedTrades, openTrades, wins, losses, winRate, profitFactor,
            avgReturn, sharpePerTrade, sharpeRatio, tradesPerYear,
            totalReturnPct, maxDrawdownPct: this.maxDrawdownPct, stopLossCount: this.stopOrderCount
        };

        let contextName = (this.strategy.getContext() && this.strategy.getContext().context) || 'STRATEGY';
        Log.yellow(`========== ${contextName.toUpperCase()} BACKTEST RESULTS ==========`);
        console.log();
        Log.yellow(`Total Trades: ${totalTrades}`);
        Log.yellow(`Completed Trades: ${completedTrades}${openTrades > 0 ? `  (Open/never exited: ${openTrades})` : ''}`);
        Log.yellow(`Wins: ${wins}  Losses: ${losses}`);
        Log.yellow(`Win Rate: ${winRate.toFixed(2)}%`);
        console.log();
        Log.yellow(`Starting Capital: ${startingFunds.toFixed(4)}`);
        Log.yellow(`Ending Capital: ${endingFunds.toFixed(4)}`);
        Log.yellow(`Total Return: ${totalReturnPct.toFixed(2)}%`);
        console.log();
        Log.yellow(`Avg Return Per Trade: ${(avgReturn * 100).toFixed(2)}%`);
        Log.yellow(`Profit Factor: ${profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}`);
        Log.yellow(`Sharpe Ratio (annualized, √trades/yr): ${sharpeRatio.toFixed(2)}  (per-trade: ${sharpePerTrade.toFixed(3)}, ~${tradesPerYear.toFixed(0)} trades/yr)`);
        Log.yellow(`Max Drawdown: ${(this.maxDrawdownPct * 100).toFixed(2)}%`);
        console.log();
        Log.yellow(`Stop Losses Triggered: ${this.stopOrderCount}`);
        Log.yellow(`Avg Quote Profit: ${avgQuoteProfit.length > 0 ? util.average(avgQuoteProfit).toFixed(8) : 'N/A'}`);
        Log.yellow(`Avg Bars Per Trade: ${util.average(this.barAvgCount).toFixed(1)}`);
        Log.yellow(`Max Bars: ${this.maxBarCount}  Min Bars: ${this.minBarCount}`);
        console.log();
        Log.yellow(`Fee Model: Maker ${(this.makerFee*100).toFixed(3)}% / Taker ${(this.takerFee*100).toFixed(3)}%`);
        Log.yellow(`Slippage (applied to entry and exit fills): ${(this.slippage*100).toFixed(3)}%`);
        Log.yellow(`Fill Model: TP at target, SL at stop (gaps fill at open), signal exits at close; same-bar TP+SL resolves as stop-loss`);
        console.log();
        Log.yellow(`================================================`);
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
                this.handleStateLong(currentCandles, result.custom);
                if(!this.adjustForBalance) {this.adjustForBalance = true};

            }
                break;
            case State.STATE_ENTER_SHORT: {
                this.handleStateShort(currentCandles, result.custom);
                if(!this.adjustForBalance) {this.adjustForBalance = true};
            }
                break;
            case State.STATE_TAKE_PROFIT: {
                this.completeOpenTrade(currentCandles, false);
                this.strategy.setState(State.STATE_PENDING);
            }
                break;
            case State.STATE_STOP_LOSS_TRIGGERED: {
                this.completeOpenTrade(currentCandles, true);
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
        // stop-loss first: a bar that touches both target and stop resolves as a loss
        if (isInStopLossRange) {
            this.applyStopLoss(currentCandles, Math.max(currentCandles[1], sT));
        } else if (isinProfitRange) {
            this.completeTrade(currentCandles, Math.min(currentCandles[1], pT));
        }
        this.strategy.setState((isInStopLossRange) ? State.STATE_STOP_LOSS_TRIGGERED : (isinProfitRange) ? State.STATE_TAKE_PROFIT : State.STATE_AWAIT_TAKE_PROFIT)
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
        let isInStopLossRange = (sT > 0) ? util.priceInLongStopRange(currentCandles[3], sT) : false;
        // stop-loss first: a bar that touches both target and stop resolves as a loss
        if (isInStopLossRange) {
            this.applyStopLoss(currentCandles, Math.min(currentCandles[1], sT));
        } else if (isinProfitRange) {
            this.completeTrade(currentCandles, Math.max(currentCandles[1], pT));
        }
        this.strategy.setState((isInStopLossRange) ? State.STATE_STOP_LOSS_TRIGGERED : (isinProfitRange) ? State.STATE_TAKE_PROFIT : State.STATE_AWAIT_TAKE_PROFIT)
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void} Method to handle state Short meaning the Backtest engine has determined a short
     *                 position can be entered
     */
    handleStateShort(currentCandles, custom = null) {
        this.adjustEntryBalance(currentCandles);
        this.applyRiskSizing(currentCandles, custom, 'short');
        this.strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        let sO = this.mockService.limitSellOrder(this.args.symbol, this.args.amount,  currentCandles[4] * (1 - this.slippage),);
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
    handleStateLong(currentCandles, custom = null) {
        this.adjustEntryBalance(currentCandles);
        this.applyRiskSizing(currentCandles, custom, 'long');
        this.strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        let bO = this.mockService.limitBuyOrder(this.args.symbol, this.args.amount, currentCandles[4] * (1 + this.slippage))
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
        let trade = this.tradeHistory[this.tradeHistory.length - 1];
        if(!trade || !trade.entryOrder || !trade.exitOrder) return;
        let entryValue = trade.entryOrder.amount * trade.entryOrder.price;
        let exitValue = trade.exitOrder.amount * trade.exitOrder.price;
        let isLong = trade.entryOrder.side === 'buy';
        let rawPnl = isLong ? (exitValue - entryValue) : (entryValue - exitValue);
        let pnlAfterFees = rawPnl - (entryValue * this.takerFee) - (exitValue * this.takerFee);
        this.funds += pnlAfterFees;
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void}  this is a method to recalculate entry amounts after trades have been exited ,
     *                  the Backtest engine will use it later to output Trade and Funding Statistics
     */
    adjustEntryBalance(currentCandles) {
        if(this.funds === null){
            this.funds = this.initialFunds;
            this.args.amount = this.initialFunds / currentCandles[4];
        }
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @param custom {any} the custom payload from the strategy's entry result; risk sizing engages
     *                     only when it carries a `stopPrice` (and `riskPct`, here or on the engine)
     * @param side {String} 'long' or 'short'
     * @returns {void} Sizes the entry so that price travelling from the fill to the strategy's stop
     *                 costs exactly riskPct of current equity. Deliberately a no-op when the strategy
     *                 supplies no stop, which leaves the pre-existing fixed-notional behaviour intact
     *                 for every strategy that predates this.
     *
     *                 Runs AFTER adjustEntryBalance so it overrides, rather than is overridden by,
     *                 the initial `initialFunds / price` seeding.
     */
    applyRiskSizing(currentCandles, custom, side) {
        if(!custom) return;
        let riskPct = custom.riskPct ?? this.riskPct;
        let stopPrice = custom.stopPrice;
        if(riskPct == null || stopPrice == null) return;
        let entryPrice = currentCandles[4] * (side === 'long' ? (1 + this.slippage) : (1 - this.slippage));
        let equity = (this.funds != null && this.funds > 0) ? this.funds : this.initialFunds;
        let size = util.riskPositionSize(equity, entryPrice, stopPrice, riskPct, this.maxNotionalMult);
        if(size != null && size > 0){ this.args.amount = size; }
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void}  this method is to apply a fictional stop loss order for backtesting statistics
     */
    applyStopLoss(currentCandles, fillPrice) {
        let currentTrade = this.tradeHistory[this.tradeHistory.length - 1];
        currentTrade.stopTriggered = true;
        this.completeTrade(currentCandles, fillPrice)
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @param isStop {Boolean} whether the strategy signalled a stop-loss exit
     * @returns {void} Completes a strategy-managed exit (STATE_TAKE_PROFIT / STATE_STOP_LOSS_TRIGGERED emitted
     *                 directly by a strategy) at the bar close, so the trade is not left open and dropped from metrics.
     */
    completeOpenTrade(currentCandles, isStop) {
        let currentTrade = this.tradeHistory[this.tradeHistory.length - 1];
        if (!currentTrade || currentTrade.exitOrder != null) return;
        if (isStop) { currentTrade.stopTriggered = true; }
        this.completeTrade(currentCandles, currentCandles[4]);
    }

    /**
     *
     * @param currentCandles {Array}  open, high, low, close and volume values
     * @returns {void}  this method completes ongoing trades i.e. it creates a exit order. It places a sell order when the entry was a long trade
     *                  and buy order when the entry was a sell order
     */
    completeTrade(currentCandles, fillPrice) {
        let currentTrade = this.tradeHistory[this.tradeHistory.length - 1];
        currentTrade.totalBars = this.barCount;
        this.barAvgCount.push(this.barCount)
        if (this.tradeDirection === 'long') {
            currentTrade.maxDrawDown = this.maxLongDrawDown;
            this.maxLongDrawDown = 0;
            this.executeSellOrder(currentTrade, currentCandles, fillPrice);
        } else {
            currentTrade.maxDrawDown = this.maxShortDrawDown;
            this.maxShortDrawDown = 0;
            this.executeBuyOrder(currentCandles, currentTrade, fillPrice);
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
    executeBuyOrder(currentCandles, currentTrade, fillPrice) {
        // buy-to-cover pays slippage on top of the fill; default fill is the bar close (signal exits)
        let exitPrice = (fillPrice ?? currentCandles[4]) * (1 + this.slippage);
        let exitAmount = this.args.amount;
        currentTrade.exitOrder = this.mockService.marketBuyOrder(this.args.symbol, exitAmount, exitPrice);
        this.adjustUnrealizedBalance(currentCandles);
        currentTrade.funds = this.funds;
        currentTrade.amount = exitAmount;
        currentTrade.exitTimeStamp = new Date(currentCandles[0]);
    }

    executeSellOrder(currentTrade, currentCandles, fillPrice) {
        // sell fills lose slippage; default fill is the bar close (signal exits)
        let exitPrice = (fillPrice ?? currentCandles[4]) * (1 - this.slippage);
        let exitAmount = this.args.amount;
        currentTrade.exitOrder = this.mockService.marketSellOrder(this.args.symbol, exitAmount, exitPrice);
        this.adjustUnrealizedBalance(currentCandles);
        currentTrade.funds = this.funds;
        currentTrade.amount = exitAmount;
        currentTrade.exitTimeStamp = new Date(currentCandles[0]);
    }
}

/**
 *
 * @type {{BackTestEngine: BackTest}}
 */
module.exports = {BackTestEngine: BackTest}
