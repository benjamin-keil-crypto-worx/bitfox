let {DataLoaderBuilder,Strategy,utils,getModels} = require("../engine/BitFox");

let{ Point, Edge, IndicatorConvergence} = getModels;

const profitTargetPct = 0.003
const stopLossPct = 0.002

const longExitCallback = (entryPrice, currentPrice, profitTargetPct, stopLossPct=null) =>{
    let data = {};
    data.side = 'long'
    data.isInProfit = currentPrice > utils.calculateLongProfitTarget(entryPrice,profitTargetPct);
    data.isStopped = (stopLossPct=== null) ? false : currentPrice < utils.calculateLongStopTarget(entryPrice,stopLossPct);
    return data;
}
const shortExitCallback = (entryPrice, currentPrice, profitTargetPct, stopLossPct=null) =>{
    let data = {};
    data.side = 'short'
    data.isInProfit = currentPrice < utils.calculateShortProfitTarget(entryPrice,profitTargetPct);
    data.isStopped = (stopLossPct=== null) ? false : currentPrice > utils.calculateShortStopTarget(entryPrice,stopLossPct);
    return data;
}
function checkProfitStatus(waitFor, pointA, buffer, i) {
    return waitFor(pointA.getX(), buffer[i][2], profitTargetPct, stopLossPct).isInProfit ||
        waitFor(pointA.getX(), buffer[i][3], profitTargetPct, stopLossPct).isStopped;
}

function getExitPoint(pointB, buffer, i) {
    pointB = Point.getInstance();
    pointB.setX(buffer[i][4]);
    pointB.setY(new Date(buffer[i][0]));
    pointB.setIndex(i);
    return pointB;
}

function getEntryPoint(pointA, buffer, i) {
    pointA = Point.getInstance();
    pointA.setX(buffer[i][4]);
    pointA.setY(new Date(buffer[i][0]));
    pointA.setIndex(i);
    return pointA;
}

let dataLoader = DataLoaderBuilder()
    .setExchangeName("bybit")
    .setPollRate(10)
    .setRequiredCandles(200)
    .setStorage()
    .setSymbol("BTCUSDT")
    .setTimeFrame("5m")
    .setVerbose(false)
    .build();

let kline = null;


const createSuperTrendConvergence = (data, buffer, diff) =>{
    let trendSet = null;
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    for( let i =diff; i < data.length; i++){
        
        if(i === diff && isRefresh){
            trendSet = data[i].trend;
            pointA = getEntryPoint(pointA, buffer, i);     
            isRefresh = false;
        }
        if(data[i].trend !== trendSet){
            pointB = getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(`SuperTrend::${data[i].trend}`);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index)
            trendSet = data[i].trend;
            convBuffer.push(convergence);

            isRefresh = true;
        }
    }
    return convBuffer;
}

function isExit(isRefresh, waitFor, pointA, buffer, i) {
    return !isRefresh && checkProfitStatus(waitFor, pointA, buffer, i);
}

