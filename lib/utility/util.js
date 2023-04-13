const SECRET = "8b6e4a97-bfe5-43b4-bdf0-cbad4fa7261c" || process.env.SECRET;// just for offline operations
let uuid = require("uuid4");
const crypto = require('crypto');
let { Candlesticks } = require("../model/Candlesticks");


module.exports.min = (arr) =>{
    return Math.min.apply( Math, arr );
}

module.exports.max = (arr) =>{
    return Math.max.apply( Math, arr );
}

Date.prototype.getUnixTime = function () {
    return this.getTime() / 1000 | 0
};
const reverseBuffer =( data ) =>{
    let buffer = [];
    let len = data.length - 1;
    for (let i = len; i >= 0; i--) {
        buffer.push(data[i])
    }
    return buffer;
};
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

module.exports.validateRequiredArgs = (args, requiredList) =>{
    return requiredList.every(item => args.hasOwnProperty(item))

}
module.exports.average = (array)=>{
    return array.reduce((a, b) => a + b) / array.length;
}

module.exports.priceInLongProfitRange = (high,pt)=>{
    return high>=pt;
}

module.exports.priceInShortProfitRange = (low,pt)=>{
    return low<=pt;
}

module.exports.priceInShortStopRange = (high,st)=>{
    return high>st;
}

module.exports.priceInLongStopRange = (low,st)=>{
    return low<st;
}
module.exports.reverseData = (data) => {
    return reverseBuffer(data)
};

const getCloses = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.c))
    });
    return buffer;
};
const getHighs = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.h))
    });
    return buffer;
};
const getLows = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.l))
    });
    return buffer;
};
const getOpens = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.o))
    });
    return buffer;
};
const getVolumes = (candles)=>{
    let buffer = [];
    candles.forEach((candle) => {
        buffer.push(Number(candle.v))
    });
    return buffer;
};

module.exports.closes = (candles) => {return getCloses(candles);};
module.exports.highs = (candles)  => {return getHighs( candles)};
module.exports.lows = (candles)   => {return getLows(candles)};
module.exports.open = (candles)   => {return getOpens(candles)};
module.exports.volume = (candles) => {return getVolumes(candles)};

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
module.exports.getUuid = () =>{ return uuid()};
module.exports.addDays = (date, days) => {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

module.exports.generateAPIKey = () => {
    let randomData = `${new Date().toISOString()}${uuid()}`
    return crypto.createHmac('sha512', process.env.SECRET || SECRET)
        .update(randomData)
        .digest('base64');
};

module.exports.sha256 = (data) => {
    return crypto.createHmac('sha256', process.env.SECRET || SECRET)
        .update(data)
        .digest('hex');
};

module.exports.convertOHCVToTWArgs = (o,h,l,c,v ) =>{
    let buffer = [];
    c.forEach((entry, index) => {
        buffer.push( {c:entry, o:o[index], l:l[index], h:h[index],v:v[index]} );
    });
    return buffer;
};

module.exports.deepCopy = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

module.exports.sleepy = (timeout = null) => {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve(false);
        }, timeout || 500)
    })
};

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

module.exports.calculateShortProfitTarget=(sellPrice, profitTarget)=>{  return sellPrice-(sellPrice*profitTarget);}
module.exports.calculateLongProfitTarget =(buyPrice, profitTarget) =>{return buyPrice+(buyPrice*profitTarget);}
module.exports.calculateShortStopTarget = (sellPrice, stopTarget) =>{  return sellPrice+(sellPrice*stopTarget);}
module.exports.calculateLongStopTarget = (buyPrice, stopTarget) =>{return buyPrice-(buyPrice*stopTarget);}
