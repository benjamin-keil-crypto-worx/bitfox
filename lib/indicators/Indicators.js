const technicalIndicators = require('technicalindicators');
technicalIndicators.setConfig('precision', 10);

let utils = require("../utility/util");

let MACD =  technicalIndicators.MACD;
let RSI =  technicalIndicators.RSI;
let ATR =  technicalIndicators.ATR;
let BB =  technicalIndicators.BollingerBands;
let EMA =  technicalIndicators.EMA;
let SMA = technicalIndicators.SMA;
let OBV =  technicalIndicators.OBV;
let MFI =  technicalIndicators.MFI;
let KST     =  technicalIndicators.KST;
let Bullish =  technicalIndicators.bullish;
let WilliamsR = technicalIndicators.WilliamsR;
let ADL = technicalIndicators.ADL;
let ADX = technicalIndicators.ADX;
let AwesomeOscillator = technicalIndicators.AwesomeOscillator;
let CCI = technicalIndicators.CCI;
let ForceIndex = technicalIndicators.ForceIndex;
let PSAR = technicalIndicators.PSAR;
let ROC = technicalIndicators.ROC;
let Stochastic = technicalIndicators.Stochastic;
let TRIX = technicalIndicators.TRIX;
let VWAP = technicalIndicators.VWAP;
let VP = technicalIndicators.VolumeProfile;
let WP = technicalIndicators.WMA;
let WEMA = technicalIndicators.WEMA;
let IchimokuCloud  = technicalIndicators.IchimokuCloud;
const SuperTrend = require('node-super-trend');



class CustomIndicator {
    constructor(o,h,l,c,v, args, candles){
        this.o = o;
        this.h = h;
        this.l = l;
        this.c = c,
        this.v = v,
        this.args = args,
        this.candles=  candles;
    }
}
/**
 * Class DynamicGridSignals
 * @type Indicator
 * */
class DynamicGridSignals extends CustomIndicator {
    className = 'DynamicGridSignals';

    static getData(o,h,l,c,v, args, candles){
        const st = new DynamicGridSignals(o,h,l,c,v, args, candles);
        return st.calculate();
    }
    constructor(o,h,l,c,v, args, candles){
        super(o,h,l,c,v, args, candles);
        let cloneHigs = [...this.h];
        let cloneLows = [...this.l];
        this.upperBound =  Math.max(...cloneHigs.reverse().slice(0, args.period || 200));
        this.lowerBound =  Math.min(...cloneLows.reverse().slice(0,args.period || 200));
        this.grids = args.grid || 5;
    }

    calculateGridDistribution() {
        const gridDistribution = [];
        const range = this.upperBound - this.lowerBound;
        const interval = range / this.grids;
      
        for (let i = 0; i <= this.grids; i++) {
          const gridValue = this.lowerBound + i * interval;
          gridDistribution.push(gridValue);
        }
      
        return gridDistribution.sort((a, b) => a - b);
      }
      
    calculate(){
        let grid = this.calculateGridDistribution();
        let result = [];
        this.o.forEach((element,index) => {
            result.push({o:this.o[index], l:this.l[index], h:this.h[index], c:this.c[index],v:this.v[index], grid:grid});
        });
        return result;
    }
}

/**
 * Class MultiDivergenceDetector
 * @type Indicator
 * */
class MultiDivergenceDetector extends CustomIndicator {

    

    className = 'MultiDivergenceDetector';

    static getData(o,h,l,c,v, args, candles){
        const st = new MultiDivergenceDetector(o,h,l,c,v, args, candles);
        return st.calculate();
    }

    calculateLengthDiff(){
        //check which of the following arrays have the smallest length this.rsi, this.macd, this.obv, this.stoch and this.Williams	
        let minLength = Math.min(this.rsi.length, this.macd.length, this.stoch.length, this.williamsRIndicator.length);
        return this.c.length - minLength;
    }
    
    constructor(o,h,l,c,v, args, candles){
        super(o,h,l,c,v, args, candles);
        this.lookback = args.lookback || 15;
        this.rsi = RsiIndicator.getData(o,h,l,c,v, {}, candles);
        this.macd = MacdIndicator.getData(o,h,l,c,v, {}, candles); // MACD+signal
        this.stoch = StochasticIndicator.getData(o,h,l,c,v, {}, candles); //k+d
        this.williamsRIndicator = WilliamsRIndicator.getData(o,h,l,c,v, {}, candles);
        this.divergenceSignals =[];

        let diff = this.calculateLengthDiff();
        // when diff is greater than 0 we want to drop the first diff indexes of this.o
        if( diff > 0 ){
            this.o = this.o.slice(diff);
            this.h = this.h.slice(diff);
            this.l = this.l.slice(diff);
            this.c = this.c.slice(diff);
            this.v = this.v.slice(diff);
        }
    }

    detectMacdDivergence(highBuffer, lowBuffer){
        const length = this.c.length;
        let highBufferStartIndex = 0;
        let lowBufferStartIndex = 0;

        for (let i = 0; i < length; i++) {

          const currentOpen = this.o[i];
          const currentClose = this.c[i];
          const previousHigh = highBuffer[highBufferStartIndex].value;
          const previousLow = lowBuffer[lowBufferStartIndex].value;
          
          const currentMacdLine = this.macd[i].MACD + this.macd[i].signal;
          const previousMacdOnHigh = this.macd[highBuffer[highBufferStartIndex].index].MACD + this.macd[highBuffer[highBufferStartIndex].index].signal;
          const previousMacdOnLow =  this.macd[lowBuffer[lowBufferStartIndex].index].MACD +   this.macd[lowBuffer[lowBufferStartIndex].index].signal;

          if (currentClose > previousHigh && currentMacdLine < previousMacdOnHigh) {
            highBufferStartIndex++;
            lowBufferStartIndex++
            this.divergenceSignals.push({
              type: 'MACD Bearish Divergence',
              index: i,
              open: currentOpen,
              close: currentClose,
              macd: this.macd[i].MACD,
              signal: this.macd[i].signal,
            });
          }
      
          // Bearish Divergence: Lower close, Higher RSI
          else if (currentClose < previousLow && currentMacdLine > previousMacdOnLow) {
            lowBufferStartIndex++;
            highBufferStartIndex++;
            this.divergenceSignals.push({
              type: 'MACD Bullish Divergence',
              index: i,
              open: currentOpen,
              close: currentClose,
              macd: this.macd[i].MACD,
              signal: this.macd[i].signal,
            });
          } else{
            this.divergenceSignals.push({
                type: 'Pending Divergence',
                index: i,
                open: currentOpen,
                close: currentClose,
              });
          }
        }
    }

