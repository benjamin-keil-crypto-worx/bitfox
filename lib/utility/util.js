const SECRET = "8b6e4a97-bfe5-43b4-bdf0-cbad4fa7261c" || process.env.SECRET;// just for offline operations
let uuid = require("uuid4");
const crypto = require('crypto');
let { Candlesticks } = require("../model/Candlesticks");

/**
 *
 * @param arr {Array<number>} The array of numbers to get the minimum value from
 * @returns {number} the minimum number in this array
 */
module.exports.min = (arr) =>{
    return Math.min.apply( Math, arr );
}

/**
 *
 * @param arr  {Array<number>} The array of numbers to get the maximum value from
 * @returns {number} the maximum number in this array
 */
module.exports.max = (arr) =>{
    return Math.max.apply( Math, arr );
}

/**
 *
 * @returns {number} -The Unix Timestamp representation of the given Date
 */
Date.prototype.getUnixTime = function () {
    return this.getTime() / 1000 | 0
};

/**
 *
 * @param data {Array<any>} Data Array to be reversed
 * @returns {Array<any>} reversed Array
 */
const reverseBuffer =( data ) =>{
    let buffer = [];
    let len = data.length - 1;
    for (let i = len; i >= 0; i--) {
        buffer.push(data[i])
    }
    return buffer;
};

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
 * @param candles
 * @returns [floorPivot]
 *
 */
module.exports.floorPivots =(o,h,l,c,v, args, candles) =>{
    let buffer = [];
    c.forEach((close,index)=>{
        let p = (h[index]+ l[index] + c[index]) / 3
        let r1 = (2*p)-l[index];
        let r2 = p + h[index] - l[index]
        let r3 = h[index] + 2 * (p-l[index])
        let s1 = (2 * p) - h[index]
        let s2 = p - h[index] + l[index]
        let s3 = l[index] - 2 * (h[index] - p)
        buffer.push({floor:{pivot:p,r1:r1,r2:r2,r3:r3,s1:s1,s2:s2,s3:s3}})
    })
    return buffer;
}

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
 * @param candles
 * @returns [woodies]
 *
 */
module.exports.woodies =(o,h,l,c,v, args, candles) =>{
    // Pivot (P) = (H + L + 2 x C) / 4
    // Resistance (R1) = (2 x P) - L
    // R2 = P + H - L
    // Support (S1) = (2 x P) - H
    // S2 = P - H + L
    let buffer = [];
    c.forEach((close,index)=>{
        let p = (h[index]+ l[index] + 2 * c[index]) / 4
        let r1 = ( 2*p ) - l[index];
        let r2 = p + h[index] - l[index]
        let s1 = (2 * p) - h[index]
        let s2 = p - h[index] + l[index]
        buffer.push({woodies:{pivot:p,r1:r1,r2:r2,s1:s1,s2:s2}})
    })
    return buffer;
}

/**
 *
 * @param args {any} The Object to check
 * @param requiredList {Array<String>} The keys to check in the object
 * @returns {Boolean}
 */
module.exports.validateRequiredArgs = (args, requiredList) =>{
    return requiredList.every(item => args.hasOwnProperty(item))
}

/**
 *
 * @param array {Array<number>} The Array of number to get the average from
 * @returns {number} the Average of the array
 */
module.exports.average = (array)=>{
    return array.reduce((a, b) => a + b) / array.length;
}

/**
 *
 * @param high {number} the price at the high in the candle
 * @param pt {number} the profit target percentage
 * @returns {boolean} true false flag to indicate trade is in profit or not
 */
module.exports.priceInLongProfitRange = (high,pt)=>{
    return high>=pt;
}

/**
 *
 * @param low {number} the price at the low in the candle
 * @param pt {number} the profit target percentage
 * @returns {boolean} true false flag to indicate trade is in profit or not
 */
module.exports.priceInShortProfitRange = (low,pt)=>{
    return low<=pt;
}

/**
 *
 * @param high {number} the price at the high in the candle
 * @param st {number} the stop target percentage
 * @returns {boolean} true false flag to indicate trade should be stopped
 */
module.exports.priceInShortStopRange = (high,st)=>{
    return high>st;
}

/**
 *
 * @param low {number} the price at the low in the candle
 * @param st {number} the stop target percentage
 * @returns {boolean} true false flag to indicate trade should be stopped
 */
module.exports.priceInLongStopRange = (low,st)=>{
    return low<st;
}

/**
 *
 * @param data {Array<any>} Data Array to be reversed
 * @returns {Array<any>} reversed Array
 */
module.exports.reverseData = (data) => {
    return reverseBuffer(data)
};

/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all closing data
  */
const getCloses = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.c))
    });
    return buffer;
};

/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all Higher high data
 */
const getHighs = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.h))
    });
    return buffer;
};

/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all lower low data
 */
const getLows = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.l))
    });
    return buffer;
};

/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all opening data
 */
const getOpens = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.o))
    });
    return buffer;
};

/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns Array<number> an Array with all volume data
 */
const getVolumes = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.v))
    });
    return buffer;
};

/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all closing data
 */
module.exports.closes = (candles) => {return getCloses(candles);};
/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all Higher high data
 */
module.exports.highs = (candles)  => {return getHighs( candles)};
/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all lower low  data
 */
module.exports.lows = (candles)   => {return getLows(candles)};
/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all opening data
 */
module.exports.open = (candles)   => {return getOpens(candles)};
/**
 *
 * @param candles {Array<Array<number>>} The ohlcv candle buffer
 * @returns {Array<number>} an Array with all volume high data
 */
module.exports.volume = (candles) => {return getVolumes(candles)};