const createRsiConvergence        = (data, buffer, diff) =>{
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    let lastRSI =50;
    let waitFor=null;
    let context = "";
    for( let i =diff; i < data.length; i++){
        lastRSI = data[i]
        if((lastRSI < 30 || lastRSI > 70) && isRefresh){
            context = "RSI"+(lastRSI < 30 ?"::Long" : "::Short")
            waitFor = (lastRSI < 30) ? longExitCallback : shortExitCallback
            pointA=  getEntryPoint(pointA, buffer, i);
            isRefresh = false;
        }
        if(isExit(isRefresh, waitFor, pointA, buffer, i)){
            pointB = getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(context);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index)
            convergence.setStopped(waitFor(pointA.getX(), buffer[i][4], profitTargetPct, stopLossPct).isStopped);
            convBuffer.push(convergence);
            isRefresh = true;
        }
    }
    return convBuffer;
}
const createAtrConvergence        = (data, buffer, diff) =>{

}
const createBollingerConvergence  = (data, buffer, diff) =>{
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    let lastBoll =null;
    let waitFor=null;
    let context = "";
    const isBullish =(lastBoll, currentPrice)=>{
        let {lower} = lastBoll
        return currentPrice <= lower;
    }
    const isBearish =(lastBoll,currentPrice)=>{
        let {upper} = lastBoll
        return currentPrice >= upper;
    }
    
    for( let i =diff; i < data.length; i++){
        lastBoll = data[i]
        if((isBearish(lastBoll,buffer[i][2]) || isBullish(lastBoll,buffer[i][2])) && isRefresh){
            context = "Bollinger"+( isBullish(lastBoll,buffer[i][2]) ? "::Long" : "::Short")
            waitFor = isBullish(lastBoll,buffer[i][2]) ?  longExitCallback : shortExitCallback
            pointA=  getEntryPoint(pointA, buffer, i);   
            isRefresh = false;
        }
        if(isExit(isRefresh, waitFor, pointA, buffer, i)){
            pointB=  getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(context);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index)
            convergence.setStopped(waitFor(pointA.getX(), buffer[i][4], profitTargetPct, stopLossPct).isStopped);
            convBuffer.push(convergence);
            isRefresh = true;
        }
    }
    return convBuffer;
}
const createMfiConvergence        = (data, buffer, diff) =>{
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    let lastMFI =50;
    let waitFor=null;
    let context = "";
    for( let i =diff; i < data.length; i++){
        lastMFI = data[i]
        if((lastMFI < 20 || lastMFI > 80) && isRefresh){
            context = "MFI"+(lastMFI < 20 ?"::Long" : "::Short")
            waitFor = (lastMFI < 30) ? longExitCallback : shortExitCallback
            pointA= getEntryPoint(pointA, buffer, i);   
            isRefresh = false;
        }
        if(isExit(isRefresh, waitFor, pointA, buffer, i)){
            pointB=  getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(context);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index) ;
            convergence.setStopped(waitFor(pointA.getX(), buffer[i][4], profitTargetPct, stopLossPct).isStopped);

            convBuffer.push(convergence);
            isRefresh = true;
        }
    }
    return convBuffer;
}
const createStochConvergence      = (data, buffer, diff) =>{
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    let lastStock ={k:50,d:50};
    let waitFor=null;
    let context = "";
    const isBullish =(lastStoch)=>{
        let {k,d} = lastStoch
        return k < 2 && d < 2 && ( k>d)
    }
    const isBearish =(lastStoch)=>{
        let {k,d} = lastStoch
        return k >70 && d > 70 && (k < d)
    }
    
    for( let i =diff; i < data.length; i++){
        lastStock = data[i]
        if((isBearish(lastStock) || isBullish(lastStock)) && isRefresh){
            context = "Stoch"+( isBullish(lastStock) ? "::Long" : "::Short")
            waitFor = isBullish(lastStock) ?  longExitCallback : shortExitCallback
            pointA=  getEntryPoint(pointA, buffer, i);   
            isRefresh = false;
        }
        if(isExit(isRefresh, waitFor, pointA, buffer, i)){
            pointB=  getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(context);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index)
            convergence.setStopped(waitFor(pointA.getX(), buffer[i][4], profitTargetPct, stopLossPct).isStopped);
            convBuffer.push(convergence);
            isRefresh = true;
        }
    }
    return convBuffer;
}
const createEmaTrendConvergence   = (fast, slow,   buffer, diff) =>{
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    let lastFast = fast;
    let lastSlow = slow;
    let waitFor=null;
    let context = "";
    let AWAIT_CROSS_UP = false;
    let AWAIT_CROSS_DOWN = false;
    let lastEntry = "";
    
    const isCrossUp =(fast,slow)=>{
        return fast > slow;
    }
    const isCrossDown =(fast,slow)=>{
        return fast < slow;
    }
    
    for( let i =diff; i < slow.length; i++){
        lastFast = fast[i]
        lastSlow = slow[i]
        if(!AWAIT_CROSS_UP && !AWAIT_CROSS_DOWN){
            AWAIT_CROSS_UP   =  lastFast < lastSlow;
            AWAIT_CROSS_DOWN =  lastFast > lastSlow;
            continue;
        }
        if((isCrossUp(lastFast, lastSlow) || isCrossDown(lastFast,  lastSlow)) && isRefresh){
            context = "Stoch"+( isCrossUp(lastFast, lastSlow) ? "::Long" : "::Short")
            waitFor =isCrossUp(lastFast, lastSlow) ?  longExitCallback : shortExitCallback
            pointA=  getEntryPoint(pointA, buffer, i);   
            lastEntry = isCrossUp(lastFast,lastFast) ? "long" : 'short'
            isRefresh = false;
        }
        if(isExit(isRefresh, waitFor, pointA, buffer, i)){
            pointB=  getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(context);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index)
            convergence.setStopped(waitFor(pointA.getX(), buffer[i][4], profitTargetPct, stopLossPct).isStopped);
            convBuffer.push(convergence);
            AWAIT_CROSS_DOWN = false;
            AWAIT_CROSS_UP   = false;
            isRefresh = true;
        }
    }
    return convBuffer;
}

