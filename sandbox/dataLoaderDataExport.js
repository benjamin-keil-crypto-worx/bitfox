let {DataLoaderBuilder,Strategy,utils,getModels} = require("../engine/BitFox");
const fs = require('fs');

let dataLoader = DataLoaderBuilder()
    .setExchangeName("bybit")
    .setPollRate(100)
    .setRequiredCandles(200)
    .setStorage()
    .setSymbol("ADAUSDT")
    .setTimeFrame("5m")
    .setVerbose(false)
    .build();

let headers=  []
headers.push("open", "high", "low", "close", "volume", 
"priceChange",
"emaSlow",
"emaFast",
"smaSlow",
"smaFast",
"zmaSlow",
"zmaFast",
"rsi",
"atr",
"mfi",
"macd",
"macd_signal",
"macd_hist",
"boll_pb",
"boll_upper",
"boll_lower",
"boll_middle",
"adx",
"adx_pdi", 
"adx_mdi", 
"superTrend",
"stoch_k", 
"stoch_d", 
"vwap");

let csvBuff = [];
function calculatePriceChangePercentage(openPrice, closingPrice) {
    // Ensure the input prices are numeric
    openPrice = parseFloat(openPrice);
    closingPrice = parseFloat(closingPrice);
  
    // Calculate the price change percentage
    const priceChangePercentage = ((closingPrice - openPrice) / openPrice) * 100;
  
    return priceChangePercentage;
}
const exportData = async () =>{
    let indicatorData = {}
    await dataLoader.setUpClient();
    let data = await dataLoader.load();
    let { o,h,l,c,v, buffer } = utils.createIndicatorData(data)
    o.forEach((open, index)=>{
        Strategy.INDICATORS.PatternRecognitionIndicator.getPatterns().forEach( key => {
            if(key !== "getPatterns"){
                if(! indicatorData[key]){
                    indicatorData[key] = [];
                    headers.push(key);
                }
                let numOfCandles = utils.requiredCandlesForPattern()[key];
                if (numOfCandles !== undefined) {
                    if(numOfCandles > index){
                        indicatorData[key].push(false)
                    }else{
                        const lastIndex = index;
                        let pC =  c.slice(lastIndex - numOfCandles + 1, lastIndex + 1);
                        let pH =  h.slice(lastIndex - numOfCandles + 1, lastIndex + 1);
                        let pL =  l.slice(lastIndex - numOfCandles + 1, lastIndex + 1);
                        let pO =  o.slice(lastIndex - numOfCandles + 1, lastIndex + 1);
                        indicatorData[key].push(Strategy.INDICATORS.PatternRecognitionIndicator[key](pO,pH,pL,pC));
                    }
                }
            }
    });
    })
    
    let minDataLength = 100000;
    indicatorData["emaSlow"] = Strategy.INDICATORS["EMAIndicator"].getData(o,h,l,c,v,{period:200},buffer);
    indicatorData["emaFast"] = Strategy.INDICATORS["EMAIndicator"].getData(o,h,l,c,v,{period:55},buffer);
    indicatorData["smaSlow"] = Strategy.INDICATORS["SmaIndicator"].getData(o,h,l,c,v,{period:200},buffer);
    indicatorData["smaFast"] = Strategy.INDICATORS["SmaIndicator"].getData(o,h,l,c,v,{period:55},buffer);
    indicatorData["zmaSlow"] = Strategy.INDICATORS["ZEMAIndicator"].getData(o,h,l,c,v,{period:200},buffer);
    indicatorData["zmaFast"] = Strategy.INDICATORS["ZEMAIndicator"].getData(o,h,l,c,v,{period:55},buffer);
    indicatorData["rsi"] = Strategy.INDICATORS.RsiIndicator.getData(o,h,l,c,v,{},buffer);
    indicatorData["atr"] = Strategy.INDICATORS.AtrIndicator.getData(o,h,l,c,v,{},buffer);
    indicatorData["mfi"] = Strategy.INDICATORS.MfiIndicator.getData(o,h,l,c,v,{},buffer);
    indicatorData["macd"] = Strategy.INDICATORS.MacdIndicator.getData(o,h,l,c,v,{},buffer);
    indicatorData["boll"] = Strategy.INDICATORS.BollingerIndicator.getData(o,h,l,c,v,{},buffer);
    indicatorData["adx"] = Strategy.INDICATORS.AdxIndicator.getData(o,h,l,c,v,{},buffer);
    indicatorData["st"] = Strategy.INDICATORS.SuperTrendIndicator.getData(o,h,l,c,v,{},buffer);
    indicatorData["stoch"] = Strategy.INDICATORS.StochasticIndicator.getData(o,h,l,c,v,{},buffer);
    indicatorData["vwap"] = Strategy.INDICATORS.VolumeWeightedAvgPrice.getData(o,h,l,c,v,{},buffer);

    
    const padArray = (arr, targetLength) => {
        while (arr.length < targetLength) {
          arr.unshift(NaN);
        }
    };

    Object.keys(indicatorData).forEach((key)=>{
        let diff = o.length - indicatorData[key].length;
        if(diff > 0) {
            padArray(indicatorData[key], o.length)
        }
    });

    console.log(headers);
    // "open", "high", "low", "close", "volume", "emaSlow",
    // "emaFast",
    // "smaSlow",
    // "smaFast",
    // "zmaSlow",
    // "zmaFast",
    // "rsi",
    // "atr",
    // "mfi",
    // "macd",
    // "macd_signal",
    // "macd_hist",
    // "boll_pb",
    // "boll_upper",
    // "boll_lower",
    // "boll_middle",
    // "adx",
    // "adx_pdi", 
    // "adx_mdi", 
    // "superTrend",
    // "stoch_k", 
    // "stoch_d", 
    // "vwap");
    csvBuff.push(headers.join(","))
    o.forEach((open,index) => {
        // zma has the highest throw away or period so we use this 
        if(isNaN(indicatorData["zmaSlow"][index])){
            return;
        }
        let priceChange = calculatePriceChangePercentage(open,c[index]);
        csvBuff.push(`${open},${h[index]},${l[index]},${c[index]},${v[index]},${priceChange},${indicatorData["emaFast"][index]},${indicatorData["emaSlow"][index]},${indicatorData["smaFast"][index]},${indicatorData["smaSlow"][index]},${indicatorData["zmaFast"][index]},${indicatorData["zmaSlow"][index]},${indicatorData["rsi"][index]}, ${indicatorData["atr"][index]},${indicatorData["mfi"][index]}, ${indicatorData["macd"][index].MACD},${indicatorData["macd"][index].signal}, ${indicatorData["macd"][index].histogram},${indicatorData["boll"][index].pb},${indicatorData["boll"][index].upper},${indicatorData["boll"][index].lower},${indicatorData["boll"][index].middle},${indicatorData["adx"][index].adx},${indicatorData["adx"][index].pdi},${indicatorData["adx"][index].mdi},${indicatorData["st"][index].trend},${indicatorData["stoch"][index].k},${indicatorData["stoch"][index].d},${indicatorData["vwap"][index]},${indicatorData['AbandonedBaby'][index]},${indicatorData['BearishEngulfingPattern'][index]},${indicatorData['BullishEngulfingPattern'][index]},${indicatorData['DarkCloudCover'][index]},${indicatorData['DownsideTasukiGap'][index]},${indicatorData['Doji'][index]},${indicatorData['DragonFlyDoji'][index]},${indicatorData['GraveStoneDoji'][index]},${indicatorData['BullishHarami'][index]},${indicatorData['BearishHaramiCross'][index]},${indicatorData['BullishHaramiCross'][index]},${indicatorData['BullishMarubozu'][index]},${indicatorData['BearishMarubozu'][index]},${indicatorData['EveningDojiStar'][index]},${indicatorData['EveningStar'][index]},${indicatorData['BearishHarami'][index]},${indicatorData['PiercingLine'][index]},${indicatorData['BullishSpinningTop'][index]},${indicatorData['BearishSpinningTop'][index]},${indicatorData['MorningDojiStar'][index]},${indicatorData['MorningStar'][index]},${indicatorData['ThreeBlackCrows'][index]},${indicatorData['ThreeWhiteSoldiers'][index]},${indicatorData['BullishHammer'][index]},${indicatorData['BearishHammer'][index]},${indicatorData['BullishInvertedHammer'][index]},${indicatorData['BearishInvertedHammer'][index]},${indicatorData['HammerPattern'][index]},${indicatorData['HammerPatternUnconfirmed'][index]},${indicatorData['HangingMan'][index]},${indicatorData['HangingManUnconfirmed'][index]},${indicatorData['ShootingStar'][index]},${indicatorData['ShootingStarUnconfirmed'][index]},${indicatorData['TweezerTop'][index]},${indicatorData['TweezerBottom'][index]}`);
    });


    // Sample large data (you might have your own way of generating or getting this data)
    const largeData = csvBuff.join("\n");  // Replace this with your actual large data

    // Create a writable stream
    const writeStream = fs.createWriteStream('testSet.csv');

    // Write the data to the file using the stream
    writeStream.write(largeData, 'utf-8');

    // Listen for the 'finish' event to know when the writing is complete
    writeStream.on('finish', () => {
    console.log('Write operation complete.');
    });
}
    
exportData();