    detectStochDivergence(highBuffer, lowBuffer){
        const length = this.c.length;
        let highBufferStartIndex = 0;
        let lowBufferStartIndex = 0;

        for (let i = 0; i < length; i++) {

          const currentOpen = this.o[i];
          const currentClose = this.c[i];
          const previousHigh = highBuffer[highBufferStartIndex].value;
          const previousLow = lowBuffer[lowBufferStartIndex].value;
          
          const currentStochLine = this.stoch[i].k + this.stoch[i].d;
          const previousStochOnHigh = this.stoch[highBuffer[highBufferStartIndex].index].k + this.stoch[highBuffer[highBufferStartIndex].index].d;
          const previousStochOnLow =  this.stoch[lowBuffer[lowBufferStartIndex].index].k +   this.stoch[lowBuffer[lowBufferStartIndex].index].d;

          if (currentClose > previousHigh && currentStochLine < previousStochOnHigh) {
            highBufferStartIndex++;
            lowBufferStartIndex++
            this.divergenceSignals.push({
              type: 'Stochastic Bearish Divergence',
              index: i,
              open: currentOpen,
              close: currentClose,
              k: this.stoch[i].k,
              d: this.stoch[i].d,
            });
          }
      
          // Bearish Divergence: Lower close, Higher RSI
          else if (currentClose < previousLow && currentStochLine > previousStochOnLow) {
            lowBufferStartIndex++;
            highBufferStartIndex++;
            this.divergenceSignals.push({
              type: 'MACD Bullish Divergence',
              index: i,
              open: currentOpen,
              close: currentClose,
              k: this.stoch[i].k,
              d: this.stoch[i].d,
            });
          } else {
            this.divergenceSignals.push({
                type: 'Pending Divergence',
                index: i,
                open: currentOpen,
                close: currentClose,
              });
          }
        }
    }
    detectWilliamsRDivergence(highBuffer, lowBuffer){
        const length = this.c.length;
        let highBufferStartIndex = 0;
        let lowBufferStartIndex = 0;

        for (let i = 0; i < length; i++) {

          const currentOpen = this.o[i];
          const currentClose = this.c[i];
          const previousHigh = highBuffer[highBufferStartIndex].value;
          const previousLow = lowBuffer[lowBufferStartIndex].value;

          const currentWR = this.williamsRIndicator[i];
          const previousWROnHigh = this.williamsRIndicator[highBuffer[highBufferStartIndex].index];
          const previousWRIOnLow = this.williamsRIndicator[lowBuffer[lowBufferStartIndex].index];

          // Bullish Divergence: Higher close, Lower RSI
          if (currentClose > previousHigh && currentWR < previousWROnHigh) {
            highBufferStartIndex++;
            lowBufferStartIndex++
            this.divergenceSignals.push({
              type: 'Williams R Bearish Divergence',
              index: i,
              open: currentOpen,
              close: currentClose,
              wr: currentWR,
            });
          }
      
          // Bearish Divergence: Lower close, Higher RSI
          else if (currentClose < previousLow && currentWR > previousWRIOnLow) {
            lowBufferStartIndex++;
            highBufferStartIndex++;
            this.divergenceSignals.push({
              type: 'Williams R Bullish Divergence',
              index: i,
              open: currentOpen,
              close: currentClose,
              wr: currentWR,
            });
          } else{
            this.divergenceSignals.push({
                type: 'Pending Divergence',
                index: i,
                open: currentOpen,
                close: currentClose,
              });
          }
        }
    }

    detectRSIDivergence(highBuffer, lowBuffer) {
        const length = this.c.length;
        let highBufferStartIndex = 0;
        let lowBufferStartIndex = 0;

        for (let i = 0; i < length; i++) {

          const currentOpen = this.o[i];
          const currentClose = this.c[i];
          const previousHigh = highBuffer[highBufferStartIndex].value;
          const previousLow = lowBuffer[lowBufferStartIndex].value;

          const currentRSI = this.rsi[i];
          const previousRSIOnHigh = this.rsi[highBuffer[highBufferStartIndex].index];
          const previousRSIOnLow = this.rsi[lowBuffer[lowBufferStartIndex].index];

          // Bullish Divergence: Higher close, Lower RSI
          if (currentClose > previousHigh && currentRSI < previousRSIOnHigh) {
            highBufferStartIndex++;
            lowBufferStartIndex++
            this.divergenceSignals.push({
              type: 'RSI Bearish Divergence',
              index: i,
              open: currentOpen,
              close: currentClose,
              rsi: currentRSI,
            });
          }
      
          // Bearish Divergence: Lower close, Higher RSI
          else if (currentClose < previousLow && currentRSI > previousRSIOnLow) {
            lowBufferStartIndex++;
            highBufferStartIndex++;
            this.divergenceSignals.push({
              type: 'RSI Bullish Divergence',
              index: i,
              open: currentOpen,
              close: currentClose,
              rsi: currentRSI,
            });
          } else {
            this.divergenceSignals.push({
                type: 'Pending Divergence',
                index: i,
                open: currentOpen,
                close: currentClose,
              });
          }
        }
      
      }
      
      
      calculate(){
        // Example usage:
        let highs = [...this.h]
        let lows = [...this.l];
        let highBuffer = []
        let lowBuffer = []
        let buffer = [];
        highBuffer = utils.getLastLookbackHigh(highs,this.lookback) ;
        lowBuffer =utils.getLastLookbackLow(lows,this.lookback); 
        this.detectRSIDivergence(highBuffer, lowBuffer)
        this.detectMacdDivergence(highBuffer, lowBuffer)
        this.detectStochDivergence(highBuffer, lowBuffer)
        this.detectWilliamsRDivergence(highBuffer, lowBuffer)
        this.c.forEach((close,index) =>{
            let divergenceInst = this.divergenceSignals.filter((divergence)=>{ return divergence.index === index})
            let hasDivergence = divergenceInst.filter((divergence)=>{ return divergence.type !== 'Pending Divergence'   }).length > 0;
            buffer.push({c:close, hasDivergence:hasDivergence, divergence:divergenceInst})
        })
        return buffer;      
    }

}