const createZemaCrossConvergence   = (fast, slow,   buffer, diff) =>{
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    let lastFast = fast;
    let lastSlow = slow;
    let waitFor=null;
    let context = "";
    let AWAIT_CROSS_UP = false;
    let AWAIT_CROSS_DOWN = false;
    let lastEntry = "";
    
    const isCrossUp =(fast,slow)=>{
        return fast > slow;
    }
    const isCrossDown =(fast,slow)=>{
        return fast < slow;
    }
    
    for( let i =diff; i < slow.length; i++){
        lastFast = fast[i]
        lastSlow = slow[i]
        if(!AWAIT_CROSS_UP && !AWAIT_CROSS_DOWN){
            AWAIT_CROSS_UP   =  lastFast < lastSlow;
            AWAIT_CROSS_DOWN =  lastFast > lastSlow;
            continue;
        }
        if((isCrossUp(lastFast, lastSlow) || isCrossDown(lastFast,  lastSlow)) && isRefresh){
            context = "ZEMA"+( isCrossUp(lastFast, lastSlow) ? "::Long" : "::Short")
            waitFor =isCrossUp(lastFast, lastSlow) ?  longExitCallback : shortExitCallback
            pointA=  getEntryPoint(pointA, buffer, i);   
            lastEntry = isCrossUp(lastFast,lastFast) ? "long" : 'short'
            isRefresh = false;
        }
        if(isExit(isRefresh, waitFor, pointA, buffer, i)){
            pointB=  getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(context);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index)
            convergence.setStopped(waitFor(pointA.getX(), buffer[i][4], profitTargetPct, stopLossPct).isStopped);
            convBuffer.push(convergence);
            AWAIT_CROSS_DOWN = false;
            AWAIT_CROSS_UP   = false;
            isRefresh = true;
        }
    }
    return convBuffer;
}

const createSmaTrendConvergence   = (fast, slow,   buffer, diff) =>{
    return createEmaTrendConvergence(fast, slow,   buffer, diff)
}

const createFloorConvergence      = (data, buffer, diff) =>{
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    let reloadPivots = true;
    let lastFloor =null;
    let waitFor=null;
    let context = "";
    const isBullish =(lastFloor, currentPrice)=>{
        let {s3} = lastFloor.floor
        return currentPrice <= s3;
    }
    const isBearish =(lastFloor,currentPrice)=>{
        let {r3} = lastFloor.floor
        return currentPrice >= r3;
    }
    
    for( let i =diff; i < data.length; i++){
        lastFloor =  lastFloor = reloadPivots ? data[i] : lastFloor;
        reloadPivots = false
        if((isBearish(lastFloor,buffer[i][2]) || isBullish(lastFloor,buffer[i][2])) && isRefresh){
            context = "FloorPivots"+( isBullish(lastFloor,buffer[i][2]) ? "::Long" : "::Short")
            waitFor = isBullish(lastFloor,buffer[i][2]) ?  longExitCallback : shortExitCallback
            pointA=  getEntryPoint(pointA, buffer, i);   
            isRefresh = false;
        }
        if(isExit(isRefresh, waitFor, pointA, buffer, i)){
            pointB=  getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(context);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index)
            convergence.setStopped(waitFor(pointA.getX(), buffer[i][4], profitTargetPct, stopLossPct).isStopped);
            convBuffer.push(convergence);
            reloadPivots = true;
            isRefresh = true;
        }
    }
    return convBuffer;
}
const createWoodiesConvergence    = (data, buffer, diff) =>{
    let convBuffer = [];
    let pointA = null;
    let pointB = null;
    let edge = null;
    let isRefresh = true;
    let lastFloor =null;
    let waitFor=null;
    let reloadPivots = true;
    let context = "";
    const isBullish =(lastFloor, currentPrice)=>{
        let {s2} = lastFloor.woodies
        return currentPrice <= s2;
    }
    const isBearish =(lastFloor,currentPrice)=>{
        let {r2} = lastFloor.woodies
        return currentPrice >= r2;
    }
    
    for( let i =diff; i < data.length; i++){
        lastFloor = reloadPivots ? data[i] : lastFloor;
        reloadPivots = false;
        if((isBearish(lastFloor,buffer[i][2]) || isBullish(lastFloor,buffer[i][2])) && isRefresh){
            context = "Woodies"+( isBullish(lastFloor,buffer[i][2]) ? "::Long" : "::Short")
            waitFor = isBullish(lastFloor,buffer[i][2]) ?  longExitCallback : shortExitCallback
            pointA=  getEntryPoint(pointA, buffer, i);   
            isRefresh = false;
        }
        if(isExit(isRefresh, waitFor, pointA, buffer, i)){
            pointB=  getExitPoint(pointB, buffer, i);
            edge = Edge.getInstance(pointA, pointB)   
            let convergence = IndicatorConvergence.getInstance(context);
            convergence.setEdge(edge) 
            convergence.setEdgeIndexes(pointA.getPoint().index, pointB.getPoint().index)
            convergence.setStopped(waitFor(pointA.getX(), buffer[i][4], profitTargetPct, stopLossPct).isStopped);
            convBuffer.push(convergence);
            reloadPivots = true;
            isRefresh = true;
        }
    }
    return convBuffer;
}


