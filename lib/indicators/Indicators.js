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


class SuperTrendIndicator {
    static className = 'SuperTrendIndicator';

    /**
     * @typedef [{Object}] data
     * @property {string} trend current trend long|short
     * @property {value} moving average Value
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period the moving average period (default 10)
     * @param args.multiplier the atr multiplier (default 3)
     * @param candles
     * @returns data
     *
     */
    static getData(o,h,l,c,v, args, candles){
        const st = new SuperTrend(candles,args.period || 10,args.multiplier ||  3);
        return st.calculate();
    }
}
class Woodies {
    static className = "Woodies"

    /**
     * @typedef [{Object}] data
     * @property {number} pivot
     * @property {number} r1
     * @property {number} r2
     * @property {number} s1
     * @property {number} s2
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args null
     * @param candles
     * @returns data
     *
     */
    static getData(o,h,l,c,v, args, candles){
      return utils.woodies(o,h,l,c,v, args, candles)
    }
}

class FloorPivots {
    static className = "FloorPivots"
    /**
     * @typedef [{Object}] data
     * @property {number} pivot
     * @property {number} r1
     * @property {number} r2
     * @property {number} r3
     * @property {number} s1
     * @property {number} s2
     * @property {number} r3
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args null
     * @param candles
     * @returns data
     *
     */
    static getData(o,h,l,c,v, args, candles){
        return utils.floorPivots(o,h,l,c,v, args, candles)
    }
}