/**
 * Class ZScore
 * @type Indicator
 * */
class ZScore extends CustomIndicator {
    className = 'ZScore'

    static getData(o,h,l,c,v, args, candles){
        const st = new ZScore(o,h,l,c,v, args, candles);
        return st.calculate();
    }
    constructor(o,h,l,c,v, args, candles){
        super(o,h,l,c,v, args, candles);
        this.period = args.period || 55;
    }

    calculateMovingAverage(values, period) {
        const movingAverages = [];
      
        for (let i = period - 1; i < values.length; i++) {
          const sum = values.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
          const average = sum / period;
          movingAverages.push(average);
        }
      
        return movingAverages;
      }
      
      calculateStandardDeviation(values, period) {
        const standardDeviations = [];
      
        for (let i = period - 1; i < values.length; i++) {
          const subset = values.slice(i - period + 1, i + 1);
          const average = subset.reduce((acc, val) => acc + val, 0) / period;
          const squaredDifferences = subset.map((val) => Math.pow(val - average, 2));
          const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / period;
          const standardDeviation = Math.sqrt(variance);
          standardDeviations.push(standardDeviation);
        }
      
        return standardDeviations;
      }
      
      calculateZScore(values, period) {
        const movingAverages = this.calculateMovingAverage(values, period);
        const standardDeviations = this.calculateStandardDeviation(values, period);
      
        const zScores = [];
      
        for (let i = period - 1; i < values.length; i++) {
          const zScore = (values[i] - movingAverages[i - period + 1]) / standardDeviations[i - period + 1];
          zScores.push(zScore);
        }
      
        return zScores;
      }
      
      
      calculate(){
          // Example usage:
        const zScores = {
            o:this.calculateZScore(this.o, this.period),
            h:this.calculateZScore(this.h, this.period),
            l:this.calculateZScore(this.l, this.period),
            c:this.calculateZScore(this.c, this.period),
            v:this.calculateZScore(this.v, this.period),
        }
        return zScores;
      }

}

/**
 * Class SupportAndResistance
 * @type Indicator
 * */

class SupportAndResistance extends CustomIndicator {
    className = 'SupportAndResistance';
    static getData(o,h,l,c,v, args, candles){
        const st = new SupportAndResistance(o,h,l,c,v, args, candles);
        return st.calculate();
    }

    constructor(o,h,l,c,v, args, candles){
        super(o,h,l,c,v, args, candles);
        this.period = args.period || 25;
    }

     calculateMovingAverage(data, period) {
        const movingAverages = [];
      
        for (let i = period - 1; i < data.length; i++) {
          const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
          const average = sum / period;
          movingAverages.push(average);
        }
        
        return movingAverages;
      }
      
    findSupportResistanceZones(closingPrices, threshold = 0.1, lookbackPeriod = 20, maPeriod = 50) {
        const zones = [];

        const movingAverages = this.calculateMovingAverage(closingPrices, maPeriod);

        for (let i = lookbackPeriod; i < closingPrices.length; i++) {
            const currentPrice = closingPrices[i];
            const mean = movingAverages[i - lookbackPeriod];
            const stdDev = Math.sqrt(closingPrices.slice(i - lookbackPeriod, i).reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / lookbackPeriod);

            let zoneType = null;

            // Check if the current price is close to the mean within the specified threshold
            if (Math.abs(currentPrice - mean) < threshold * stdDev) {
                // Determine if it's support or resistance based on the position relative to the mean
                zoneType = currentPrice < mean ? 'Support' : 'Resistance';

                zones.push({ level: currentPrice, type: zoneType });
            }else{
                zones.push({ level: currentPrice, type: "discovery" });
            }
        }

    return zones;
      }
      
      // Example usage:
      
    calculate(){
      const supportResistanceZones = this.findSupportResistanceZones(this.c);
      return supportResistanceZones;    
    }
}
/**
 *  Class SuperTrend
 *  @type Indicator
 * */
class SuperTrendIndicator {
    static className = 'SuperTrendIndicator';

    /**
     * @typedef {Object} superTrend
     * @property {number} value - The Value of the current moving average
     * @property {string} trend - The current Trend
     */

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volume Data
     * @param args.period {number} the moving average period (default 10)
     * @param args.multiplier {number} the atr multiplier (default 3)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer 
     * @returns {Array<superTrend>}
     */
    static getData(o,h,l,c,v, args, candles){
        const st = new SuperTrend(candles,args.period || 10,args.multiplier ||  3);
        return st.calculate();
    }
}
/**
 *  Class Woodies
 *  @type Indicator
 * */
class Woodies {
    static className = "Woodies"

    /**
     * @typedef {Object} woodies
     * @property {number} pivot - The Pivot Point
     * @property {number} r1 - The first resistance
     * @property {number} r2 - The second resistance
     * @property {number} s1 - The first support
     * @property {number} s2 - The second Support
     */

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volume Data
     * @param args null
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<woodies>}
     *
     */
    static getData(o,h,l,c,v, args, candles){
      return utils.woodies(o,h,l,c,v, args, candles)
    }
}
/**
 *  Class FloorPivots
 *  @type Indicator
 * */
class FloorPivots {
    static className = "FloorPivots"