const test = async () =>{
    let indicators = ["SuperTrendIndicator",
    "RsiIndicator",
    "AtrIndicator",
    "BollingerIndicator",
    "MfiIndicator",
    "StochasticIndicator",
    "EMAIndicator",
    "SmaIndicator",
    "FloorPivots",
    "Woodies"];

    await dataLoader.setUpClient()
    let IndicatorConvergenceList = [];
    
    let indicatorData = {}
    let data = await dataLoader.load();
    let { o,h,l,c,v, buffer } = utils.createIndicatorData(data)
    // Strategy.INDICATORS.PatternRecognitionIndicator.getPatterns().forEach( key =>{
    //         if(key !== "getPatterns"){
    //             console.log(`Pattern ${key} `,indicatorData[key] = Strategy.INDICATORS.PatternRecognitionIndicator[key](o,h,l,c,v));
    //         }
    // });

    // indicatorData["emaSlow"] = Strategy.INDICATORS["EMAIndicator"].getData(o,h,l,c,v,{period:200},buffer);
    // indicatorData["emaFast"] = Strategy.INDICATORS["EMAIndicator"].getData(o,h,l,c,v,{period:55},buffer);
    // indicatorData["smaSlow"] = Strategy.INDICATORS["SmaIndicator"].getData(o,h,l,c,v,{period:200},buffer);
    // indicatorData["smaFast"] = Strategy.INDICATORS["SmaIndicator"].getData(o,h,l,c,v,{period:55},buffer);

    indicatorData["zmaSlow"] = Strategy.INDICATORS["ZEMAIndicator"].getData(o,h,l,c,v,{period:200},buffer);
    indicatorData["zmaFast"] = Strategy.INDICATORS["ZEMAIndicator"].getData(o,h,l,c,v,{period:55},buffer);
    //
    let min =  100000;
    Object.keys(indicatorData).forEach( key =>{
        if(indicatorData[key].length < min){ min = indicatorData[key].length}
    })
    //
    let diff = (buffer.length - min);
    let length = buffer.length;
    //
    // IndicatorConvergenceList.push(createSuperTrendConvergence(indicatorData["SuperTrendIndicator"],buffer,diff));
    // IndicatorConvergenceList.push(createRsiConvergence(indicatorData["RsiIndicator"],buffer,diff));
    // IndicatorConvergenceList.push(createBollingerConvergence(indicatorData["BollingerIndicator"],buffer,diff));
    // IndicatorConvergenceList.push(createMfiConvergence(indicatorData["MfiIndicator"],buffer,diff));
    // IndicatorConvergenceList.push(createStochConvergence(indicatorData["StochasticIndicator"],buffer,diff));
    // IndicatorConvergenceList.push(createEmaTrendConvergence(indicatorData["emaFast"],indicatorData["emaSlow"],buffer,diff));
    // IndicatorConvergenceList.push(createSmaTrendConvergence(indicatorData["smaFast"],indicatorData["smaSlow"],buffer,diff));
    // IndicatorConvergenceList.push(createFloorConvergence(indicatorData["FloorPivots"],buffer,diff));
    // IndicatorConvergenceList.push(createWoodiesConvergence(indicatorData["Woodies"],buffer,diff));
    IndicatorConvergenceList.push(createZemaCrossConvergence(indicatorData["zmaFast"],indicatorData["zmaSlow"],buffer,diff));
    //
    let obj = {};
    let barCount=[];
    IndicatorConvergenceList.forEach(convergence =>{
       let targetKey = convergence[0].getContext()
       obj[targetKey] = {
        stopped:0,
        wins:0,
        overall: convergence.length,
        winPct:0,
        avgBarCount:0,
       };
       convergence.forEach( entry =>{
           let inst = entry.toInstance();
           if(inst.isStopped){ obj[targetKey].stopped = obj[targetKey].stopped+1 }
           else{
            obj[targetKey].wins = obj[targetKey].wins + 1;
           }
           barCount.push((inst.index[1]-inst.index[0]))
       })
       obj[targetKey].winPct = (obj[targetKey].wins / obj[targetKey].overall) * 100;
       obj[targetKey].avgBarCount = utils.average(barCount);
    });
    
    console.log(JSON.stringify(obj,null,2));
}

test();


