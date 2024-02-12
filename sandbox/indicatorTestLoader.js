let {DataLoaderBuilder,Strategy,utils} = require("../engine/BitFox");



const runTest = async () =>{
    
    let dataLoader = DataLoaderBuilder()
    .setExchangeName("bybit")
    .setPollRate(10)
    .setRequiredCandles(200)
    .setStorage()
    .setSymbol("BTCUSDT")
    .setTimeFrame("5m")
    .setVerbose(false)
    .build();

    await dataLoader.setUpClient()
    let indicatorData = {}
    let data = await dataLoader.load();
    let { o,h,l,c,v, buffer } = utils.createIndicatorData(data)


    console.log(indicatorData);
}

runTest();