    /**
     * @typedef {Object} floorPivot
     * @property {number} pivot - The Pivot Point
     * @property {number} r1 - The first resistance
     * @property {number} r2 - The second resistance
     * @property {number} r3 - The third resistance
     * @property {number} s1 - The first support
     * @property {number} s2 - The second Support
     * @property {number} s2 - The third Support
     */

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volume Data
     * @param args null
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<floorPivot>}
     *
     */
    static getData(o,h,l,c,v, args, candles){
        return utils.floorPivots(o,h,l,c,v, args, candles)
    }
}

/**
 *  Class RsiIndicator
 *  @type Indicator
 * */
class RsiIndicator {
    static className = "RsiIndicator"

/**
 * @param o {Array<number>}  The Opening Candles
 * @param h {Array<number>}  The Higher High Candles
 * @param l {Array<number>}  The Lower Low Candles
 * @param c {Array<number>}  The Closing Candles
 * @param v {Array<number>}  The Volume Data
 * @param args.period {number}(the rsi period default 14)
 * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
 * @returns [Number]
 * */
    static getData(o,h,l,c,v, args, candles){
        let inputRSI = {
            values: c,
            period: args.period || 14
        };
        let rsi = new RSI(inputRSI);
        return rsi.getResult();
    }
}

/**
 *  Class RsiIndicator
 *  @type Indicator
 * */
class AtrIndicator {
    static className = "AtrIndicator"
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volume Data
     * @param args.period {number} (the atr period default 12)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let inputATR = {
            high : h,
            low  : l,
            close: c,
            period : args.period || 21
        };
        let atr = new ATR(inputATR);
        return atr.getResult();
    }
}

/**
 *  Class BollingerIndicator
 *  @type Indicator
 * */
class BollingerIndicator{

    static className = "BollingerIndicator"
    /**
     * @typedef {Object} bollinger
     * @property {number} middle - the center bands
     * @property {string} upper - The upper bands
     * @property {string} lower - The lower bands
     */

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volume Data
     * @param args.period {number} the moving average period
     * @param args.stdDev {number} the standard deviation of bands
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<bollinger>}
     *
     */
    static getData(o,h,l,c,v, args, candles){
        let input = {
            period : args.period || 20,
            values : c,
            stdDev : args.stdDev || 2

        };
        let bb = new BB(input);
        return bb.getResult();
    }
}

/**
 *  Class MacdIndicator
 *  @type Indicator
 * */
class MacdIndicator{

    static className = "MacdIndicator"

    /**
     * @typedef {Object} macd
     * @property {number} MACD - the macd
     * @property {string} signal - The signal line
     * @property {string} histogram - The histogram
     */

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volume Data
     * @param args.fastPeriod {number} the fast moving average period
     * @param args.slowPeriod {number} the slow moving average period
     * @param args.signalPeriod {number} the macd signal period
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<macd>}
     *
     */
    static getData(o,h,l,c,v, args, candles){
        //fastPeriod=12,slowPeriod=26,signalPeriod=9
        let macdInput = {
            values            : c,
            fastPeriod        : args.fastPeriod || 12,
            slowPeriod        : args.slowPeriod || 26,
            signalPeriod      : args.signalPeriod || 9,
            SimpleMAOscillator: true,
            SimpleMASignal    : true
        };
        let macd= new MACD(macdInput);
        return macd.getResult();
    }
}

/**
 *  Class WilliamsRIndicator
 *  @type Indicator
 * */
class WilliamsRIndicator{

    static className = "WilliamsRIndicator";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 14)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let input = {
            high  : h ,
            low   : l ,
            period : args.period || 14,
            close : c,
        };

        let WWR = new WilliamsR(input);
        return WWR.getResult();
    }
}

/**
 *  Class KsiIndicator
 *  @type Indicator
 * */
class KsiIndicator{

    static className = "KsiIndicator"

    /**
     * @typedef {Object} ksi
     * @property {number} kst - The Kst Line
     * @property {number} signal - The signal line
     */

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args null
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<ksi>}
     * */
    static getData(o,h,l,c,v, args, candles){
        let input = {
            values      : c,
            ROCPer1     : 10,
            ROCPer2     : 15,
            ROCPer3     : 20,
            ROCPer4     : 30,
            SMAROCPer1  : 10,
            SMAROCPer2  : 10,
            SMAROCPer3  : 10,
            SMAROCPer4  : 15,
            signalPeriod: 9
        };
        KST = new KST(input);
        return KST.getResult();
    }
}

/**
 *  Class MfiIndicator
 *  @type Indicator
 * */
class MfiIndicator{


    static className = "MfiIndicator"

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 14)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let input = {
            high  : h ,
            low   : l ,
            period : 14,
            close : c,
            volume : v
        };

        let mfi = new MFI(input);
        return mfi.getResult();
    }
}
/**
 *  Class ObvIndicator
 *  @type Indicator
 * */
class ObvIndicator{

    static className = "ObvIndicator";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 14)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){

        let input = {
            high  : h ,
            low   : l ,
            period : args.period || 14,
            close : c,
            volume : v
        };

        let obv = new OBV(input);
        return obv.getResult();
    }
}

/**
 *  Class Ema4Indicator
 *  @type Indicator
 * */
