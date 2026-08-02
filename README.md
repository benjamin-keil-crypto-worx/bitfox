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

## 📊 Telegram signalling — the recommended way to use BitFox

Ask about a market and get indicator readings back. Read-only, and it **requires no exchange API credentials at all** — market data and backtests use public endpoints, so the bot cannot place an order.

```
node signal-bot.js
```

```
/trend ADAUSDT 15m
→ ADAUSDT 15m · 2026-08-01 20:30 UTC
  Price      0.1725
  EMA20     0.172802 (price -0.17%)
  EMA200    0.170411 (price +1.23%)
  Ribbon     20>50>100>200
  SuperTrend short @ 0.174200 (flipped 8 bars ago)
  ADX        16.19 (+DI 19.95 / −DI 22.10)
```

Commands: `/trend` `/momentum` `/levels` `/vol` `/signal` `/backtest` `/help`

**Output is descriptive, never prescriptive.** No buy/sell calls, no confidence scores, no green arrows. It reports what the indicators read; you decide what that means. This is enforced by a test, not a convention.

### `/backtest` — the part nobody else ships

```
/backtest BTCUSDT 15m SuperTrend
→ Window     500 days · 226 trades
  Profit factor 0.674
  Return     -77.5%
  ⚠ This strategy lost money over the tested window.
  Costs: 0.100% taker both legs + 0.050% slippage.
```

Every signal bot tells you a signal fired. This one tells you whether that signal historically made money — and warns you when the sample is too small to mean anything, which is the more common way a backtest misleads.

Configure with `TELEGRAM_BOT_TOKEN` and, recommended, `TELEGRAM_ALLOWED_CHAT_IDS`.

## On the bundled strategies

Be clear-eyed about what the evidence supports. Measured on the honest engine (realistic fills, aligned indicators, costs on), **13 of the 14 bundled strategies lose money after costs, and buy-and-hold beat all of them.** Only `DonchianTrend` has survived walk-forward validation, at 5 of 6 criteria.

The strategies are **reference implementations** — worked examples of the strategy contract, not a portfolio. Treat any of them as a money-maker only after running your own walk-forward validation.

Full verdicts, coverage matrix, and rejected approaches: [`.claude/context/STRATEGY-LEDGER.md`](.claude/context/STRATEGY-LEDGER.md).

Autonomous trading via `trade-live.js` still works and is fully supported — but the honest framing is that BitFox gives you an accurate measuring instrument and solid plumbing, not a validated edge.
<h2>Support BitFox Development </h2>
<code><span style="color:black">Bitcoin address: </span><span style="color:darkorange"> bc1qs6rvwnx0wlrqlncm90kk7mu0xs6980t85avfll</span></code>


<h3> Current feature list:
</h3>

<ul>
  <li>Read-only Telegram signalling layer (on-demand market analysis, no credentials needed)</li>
  <li>Honest backtesting on demand — reports losses and small samples instead of hiding them</li>
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

<h3> Docker Deployment </h3>

Deploy BitFox as a container in seconds — works with Portainer, Docker Compose, or plain Docker.

**Quick start with single bot:**

```bash
# 1. Set your API keys
cp docker/.env.example .env
nano .env        # fill in BYBIT_API_KEY and BYBIT_API_SECRET

# 2. Build and start
docker compose -f docker-compose.single.yml up -d

# 3. Watch logs
docker compose -f docker-compose.single.yml logs -f
```

**Multi-bot stack (Phoenix 1h + SuperTrend 15m):**

```bash
docker compose up -d
docker compose logs -f bitfox-phoenix
docker compose logs -f bitfox-supertrend
```

**Portainer:** Add Stack → paste `docker-compose.yml` contents → set the 4 required environment variables (`BYBIT_API_KEY`, `BYBIT_API_SECRET`, `SYMBOL`, `STRATEGY`).

| Strategy | Timeframe | Honest status |
|----------|-----------|---------------|
| **DonchianTrend** | **1d** | **Recommended.** The only strategy with a positive walk-forward out-of-sample result (pooled PF 1.456 over 334 trades). Daily breakout trend following with risk-based sizing |
| **Phoenix** | 1h+ | Reference implementation — no edge under realistic fills |
| **SuperTrend** | 15m | Reference implementation — no edge under realistic fills |
| **SuperTrendFull** | 15m-1h | Reference implementation — its old headline numbers were a backtest fill-model artifact |

Swap `STRATEGY` in the compose env vars or `.env` to switch. `DonchianTrend` requires `TIMEFRAME=1d`
and trades roughly 8–12 times per symbol per year — long quiet periods are expected. It clears five of
the six ship-bar criteria and fails one; read [BENCHMARKS.md](BENCHMARKS.md) for the numbers, the
failure, and why position sizing matters more than the signal.