class RsiIndicator {
    static className = "RsiIndicator"

/**
 * @typedef [number] data
 * @param o
 * @param h
 * @param l
 * @param c
 * @param v
 * @param args.period (the rsi period default 14)
 * @param candles
 * @returns data
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
class AtrIndicator {
    static className = "AtrIndicator"
    /**
     * @typedef [number] data
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period (the atr period default 12)
     * @param candles
     * @returns data
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
class BollingerIndicator{

    static className = "BollingerIndicator"
    /**
     * @typedef [{Object}] data
     * @property {number} middle
     * @property {number} upper
     * @property {number} lower
     * @property {number} pb
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period the moving average period
     * @param args.stdDev the standard deviation of bands
     * @param candles
     * @returns data
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
class MacdIndicator{

    static className = "MacdIndicator"
    /**
     * @typedef [{Object}] data
     * @property {number} MACD
     * @property {number} signal
     * @property {number} histogram
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.fastPeriod the fast moving average period
     * @param args.slowPeriod the slow moving average period
     * @param args.signalPeriod the macd signal period
     * @param candles
     * @returns data
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
class PatternRecognitionIndicator{

    static className = "PatternRecognitionIndicator";
    static getPatterns(){
        return Object.getOwnPropertyNames(PatternRecognitionIndicator)
            .filter(prop => typeof PatternRecognitionIndicator[prop] === "function");
    }
    static AbandonedBaby(o,h,l,c){
        let pattern = technicalIndicators.abandonedbaby;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BearishEngulfingPattern(o,h,l,c){
        let pattern = technicalIndicators.bearishengulfingpattern;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BullishEngulfingPattern(o,h,l,c){
        let pattern = technicalIndicators.bullishengulfingpattern;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static DarkCloudCover(o,h,l,c){
        let pattern = technicalIndicators.darkcloudcover;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static DownsideTasukiGap(o,h,l,c){
        let pattern = technicalIndicators.downsidetasukigap;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static Doji(o,h,l,c){
        let pattern = technicalIndicators.doji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static DragonFlyDoji(o,h,l,c){
        let pattern = technicalIndicators.dragonflydoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static GraveStoneDoji(o,h,l,c){
        let pattern = technicalIndicators.gravestonedoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BullishHarami(o,h,l,c){
        let pattern = technicalIndicators.gravestonedoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BearishHaramiCross(o,h,l,c){
        let pattern = technicalIndicators.gravestonedoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BullishHaramiCross(o,h,l,c){
        let pattern = technicalIndicators.gravestonedoji;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BullishMarubozu(o,h,l,c){
        let pattern = technicalIndicators.bullishmarubozu;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BearishMarubozu(o,h,l,c){
        let pattern = technicalIndicators.bearishmarubozu;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static EveningDojiStar(o,h,l,c){
        let pattern = technicalIndicators.eveningdojistar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static EveningStar(o,h,l,c){
        let pattern = technicalIndicators.eveningstar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BearishHarami(o,h,l,c){
        let pattern = technicalIndicators.bearishharami;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static PiercingLine(o,h,l,c){
        let pattern = technicalIndicators.piercingline;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BullishSpinningTop(o,h,l,c){
        let pattern = technicalIndicators.bullishspinningtop;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BearishSpinningTop(o,h,l,c){
        let pattern = technicalIndicators.bearishspinningtop;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static MorningDojiStar(o,h,l,c){
        let pattern = technicalIndicators.MorningDojiStar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static MorningStar(o,h,l,c){
        let pattern = technicalIndicators.morningstar;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static ThreeBlackCrows(o,h,l,c){
        let pattern = technicalIndicators.threeblackcrows;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static ThreeWhiteSoldiers(o,h,l,c){
        let pattern = technicalIndicators.threewhitesoldiers;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BullishHammer(o,h,l,c){
        let pattern = technicalIndicators.bullishhammerstick;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BearishHammer(o,h,l,c){
        let pattern = technicalIndicators.bearishhammerstick;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BullishInvertedHammer(o,h,l,c){
        let pattern = technicalIndicators.bullishinvertedhammerstick;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static BearishInvertedHammer(o,h,l,c){
        let pattern = technicalIndicators.bearishinvertedhammerstick;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static HammerPattern(o,h,l,c){
        let pattern = technicalIndicators.hammerpattern;
        let set = [
            {name:'Bearish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bearish Inverted', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish Inverted', data:{open:o,high:h,low:l,close:c}},
        ]
        return pattern(set)
    }
    static HammerPatternUnconfirmed(o,h,l,c){
        let pattern = technicalIndicators.hammerpatternunconfirmed;
        let set = [
            {name:'Bearish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bearish Inverted', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish Inverted', data:{open:o,high:h,low:l,close:c}},
        ]
        return pattern(set)
    }
    static HangingMan(o,h,l,c){
        let pattern = technicalIndicators.hangingman;
        let set = [
            {name:'Bearish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish', data:{open:o,high:h,low:l,close:c}},
        ]
        return pattern(set)
    }
    static HangingManUnconfirmed(o,h,l,c){
        let pattern = technicalIndicators.hangingman;
        let set = [
            {name:'Bearish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish', data:{open:o,high:h,low:l,close:c}},
        ]
        return pattern(set)
    }
    static ShootingStar(o,h,l,c){
        let pattern = technicalIndicators.shootingstar;
        let set = [
            {name:'Bearish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish', data:{open:o,high:h,low:l,close:c}},
        ]
        return pattern(set)
    }
    static ShootingStarUnconfirmed(o,h,l,c){
        let pattern = technicalIndicators.shootingstarunconfirmed;
        let set = [
            {name:'Bearish', data:{open:o,high:h,low:l,close:c}},
            {name:'Bullish', data:{open:o,high:h,low:l,close:c}},
        ]
        return pattern(set)
    }
    static TweezerTop(o,h,l,c){
        let pattern = technicalIndicators.tweezertop;
        return pattern({open:o,high:h,low:l,close:c})
    }
    static TweezerBottom(o,h,l,c){
        let pattern = technicalIndicators.tweezerbottom;
        return pattern({open:o,high:h,low:l,close:c})
    }
}

class WilliamsRIndicator{

    static className = "WilliamsRIndicator";
    /**
     * @typedef [number] data
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period (the moving average period default 14)
     * @param candles
     * @returns data
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
class KsiIndicator{

    static className = "KsiIndicator"

    /**
     * @typedef [{Object}] data
     * @property {number} kst
     * @property {number} signal
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args null
     * @param candles
     * @returns obj [{kst: Number}]
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
class MfiIndicator{
    /**
     * @typedef [number] data
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period (the moving average period default 14)
     * @param candles
     * @returns data
     * */
    static className = "MfiIndicator"

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
class ObvIndicator{

    static className = "ObvIndicator";
    /**
     * @typedef [number] data
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period (the moving average period default 14)
     * @param candles
     * @returns data
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
class Ema4Indicator{
    static className ="Ema4Indicator";

    /**
     * @typedef [{Object}] data
     * @property [number] ema8
     * @property [number] ema13
     * @property [number] ema21
     * @property [number] ema55
     * @property [number] ema100
     * @property [number] ema200
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args null
     * @param candles
     * @returns data
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

class EMAIndicator{

    static className = "EMAIndicator"
    /**
     * @typedef [number] data
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period (the moving average period default 9)
     * @param candles
     * @returns data
     * */
    static getData(o,h,l,c,v, args, candles){
        let ema = new  EMA({period : args.period || 9, values  : c});
        return ema.getResult();
    }
}
class Ema10And20{