class Ema4Indicator{
    static className ="Ema4Indicator";
    /**
     * @typedef {Object} ema4
     * @property {Array<number>} ema8 - The ema8 values
     * @property {Array<number>} ema13 - The ema13 values
     * @property {Array<number>} ema21 - The ema21 values
     * @property {Array<number>} ema55 - The ema55 values
     * @property {Array<number>} ema100 - The ema100 values
     * @property {Array<number>} ema200 - The ema200 values
     */

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args null
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<ema4>}
     * */
    static getData(o,h,l,c,v, args, candles){
        let EMA1 = new  EMA({period : 8, values  : c});
        let EMA2 = new  EMA({period : 13, values : c});
        let EMA3 = new  EMA({period : 21, values : c});
        let EMA4 = new  EMA({period : 55, values : c});
        let EMA5 = new  EMA({period : 100, values :c});
        let EMA6 = new  EMA({period : 200, values :c});
        let object = {};
        let tmpBuffer = EMA1.getResult();

        object.ema8 = tmpBuffer;
        tmpBuffer = EMA2.getResult();
        object.ema13 = tmpBuffer;
        tmpBuffer = EMA3.getResult();
        object.ema21 = tmpBuffer;
        tmpBuffer = EMA4.getResult();
        object.ema55 = tmpBuffer;
        tmpBuffer = EMA5.getResult();
        object.ema100 = tmpBuffer;
        tmpBuffer = EMA6.getResult();
        object.ema200 = tmpBuffer;

        return object
    }
}

/**
 *  Class EMAIndicator
 *  @type Indicator
 * */
class EMAIndicator{

    static className = "EMAIndicator"
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 9)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let ema = new  EMA({period : args.period || 9, values  : c});
        return ema.getResult();
    }
}

class ZEMAIndicator{

    static className = "ZEMAIndicator"
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 9)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let zema = [];
        let ema = new  EMA({period : args.period || 9, values  : c});
        let emaData = ema.getResult();
        let zemaTmpInst = new  EMA({period : args.period || 9, values  : emaData});
        let zemaTmp = zemaTmpInst.getResult();
        let lengthDifference  = (emaData.length - zemaTmp.length);
        let length = emaData.length; 
        let j = 0;
        for(let i = lengthDifference; i<length; i++ ){
            let zmaDiff= emaData[i] - zemaTmp[j]
            let zmaEntry= zemaTmp[j] + zmaDiff;
            j++;
            zema.push(zmaEntry);
        }
        return zema;
    }
}

/**
 *  Class Ema10And20
 *  @type Indicator
 * */
class Ema10And20{

    static className ="Ema10And20";
    /**
     * @typedef {Object} ema1020
     * @property {Array<number>} ema10 - The ema10 values
     * @property {Array<number>} ema20 - The ema20 values
     **/

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args null
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<ema1020>}
     * */
    static getData(o,h,l,c,v, args, candles){
        let EMA1 = new  EMA({period : 10, values  : c});
        let EMA2 = new  EMA({period : 20, values : c});
        let object = {};
        let tmpBuffer = EMA1.getResult();
        object.ema10 = tmpBuffer;
        tmpBuffer = EMA2.getResult();
        object.ema20 = tmpBuffer;
        return object;
    }
}


/**
 *  Class Ema3Indicator
 *  @type Indicator
 * */
class Ema3Indicator{

    static className ="Ema3Indicator"

    /**
     * @typedef {Object} emas
     * @property {Array<number>} ema1 - The ema1 values
     * @property {Array<number>} ema2 - The ema2 values
     * @property {Array<number>} ema3 - The ema3 values
     **/

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period1 {number} moving average period (default 9)
     * @param args.period2 {number} moving average period (default 21)
     * @param args.period3 {number} moving average period (default 55)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<emas>}
     * */
    static getData(o,h,l,c,v, args,candles ){
        let EMA1 = new  EMA({period : args.period1 || 9, values  : c});
        let EMA2 = new  EMA({period : args.period2 || 21, values : c});
        let EMA3 = new  EMA({period : args.period3 || 55, values : c});
        let object = {};
        let tmpBuffer = EMA1.getResult();
        object.ema1 = tmpBuffer;
        tmpBuffer = EMA2.getResult();
        object.ema2 = tmpBuffer;
        tmpBuffer = EMA3.getResult();
        object.ema3 = tmpBuffer;
        return object;
    }
}

/**
 *  Class Sma3Indicator
 *  @type Indicator
 * */
class Sma3Indicator{

    static className ="Sma3Indicator";
    /**
     * @typedef {Object} smas
     * @property {Array<number>} sma1 - The sma1 values
     * @property {Array<number>} sma2 - The sma2 values
     * @property {Array<number>} sma3 - The sma3 values
     **/

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period1 {number} moving average period (default 50)
     * @param args.period2 {number} moving average period (default 100)
     * @param args.period3 {number} moving average period (default 200)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<smas>}
     * */
    static getData(o,h,l,c,v, args, candles){
        let SMA1 =  new  SMA({period : args.period1 || 50,  values : c});
        let SMA2 = new  SMA({period : args.period2 || 100, values : c});
        let SMA3 = new  SMA({period : args.period3 || 200, values : c});
        let object = {};
        let tmpBuffer = SMA1.getResult();
        object.sma1 = tmpBuffer;
        tmpBuffer = SMA2.getResult();
        object.sma2 = tmpBuffer;
        tmpBuffer = SMA3.getResult();
        object.sma3 = tmpBuffer;
        return object
    }
}

/**
 *  Class SmaIndicator
 *  @type Indicator
 * */
class SmaIndicator{

    static className ="SmaIndicator";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 50)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let sma =  new  SMA({period : args.period || 50,  values : c});
        return sma.getResult();
    }
}

/**
 *  Class AdlIndicator
 *  @type Indicator
 * */
class AdlIndicator{
    static className ="AdlIndicator"
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args null
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let input= {
            high:h,
            low:l,
            close:c,
            volume:v
        }

        return ADL.calculate(input);
    }
}

/**
 *  Class AdxIndicator
 *  @type Indicator
 * */
class AdxIndicator{
    static className ="AdxIndicator"
    /**
     * @typedef {Object} adxIndicator
     * @property {number} adx - The adx values
     * @property {number} pdi - The pdi values
     * @property {number} mdi - The mdi values
     **/

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} the moving average or atr period (default 14)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @return {Array<adxIndicator>}
     * */
    static  getData(o,h,l,c,v, args, candles){
        let input= {
            high:h,
            low:l,
            close:c,
            period:14
        };

        let adx = new ADX(input)
        let data = adx.getResult();
        return data;
    }
}


/**
 *  Class AwesomeOscillatorIndicator
 *  @type Indicator
 * */
