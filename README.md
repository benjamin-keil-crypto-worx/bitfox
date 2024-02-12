<p align="center"><a href="https://www.freepnglogos.com/pics/fox-logo-png" title="Image from freepnglogos.com"><img src="https://www.freepnglogos.com/uploads/fox-png-23.png" width="200" alt="fox png" /></a></p>

<h1 align="center"> BitFox  </h1>
<p align="center">
    <a href="https://www.npmjs.com/package/bitfox">
       <img alt="version" src="https://img.shields.io/npm/v/bitfox.svg?maxAge=2592000"/>
       <img alt="download" src="https://img.shields.io/npm/dt/bitfox.svg?maxAge=2592000"/>
    </a>
</p>


<p align="center"> Multi Exchange Crypto Currency Trading Bot <br />&<br /> Data Analysis Library and Strategy Back testing Engine </p>
<p align="center"></p>
<hr/>

<p>
BitFox is a comprehensive multi-exchange trading bot library and data analysis tool, with a powerful strategy back testing engine. 
It provides quick access to market data for storage, analysis, visualization, indicator development, algorithmic trading, strategy backtesting, bot programming, and related software engineering.

It is intended to be used by coders, developers, technically-skilled traders, data-scientists and financial analysts for building trading algorithms.
</p>

**Warning**

<p>
This application is under heavy development and in beta nothing has been tested. 
Use this tool and library at your own risk!
</p>
<h2>Support BitFox Development </h2>
<code><span style="color:black">Bitcoin address: </span><span style="color:darkorange"> bc1qs6rvwnx0wlrqlncm90kk7mu0xs6980t85avfll</span></code>


<h3> Current feature list:
</h3>

<ul>
  <li>support for many cryptocurrency exchanges</li>
  <li>fully implemented public and private APIs</li>
  <li>Integrated BackTesting Engine</li>
  <li>Flexible Event Handling</li>
  <li>Real Time Trade & Strategy Execution</li>
  <li>Data Analysis & Optimization</li>
  <li>Email Notifications</li>
  <li>Slack Notifications</li>
  <li>Telegram Notifications</li>
</ul>

<h3> Documentation </h3>

[BitFox Documentation](https://benjamin-keil-crypto-worx.github.io/bitfox-wiki/#/)

<h3> Installation </h3>

```shell
$ npm i bitfox@latest
$ npm install -g bitfox@latest
```

<h3> Quick Start </h3>

```js
let {BitFoxEngine, Strategy, SuperTrend, builder} = require("bitfox").bitfox;



(async  () =>{
    
    // Initialize the Engine
    let engine = builder()
        .requiredCandles(200)
        .sidePreference("long")
        .backtest(true)
        .pollRate(10)
        .public(true)
        .exchange("bybit")
        .symbol("ADAUSDT")
        .timeframe("15m")
        .amount(100)
        .profitPct(1.03)
        .stopLossPct(0.98)
        //.fee(1.01)
        .key("FAKE_KEY")
        .secret("FAKE_SECRET")
        .life(false)
        .interval(10)
        .build(); 
    
    // Set up the Exchage Client
    await engine.setupAndLoadClient()
    
    // Leverage A Strategy from BitFoxes strategy repository
    engine.applyStrategy(SuperTrend)
    // or Alternatively 
    let bitfox = require("bitfox");
    engine.applyStrategy(bitfox.SuperTrend)
    
    
    // Set Up Event Handlers 
    engine.on('onStrategyResponse', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onMessage', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onError', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onOrderPlaced', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onOrderFilled', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onTradeComplete', (eventArgs) => {
        console.log(eventArgs)
    });
    engine.on('onStopLossTriggered', (eventArgs) => {
        console.log(eventArgs)
    });
    // SetUp Custom Event Handler (You need to fire the event yourself BitFox doesn't know about your Custom Event")
    engine.on('MyCustomEvent', (eventArgs) => {
        console.log(eventArgs)
    });
    
    // You could get the Event handler and fire an event by using below code
    engine.getEventEmitter().fireEvent("MyCustomEvent", {customEventData:"YourCustomEventData"})
    
    // Start The BitFox Engine
    await engine.run();
})();
```