/**
 *
 * @param buffer creates indicator data
 */
module.exports.createIndicatorData =( buffer ) =>{
    let candleSticks = null;
    if (buffer[0][0] > buffer[buffer.length - 1][0]) {
        // need to reverse the Array some exchanges dont provide OHLCV data in desc order
        candleSticks = new Candlesticks(null, reverseBuffer(buffer))

    } else {
        candleSticks = new Candlesticks(null, buffer)
    }
    let candles = candleSticks.getCandles().candles;
    let  c =getCloses( candles );
    let  o =getOpens(candles);
    let  h = getHighs(candles);
    let  l =getLows(candles);
    let  v = getVolumes(candles);
    return { o,h,l,c,v, buffer }
};

/**
 *
 * @returns {string} returns a uuid
 */
module.exports.getUuid = () =>{ return uuid()};

/**
 *
 * @param date {Date} the Dat object to add days to
 * @param days {number} the number of days to add to the Date
 * @return {Date} The modified date
 */
module.exports.addDays = (date, days) => {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 *
 * @returns {string} Generates an API Key not used
 */
module.exports.generateAPIKey = () => {
    let randomData = `${new Date().toISOString()}${uuid()}`
    return crypto.createHmac('sha512', process.env.SECRET || SECRET)
        .update(randomData)
        .digest('base64');
};

/**
 *
 * @param data {String} the string to create a sha256 hash from not used
 * @returns {string}
 */
module.exports.sha256 = (data) => {
    return crypto.createHmac('sha256', process.env.SECRET || SECRET)
        .update(data)
        .digest('hex');
};

/**
 *
 * @param o {Array<number>}  The Opening Candles
 * @param h {Array<number>}  The Higher High Candles
 * @param l {Array<number>}  The Lower Low Candles
 * @param c {Array<number>}  The Closing Candles
 * @param v {Array<number>}  The Volume Data
 * @returns {Array<Array<number>>} The Converted data
 */
module.exports.convertOHCVToTWArgs = (o,h,l,c,v ) =>{
    let buffer = [];
    c.forEach((entry, index) => {
        buffer.push( {c:entry, o:o[index], l:l[index], h:h[index],v:v[index]} );
    });
    return buffer;
};

/**
 *
 * @param obj {any} the instance to copy
 * @returns {any} the new copied object
 */
module.exports.deepCopy = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 *
 * @param timeout {number} the timout in seconds to pause execution
 * @returns {Promise<Boolean>}
 */
module.exports.sleepy = (timeout = null) => {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve(false);
        }, timeout || 500)
    })
};

/**
 *
 * @param tmf {string} the timeframe to use to create getters and setters for an Date instance
 * @returns {{getKey: string, value: number, setKey: string}}
 */
module.exports.getPreviousCandleDateFromTimeFrame =  (tmf )=>{

    switch ( tmf ){

        case "1d" :{
            return { getKey:'getHours',setKey:'setHours', value: ( 24 )};
        }
        case "1h" :{
            return { getKey:'getHours',setKey:'setHours', value:1};
        }
        case "1m" :{
            return { getKey:'getMinutes',setKey:'setMinutes', value:1};
        }
        case "1w" :{
            return { getKey:'getHours',setKey:'setHours', value: (7 * 24)};
        }
        case "2h" :{
            return { getKey:'getHours',setKey:'setHours', value:2};
        }
        case "3d" :{
            return { getKey:'getHours',setKey:'setHours', value: (3 * 24)};
        }
        case "3m" :{
            return { getKey:'getMinutes',setKey:'setMinutes', value:3};
        }
        case "4h" :{
            return { getKey:'getHours',setKey:'setHours', value:4};
        }
        case "5m" : {
            return {getKey: 'getMinutes', setKey: 'setMinutes', value: 5};
        }
        case "6h" :{
            return { getKey:'getHours',setKey:'setHours', value: 6};
        }
        case "8h" :{
            return { getKey:'getHours',setKey:'setHours', value: 8};
        }
        case "12h":{
            return { getKey:'getHours',setKey:'setHours', value: 12};
        }
        case "15m":{
            return {getKey: 'getMinutes', setKey: 'setMinutes', value: 15};
        }
        case "30m":{
            return {getKey: 'getMinutes', setKey: 'setMinutes', value: 30};
        }
        default :{
            return { getKey:'getHours',setKey:'setHours', value:4};
        }
    };
};

/**
 *
 * @param sellPrice {number} the sellPrice
 * @param profitTarget {number} the profit target in percentage
 * @returns {number} the short profit target for the trade
 */
module.exports.calculateShortProfitTarget=(sellPrice, profitTarget)=>{  return sellPrice-(sellPrice*profitTarget);}
/**
 *
 * @param buyPrice {number} the buy price
 * @param profitTarget the profit target in percentage
 * @returns {number} the long profit target for the trade
 */
module.exports.calculateLongProfitTarget =(buyPrice, profitTarget) =>{return buyPrice+(buyPrice*profitTarget);}
/**
 *
 * @param sellPrice {number} the sellPrice
 * @param stopTarget {number} the stop  target in percentage
 * @returns {number} the short stop loss target for the trade
 */
module.exports.calculateShortStopTarget = (sellPrice, stopTarget) =>{  return sellPrice+(sellPrice*stopTarget);}
/**
 *
 * @param buyPrice {number} the buy price
 * @param stopTarget the profit target in percentage
 * @returns {number} the long stop loss target for the trade
 */
module.exports.calculateLongStopTarget = (buyPrice, stopTarget) =>{return buyPrice-(buyPrice*stopTarget);}