class AwesomeOscillatorIndicator{
    static className ="AwesomeOscillatorIndicator";
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.fastPeriod {number} the moving average fast period (default 5)
     * @param args.slowPeriod {number} the moving average slow period (default 34)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let input = {
            high : h,
            low  :  l,
            fastPeriod : args.fastPeriod || 5,
            slowPeriod : args.slowPeriod || 34,
            format : (a)=>parseFloat(a.toFixed(2))
        }
        return AwesomeOscillator.calculate(input)
    }
}


/**
 *  Class CciIndicator
 *  @type Indicator
 * */
class CciIndicator{
    static className ="CciIndicator";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 20)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let inputCCI = {
            open : o,
            high : h,
            low : l,
            close : c,
            period : args.period || 20
        };
        return CCI.calculate(inputCCI);
    }
}

/**
 *  Class ForceIndexIndiactor
 *  @type Indicator
 * */
class ForceIndexIndiactor{
    static className ="ForceIndexIndiactor";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 1)
     ** @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let input ={
            close : c,
            volume :v,
            period : args.period || 1
        };
        return ForceIndex.calculate(input);
    }
}

/**
 *  Class PsarIndicator
 *  @type Indicator
 * */
class PsarIndicator{
    static className = "PsarIndicator";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.step {number} (step float default 0.02 )
     * @param args.max {number} ( max float default 0.02 )
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let input = { high:h, low:l, step:args.step || 0.02, max:args.max || 0.2};
        return PSAR.calculate(input);
    }
}

/**
 *  Class RocIndicator
 *  @type Indicator
 * */
class RocIndicator{

    static className = "RocIndicator";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (The moving average period default 12)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        return ROC.calculate({period:args.period || 12, values:c})
    }
}


/**
 *  Class StochasticIndicator
 *  @type Indicator
 * */
class StochasticIndicator{
    static className = "StochasticIndicator"
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 14)
     * @param args.signalPeriod {number} (the signal period default 3)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [{k:Number}]
     * */

    static getData(o,h,l,c,v, args, candles){
        let input = {
            high: h,
            low: l,
            close: c,
            period: args.period || 14,
            signalPeriod: args.signalPeriod || 3
        };

        return Stochastic.calculate(input)
    }
}

/**
 *  Class TrixIndicator
 *  @type Indicator
 * */
class TrixIndicator{
    static className = "TrixIndicator"
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 18)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData( o,h,l,c,v,args, candles){
        let input = {
            values      : c,
            period      : args.period || 18
        };

        return TRIX.calculate(input);
    }
}

/**
 *  Class VolumeWeightedAvgPrice
 *  @type Indicator
 * */
class VolumeWeightedAvgPrice{
    static className = "VolumeWeightedAvgPrice"
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let input = {
            high :h,
            low :l,
            close : c,
            volume :v,
        };
        return VWAP.calculate(input)
    }
}

/**
 *  Class VolumeProfile
 *  @type Indicator
 * */
class VolumeProfile{
    static className = "VolumeProfile";
    /**
     * @typedef {Object} vp
     * @property {number} rangeStart - The range start
     * @property {number} rangeEnd - The range end
     * @property {number} bullishVolume - The bullish volumes
     * @property {number} bullishVolume - The bearish volumes
     * @property {number} totalVolume - The total volume
     ** /
     *
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number}(The Number of Bars to index)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns {Array<vp>}
     * */
    static getData(o,h,l,c,v, args, candles){
        let input = {
            open:o,
            high :h,
            low :l,
            close : c,
            volume :v,
            noOfBars:args.period || 18
        };

        return VP.calculate(input)
    }
}

/**
 *  Class WeighteMovingAvg
 *  @type Indicator
 * */
class WeighteMovingAvg{
    static className = "WeighteMovingAvg";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 12)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        return WP.calculate({period : args.period || 12, values : c})
    }
}

/**
 *  Class WildersSmoothingWeighteMovingAvg
 *  @type Indicator
 * */
class WildersSmoothingWeighteMovingAvg{
    static className = "WildersSmoothingWeighteMovingAvg";
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.period {number} (the moving average period default 50)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @returns [Number]
     * */

    static getData(o,h,l,c,v, args, candles){
        return WEMA.calculate({period : args.period || 50, values : c})
    }
}

/**
 *  Class IchimokuCloudIndicator
 *  @type Indicator
 * */
class IchimokuCloudIndicator{
    static className = "IchimokuCloudIndicator";
    /**
     * @typedef {Object} itchyMicky
     * @property {number} conversionPeriod - The conversionPeriod
     * @property {number} base - The base-line
     * @property {number} spanA - The span A Line
     * @property {number} spanB - The span B Line
     */

    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @param v {Array<number>}  The Volumes
     * @param args.conversionPeriod {number} (conversionPeriod default 9)
     * @param args.basePeriod {number} (basePeriod default 26)
     * @param args.spanPeriod {number} (spanPeriod default 52)
     * @param args.displacement {number} (displacement default 26)
     * @param candles {Array<Array<number>>} o,h,l,c,v array Buffer
     * @return {Array<itchyMicky>}
     * */
    static getData(o,h,l,c,v, args, candles){
        let input ={
            high  :h,
            low   : l,
            conversionPeriod: args.conversionPeriod || 9,
            basePeriod: args.basePeriod || 26,
            spanPeriod: args.spanPeriod || 52,
            displacement: args.displacement || 26
        };
        return IchimokuCloud.calculate(input)
    }
}

/**
 *  Class IndicatorList
 *  @type Indicator
 * */
class IndicatorList{