    static className ="Ema10And20";
    /**
     * @typedef [{Object}] data
     * @property [number] ema10
     * @property [number] ema20
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args null
     * @param candles
     * @returns data
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
class Ema3Indicator{

    static className ="Ema3Indicator"
    /**
     * @typedef [{Object}] data
     * @property [number] ema1
     * @property [number] ema2
     * @property [number] ema2
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period1 moving average period (default 9)
     * @param args.period2 moving average period (default 21)
     * @param args.period3 moving average period (default 55)
     * @param candles
     * @returns data
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
class Sma3Indicator{

    static className ="Sma3Indicator";
    /**
     * @typedef [{Object}] data
     * @property [number] ema1
     * @property [number] ema2
     * @property [number] ema2
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period1 moving average period (default 50)
     * @param args.period2 moving average period (default 100)
     * @param args.period3 moving average period (default 200)
     * @param candles
     * @returns data
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
class SmaIndicator{

    static className ="SmaIndicator";
    /**
     * @typedef [number] data
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period (the moving average period default 50)
     * @param candles
     * @returns data
     * */
    static getData(o,h,l,c,v, args, candles){
        let sma =  new  SMA({period : args.period || 50,  values : c});
        return sma.getResult();
    }
}

class AdlIndicator{
    static className ="AdlIndicator"
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args null
     * @param candles
     * @returns [number]
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
class AdxIndicator{
    static className ="AdxIndicator"
    /**
     * @typedef [{Object}] data
     * @property [number] data.adx
     * @property [number] data.pdi
     * @property [number] data.mdi
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args.period the moving average or atr period (default 14)
     * @param candles
     * @returns data
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
class AwesomeOscillatorIndicator{
    static className ="AwesomeOscillatorIndicator";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
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
class CciIndicator{
    static className ="CciIndicator";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
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
class ForceIndexIndiactor{
    static className ="ForceIndexIndiactor";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
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
class PsarIndicator{
    static className = "PsarIndicator";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        let input = { high:h, low:l, step:args.step || 0.02, max:args.max || 0.2};
        return PSAR.calculate(input);
    }
}
class RocIndicator{

    static className = "RocIndicator";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        return ROC.calculate({period:args.period || 12, values:c})
    }
}
class StochasticIndicator{
    static className = "StochasticIndicator"
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
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
class TrixIndicator{
    static className = "TrixIndicator"
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
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
class VolumeWeightedAvgPrice{
    static className = "VolumeWeightedAvgPrice"
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
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
class VolumeProfile{
    static className = "VolumeProfile";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
     * @returns [{ "rangeStart": Number, "rangeEnd":Number, "bullishVolume": Number, "bearishVolume": Number, "totalVolume": Number }]
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
class WeighteMovingAvg{
    static className = "WeighteMovingAvg";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
     * @returns [Number]
     * */
    static getData(o,h,l,c,v, args, candles){
        return WP.calculate({period : args.period || 12, values : c})
    }
}
class WildersSmoothingWeighteMovingAvg{
    static className = "WildersSmoothingWeighteMovingAvg";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
     * @returns [Number]
     * */

    static getData(o,h,l,c,v, args, candles){
        return WEMA.calculate({period : args.period, values : c})
    }
}
class IchimokuCloudIndicator{
    static className = "IchimokuCloudIndicator";
    /**
     *
     * @param o
     * @param h
     * @param l
     * @param c
     * @param v
     * @param args
     * @param candles
     * @returns [{"conversion": Number,"base": Number,"spanA": Number,"spanB": Number}]
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


class IndicatorUtils{

    static CrossUp(current, previous){
        let crossUp = technicalIndicators.CrossUp;
        return crossUp.calculate({lineA:current, lineB:previous})
    }
    static CrossDown(current, previous){
        let crossDown = technicalIndicators.CrossDown;
        return crossDown.calculate({lineA:current, lineB:previous})
    }
    static CrossOver(current, previous){
        let crossOver = technicalIndicators.crossOver;
        console.log( crossOver );
        return crossOver.calculate({lineA:current, lineB:previous})
    }
    static Highest( values, args){
        let highest = technicalIndicators.Highest;
        return highest.calculate({values:values, period:args.period || 14})
    }
    static Lowest(values, args){
        let lowest = technicalIndicators.Lowest;
        return lowest.calculate({values:values, period:args.period || 14})
    }
}

class IndicatorList{
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
};

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
    IndicatorList:IndicatorList
};
