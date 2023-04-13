const {State} = require("../lib/states/States");
const util = require("../lib/utility/util");
const {Log} = require("../lib/utility/Log");

const Mock = require("../service/MockService").Service;
const fs = require("fs");

class BackTest {
    static getBackTester(strategy, args) {
        return new BackTest(strategy, args)
    }

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
        this.stopOrderCount = 0;
        this.tradeSuccessCount = 0;


        this.adjustForBalance = false;
    }

    hasExitOrder(){ return this.tradeHistory.length>1 ||this.tradeHistory[this.tradeHistory.length-1].exitOrder != null;}

    async backTest(candles) {
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
                    Log.warn(`Trade Side: ${trade.entryOrder.side === 'sell' ? 'Short' : 'Long'} `);
                    if(trade.stopTriggered){
                        Log.short(`Stop Triggered !!!`);
                        this.stopOrderCount = this.stopOrderCount+1;
                    }
                    else{
                        this.tradeSuccessCount = this.tradeSuccessCount+1;
                    }
                    Log.log(`Entry Time: ${trade.entryTimestamp} Exit Time ${trade.exitTimeStamp}`);
                    Log.log(`Entry Order Price: ${trade.entryOrder.price} Exit Order price @ ${trade.exitOrder.price}`);
                    Log.log(`Total Bar Count: ${trade.totalBars}`);
                    Log.long(`Approximated Quote Profit: ${approximatedQuoteProfit}`);
                    Log.short(`Approximated Base  Profit: ${approximatedBaseProfit}`);
                    Log.log(`Amount: ${trade.amount}`);
                    Log.log(`Funds: ${trade.funds}`);
                    console.log();
                }
            })

            Log.warn(`Average Quote Profit: ${util.average(avgBuff)}`);
            Log.warn(`Average Base Profit: ${util.average(avgBuff2)}`);

        }
        let funds = this.tradeHistory[this.tradeHistory.length-1].exitOrder ? this.tradeHistory[this.tradeHistory.length-1].funds : this.tradeHistory[this.tradeHistory.length-2].funds
        Log.warn(`Total Trades : ${this.tradeHistory.length}`);
        this.tradeHistory.length >= 2 ? Log.warn(`Starting Funds: ${this.tradeHistory[0].funds} Current Funds ${funds}`) : null;
        this.tradeHistory.length >= 2 ? Log.warn(`Starting Amount: ${this.tradeHistory[0].amount} Current Amount ${this.tradeHistory[this.tradeHistory.length - 1].amount}`) : null;
        Log.warn(`Average Bars Per Trade: ${(this.barAvgCount.length>0) ? util.average(this.barAvgCount) : 0}`);
        let tradesLength = (this.tradeHistory[this.tradeHistory.length-1].exitOrder !== null) ? this.tradeHistory.length : this.tradeHistory.length-1;
        let successRate = (this.tradeSuccessCount / tradesLength) * 100;
        Log.warn(`Number Stop Orders Triggered : ${this.stopOrderCount}`);
        Log.warn(`Number of Successful Trades : ${this.tradeSuccessCount}`);
        Log.warn(`Overall Success Rate : ${successRate} %`);
        this.tradeHistory[this.tradeHistory.length-1].exitOrder === null ? console.log("Ongoing Trade ",JSON.stringify(this.tradeHistory[this.tradeHistory.length-1].entryOrder,null,2)) : null;
    }


    async adjustForDelay(candles) {
        let data = (await this.strategy.setup(candles)).getIndicator();
        // get the difference in length of both arrays
        let diff = Math.abs(candles.length - data.length);
        // prepare candle buffer i.e. drop difference in candles
        return candles.splice(diff, (candles.length - 1));
    }

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
                    this.handleStateAwaitLongResult(currentOrder, currentCandles);
                } else {
                    this.handleStateAwaitShortResult(currentOrder, currentCandles);
                }
            }
                break;
        }
    }

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

    handleStateShort(currentCandles) {
        this.adjustEntryBalance(currentCandles);
        this.strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        let sO = this.mockService.limitSellOrder(this.args.symbol, this.args.amount,  currentCandles[4],);
        this.tradeHistory.push(
            this.mockService.getTradeTemplate(currentCandles, sO, this.profitTarget, this.funds, this.args.amount, 'short')
        )
        this.tradeDirection = 'short'
    }

    handleStateLong(currentCandles) {
        this.adjustEntryBalance(currentCandles);
        this.strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        let bO = this.mockService.limitBuyOrder(this.args.symbol, this.args.amount, currentCandles[4])
        this.tradeHistory.push(
            this.mockService.getTradeTemplate(currentCandles, bO, this.profitTarget, this.funds, this.args.amount, 'long')
        )
        this.tradeDirection = 'long';
    }

    adjustUnrealizedBalance(currentCandles) {
        let trade = (this.tradeHistory.length > 0) ? this.tradeHistory[this.tradeHistory.length - 1] : null;
        let {funds, amount} = this.strategy.determineUnrealizedBalance(trade, currentCandles, this.args.amount);
        this.args.amount = amount;
        this.funds = funds;
    }
    adjustEntryBalance(currentCandles) {
        if(this.adjustForBalance){
            this.args.amount =  (this.funds / currentCandles[4]);
        }
        let {funds, amount} = this.strategy.determineEntryBalance(currentCandles, this.args.amount);
        this.args.amount = amount;
        this.funds = funds;
    }

    applyStopLoss(currentCandles) {
        let currentTrade = this.tradeHistory[this.tradeHistory.length - 1];
        currentTrade.stopTriggered = true;
        this.completeTrade(currentCandles)
    }

    completeTrade(currentCandles) {
        let currentTrade = this.tradeHistory[this.tradeHistory.length - 1];
        currentTrade.totalBars = this.barCount;
        this.barAvgCount.push(this.barCount)
        if (this.tradeDirection === 'long') {
            this.executeSellOrder(currentTrade, currentCandles);
        } else {
            this.executeBuyOrder(currentCandles, currentTrade);
        }
        this.barCount = 0;
    }

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

module.exports = {BackTestEngine: BackTest}