    /**
     *
     * @return {string[]} List of Available Indicators
     */
    static getData(){
        return ["SuperTrendIndicator",
            "RsiIndicator",
            "AtrIndicator",
            "BollingerIndicator",
            "MacdIndicator",
            "PatternRecognitionIndicator",
            "WilliamsRIndicator",
            "KsiIndicator",
            "MfiIndicator",
            "ObvIndicator",
            "Ema4Indicator",
            "Ema3Indicator",
            "Ema10And20",
            "Sma3Indicator",
            "AdlIndicator",
            "AdxIndicator",
            "AwesomeOscillatorIndicator",
            "CciIndicator",
            "StochasticIndicator",
            "IchimokuCloudIndicator",
            "WildersSmoothingWeighteMovingAvg",
            "WeighteMovingAvg",
            "VolumeProfile",
            "VolumeWeightedAvgPrice",
            "TrixIndicator",
            "ForceIndexIndiactor",
            "RocIndicator",
            "PsarIndicator",
            "IndicatorUtils",
            "EMAIndicator",
            "SmaIndicator",
            "FloorPivots",
            "Woodies"
        ];
    }
}

/**
 *  Class PatternRecognitionIndicator
 *  @type Indicator
 * */
class PatternRecognitionIndicator{

    static className = "PatternRecognitionIndicator";

    /**
     *
     * @returns {string[]} A list of available Patterns
     */
    static getPatterns(){
        return Object.getOwnPropertyNames(PatternRecognitionIndicator)
            .filter(prop => typeof PatternRecognitionIndicator[prop] === "function");
    }

    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a AbandonedBaby pattern is detected
     * @constructor
     */
    static AbandonedBaby(o,h,l,c){
        let pattern = technicalIndicators.abandonedbaby;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a BearishEngulfingPattern pattern is detected
     * @constructor
     */
    static BearishEngulfingPattern(o,h,l,c){
        let pattern = technicalIndicators.bearishengulfingpattern;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a BullishEngulfingPattern pattern is detected
     * @constructor
     */
    static BullishEngulfingPattern(o,h,l,c){
        let pattern = technicalIndicators.bullishengulfingpattern;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a DarkCloudCover pattern is detected
     * @constructor
     */
    static DarkCloudCover(o,h,l,c){
        let pattern = technicalIndicators.darkcloudcover;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a DownsideTasukiGap pattern is detected
     * @constructor
     */
    static DownsideTasukiGap(o,h,l,c){
        let pattern = technicalIndicators.downsidetasukigap;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a Doji pattern is detected
     * @constructor
     */
    static Doji(o,h,l,c){
        let pattern = technicalIndicators.doji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a DragonFlyDoji pattern is detected
     * @constructor
     */
    static DragonFlyDoji(o,h,l,c){
        let pattern = technicalIndicators.dragonflydoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a GraveStoneDoji pattern is detected
     * @constructor
     */
    static GraveStoneDoji(o,h,l,c){
        let pattern = technicalIndicators.gravestonedoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a BullishHarami pattern is detected
     * @constructor
     */
    static BullishHarami(o,h,l,c){
        let pattern = technicalIndicators.gravestonedoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a BearishHaramiCross pattern is detected
     * @constructor
     */
    static BearishHaramiCross(o,h,l,c){
        let pattern = technicalIndicators.gravestonedoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a BullishHaramiCross pattern is detected
     * @constructor
     */
    static BullishHaramiCross(o,h,l,c){
        let pattern = technicalIndicators.gravestonedoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a BullishMarubozu pattern is detected
     * @constructor
     */
    static BullishMarubozu(o,h,l,c){
        let pattern = technicalIndicators.bullishmarubozu;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a BearishMarubozu pattern is detected
     * @constructor
     */
    static BearishMarubozu(o,h,l,c){
        let pattern = technicalIndicators.bearishmarubozu;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a EveningDojiStar pattern is detected
     * @constructor
     */
    static EveningDojiStar(o,h,l,c){
        let pattern = technicalIndicators.eveningdojistar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a EveningStar pattern is detected
     * @constructor
     */
    static EveningStar(o,h,l,c){
        let pattern = technicalIndicators.eveningstar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static BearishHarami(o,h,l,c){
        let pattern = technicalIndicators.bearishharami;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static PiercingLine(o,h,l,c){
        let pattern = technicalIndicators.piercingline;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static BullishSpinningTop(o,h,l,c){
        let pattern = technicalIndicators.bullishspinningtop;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static BearishSpinningTop(o,h,l,c){
        let pattern = technicalIndicators.bearishspinningtop;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static MorningDojiStar(o,h,l,c){
        let pattern = technicalIndicators.morningdojistar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static MorningStar(o,h,l,c){
        let pattern = technicalIndicators.morningstar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static ThreeBlackCrows(o,h,l,c){
        let pattern = technicalIndicators.threeblackcrows;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static ThreeWhiteSoldiers(o,h,l,c){
        let pattern = technicalIndicators.threewhitesoldiers;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static BullishHammer(o,h,l,c){
        let pattern = technicalIndicators.bullishhammerstick;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static BearishHammer(o,h,l,c){
        let pattern = technicalIndicators.bearishhammerstick;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static BullishInvertedHammer(o,h,l,c){
        let pattern = technicalIndicators.bullishinvertedhammerstick;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static BearishInvertedHammer(o,h,l,c){
        let pattern = technicalIndicators.bearishinvertedhammerstick;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static HammerPattern(o,h,l,c){
        let pattern = technicalIndicators.hammerpattern;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static HammerPatternUnconfirmed(o,h,l,c){
        let pattern = technicalIndicators.hammerpatternunconfirmed;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static HangingMan(o,h,l,c){
        let pattern = technicalIndicators.hangingman;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static HangingManUnconfirmed(o,h,l,c){
        let pattern = technicalIndicators.hangingmanunconfirmed;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static ShootingStar(o,h,l,c){
        let pattern = technicalIndicators.shootingstar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static ShootingStarUnconfirmed(o,h,l,c){
        let pattern = technicalIndicators.shootingstarunconfirmed;
        let set = [
            {name:'Bearish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish', data:{open:o,high:h,low:l,close:c}},
        ]
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static TweezerTop(o,h,l,c){
        let pattern = technicalIndicators.tweezertop;
        return pattern({open:o,high:h,low:l,close:c})
    }
    /**
     *
     * @param o {Array<number>}  The Opening Candles
     * @param h {Array<number>}  The Higher High Candles
     * @param l {Array<number>}  The Lower Low Candles
     * @param c {Array<number>}  The Closing Candles
     * @returns {Boolean} returns true if a pattern is detected
     * @constructor
     */
    static TweezerBottom(o,h,l,c){
        let pattern = technicalIndicators.tweezerbottom;
        return pattern({open:o,high:h,low:l,close:c})
    }
}
/**
 *  Class IndicatorUtils
 *  @type Indicator
 * */
class IndicatorUtils{

    /**
     *
     * @param [current:Number] The first sequence of Numbers with slow fast moving averages
     * @param [previous:Number] The first sequence of Numbers with slow fast moving averages
     * @return {boolean[]}
     * @constructor
     */

    static CrossUp(current, previous){
        let crossUp = technicalIndicators.CrossUp;
        return crossUp.calculate({lineA:current, lineB:previous})
    }

    /**
     *
     * @param [current:Number] The first sequence of Numbers with slow fast moving averages
     * @param [previous:Number] The first sequence of Numbers with slow fast moving averages
     * @return {boolean[]}
     * @constructor
     */
    static CrossDown(current, previous){
        let crossDown = technicalIndicators.CrossDown;
        return crossDown.calculate({lineA:current, lineB:previous})
    }

    /**
     *
     * @param [current:Number] The first sequence of Numbers with slow fast moving averages
     * @param [previous:Number] The first sequence of Numbers with slow fast moving averages
     * @return {boolean[]}
     * @constructor
     */
    static CrossOver(current, previous){
        let crossOver = technicalIndicators.crossOver;
        console.log( crossOver );
        return crossOver.calculate({lineA:current, lineB:previous})
    }

    /**
     *
     * @param values (Number array)
     * @param args.period {number} (Number range for max values )
     * @return {number[]}
     * @constructor
     */
    static Highest( values, args){
        let highest = technicalIndicators.Highest;
        return highest.calculate({values:values, period:args.period || 14})
    }

    /**
     *
     * @param values (Number array)
     * @param args.period {number} (Number range for min values )
     * @return {number[]}
     * @constructor
     */
    static Lowest(values, args){
        let lowest = technicalIndicators.Lowest;
        return lowest.calculate({values:values, period:args.period || 14})
    }
}

/**
 * @type {{RsiIndicator: RsiIndicator, SuperTrendIndicator: SuperTrendIndicator, PsarIndicator: PsarIndicator, KsiIndicator: KsiIndicator, AwesomeOscillatorIndicator: AwesomeOscillatorIndicator, Ema3Indicator: Ema3Indicator, PatternRecognitionIndicator: PatternRecognitionIndicator, WeighteMovingAvg: WeighteMovingAvg, WilliamsRIndicator: WilliamsRIndicator, ObvIndicator: ObvIndicator, VolumeProfile: VolumeProfile, TrixIndicator: TrixIndicator, IndicatorUtils: IndicatorUtils, Woodies: Woodies, Ema4Indicator: Ema4Indicator, FloorPivots: FloorPivots, BollingerIndicator: BollingerIndicator, MacdIndicator: MacdIndicator, AtrIndicator: AtrIndicator, StochasticIndicator: StochasticIndicator, EMAIndicator: EMAIndicator, AdxIndicator: AdxIndicator, SmaIndicator: SmaIndicator, AdlIndicator: AdlIndicator, Sma3Indicator: Sma3Indicator, VolumeWeightedAvgPrice: VolumeWeightedAvgPrice, WildersSmoothingWeighteMovingAvg: WildersSmoothingWeighteMovingAvg, MfiIndicator: MfiIndicator, ForceIndexIndiactor: ForceIndexIndiactor, RocIndicator: RocIndicator, CciIndicator: CciIndicator, IndicatorList: IndicatorList, IchimokuCloudIndicator: IchimokuCloudIndicator, Ema10And20: Ema10And20}}
 */
module.exports = {
    FloorPivots:FloorPivots,
    Woodies:Woodies,
    SmaIndicator:SmaIndicator,
    SuperTrendIndicator:SuperTrendIndicator,
    RsiIndicator:RsiIndicator,
    AtrIndicator:AtrIndicator,
    BollingerIndicator:BollingerIndicator,
    MacdIndicator:MacdIndicator,
    PatternRecognitionIndicator:PatternRecognitionIndicator,
    WilliamsRIndicator:WilliamsRIndicator,
    KsiIndicator:KsiIndicator,
    MfiIndicator:MfiIndicator,
    ObvIndicator:ObvIndicator,
    Ema4Indicator:Ema4Indicator,
    Ema3Indicator:Ema3Indicator,
    Ema10And20:Ema10And20,
    Sma3Indicator:Sma3Indicator,
    AdlIndicator:AdlIndicator,
    AdxIndicator:AdxIndicator,
    AwesomeOscillatorIndicator:AwesomeOscillatorIndicator,
    CciIndicator:CciIndicator,
    StochasticIndicator:StochasticIndicator,
    IchimokuCloudIndicator:IchimokuCloudIndicator,
    WildersSmoothingWeighteMovingAvg:WildersSmoothingWeighteMovingAvg,
    WeighteMovingAvg:WeighteMovingAvg,
    VolumeProfile:VolumeProfile,
    VolumeWeightedAvgPrice:VolumeWeightedAvgPrice,
    TrixIndicator:TrixIndicator,
    ForceIndexIndiactor:ForceIndexIndiactor,
    RocIndicator:RocIndicator,
    PsarIndicator:PsarIndicator,
    IndicatorUtils:IndicatorUtils,
    EMAIndicator:EMAIndicator,
    ZEMAIndicator:ZEMAIndicator,
    IndicatorList:IndicatorList,
    ZScore:ZScore,
    MultiDivergenceDetector:MultiDivergenceDetector,
    DynamicGridSignals:DynamicGridSignals,
    SupportAndResistance:SupportAndResistance,

};
