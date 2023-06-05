const axios = require("axios");
const axiosConf = require("./config")

/**
 * Class Client 
 * 
 * <pre>
 * This class is a HTTP request Client based on axios, 
 * It allows for simple setup and and API Usage against the following  endpoints:
 * 
 * 
    /ping        "Ping the server to see if it online",
    /health      "Simple Health check",
    /getballance "Returns available ballance on target exchange",
    /ticker      "Returns the current Ticker information of selected Currency Pair",
    /orderbook   "Returns the Current Order Book for a given Currency Pair",
    /candles     "Returns Historical Candle data from exchange for given  trading pair",
    /buy         "Execute a Market buy order ",
    /sell        "Execute a market Sell order",
    /shutdown    "Emergency Shut Down" 
 * 
 * </pre>
 */
class Client {
    static PING =       "bitfox/ping"
    static HEALTH =     "bitfox/health"
    static BALLANCE =   "bitfox/ballance";
    static TICKER =     "bitfox/ticker";
    static ORDER_BOOK = "bitfox/orderbook";
    static CANDLES =    "bitfox/candles";
    static BUY =        "bitfox/buy";
    static SELL =       "bitfox/sell";
    static SHUTDOWN =   "bitfox/shutdown";


    static getInstance(options ={}) {
        return new Client(options)
    }

    /**
     * 
     * @param {exchangeOptions} options - The Request and Exchange Configuration options 
     */
    constructor(options ={}) {
        this.config = axiosConf.getConfig();
        this.life = options.life || false;
        this.public = options.public || true;
        this.exchangeName = options.exchangeName || null;
        this.symbol = options.symbol ||  null;
        this.amount = 0;
        this.timeframe = options.timeframe || null;
        this.options = options.options || { 'defaultType': 'spot', 'adjustForTimeDifference': true, 'recvWindow': 7000 }
        this.url = options.url || "http://localhost";
        this.port = options.port || 8080;
        this.xSession = options.xSession || null;
    }

    /**
     * 
     * @param {boolean} life - flag to tell the API server instance if the Request should be excuted life against an exchange
     * @returns {Client} - The Client Instance
     */
    setLife(life) { this.life = life; return this; }
    
    /**
     * 
     * @param {boolean} isPublic  - flag to tell the API server should the Server use public or private exchange API's
     * @returns {Client} - The Request Client Instance
     */
    setPublic(isPublic) { this.public = isPublic; return this; }

    /**
     * 
     * @param {string} exchangeName - The Target Exchange Name
     * @returns {Client} - The Request Client Instance
     */
    setExchangeName(exchangeName) { this.exchangeName = exchangeName; return this; }
    
    /**
     * 
     * @param {string} symbol -the trading pair Symbol
     * @returns {Client} - The Request Client Instance
     */
    setSymbol(symbol) { this.symbol = symbol; return this; }
    
    /**
     * 
     * @param {number} amount - The amount to use for Buy/Sell Api requests
     * @returns {Client} - The Request Client Instance
     */
    setAmount(amount) { this.amount = amount; return this; }
    
    /**
     * 
     * @param {string} timeframe - The timeframe to use for Historical Candle Data 
     * @returns {Client} - The Request Client Instance
     */
    setTimeFrame(timeframe) { this.timeframe = timeframe; return this; }
    
    /**
     * 
     * @param {object} options - The Exchange Htppt request Options Not recomended to change this use default
     * @returns {Client} - The Request Client Instance
     */
    setOptions(options) { this.options = options; return this; }
    
    /**
     * 
     * @param {string} url - The Target or Server Address where the BitFox Server is running on!
     * @returns {Client} - The Request Client Instance
     */
    setUrl(url) { this.url = url; return this; }
    
    /**
     * 
     * @param {number} port - The Target or Server Port where the BitFox Server is running on! 
     * @returns {Client} - The Request Client Instance
     */
    setPort(port) { this.port = port; return this; }

    /**
     * 
     * @param {string} xSession - The Current generated Session token given by the Target Server Startup message 
     * @returns {Client} - The Request Client Instance
     */
    setXsession(xSession) { this.xSession = xSession; return this; }

    /**
     * 
     * @param {string} endpoint - The target Endpoint  
     */
    buildRequest(endpoint){
        this.config.url = endpoint;
        this.config.baseUrl = `${this.url}:${this.port}`;
        this.config.headers = {'xSession':this.xSession};
        this.config.method = "post";
        this.config.data = {
                exchangeName:this.exchangeName,
                life:this.life,
                public:this.public,
                symbol:this.symbol,
                amount:this.amount,
                timeframe:this.timeframe,
                options:this.options
        }
    }


    /**
     * 
     * @param {*} endpoint - The Target endpoint 
     * @returns {object} - The Response from API 
     */
    async request(endpoint){
        this.buildRequest(endpoint)
        try{
            return await axios.post(`${this.config.baseUrl}/${endpoint}`, this.config.data, { headers: this.config.headers })
        }catch(error){
            console.log(error)
        }
        
    }

    /**
     * 
     * @returns @returns {object} - The /ping Response from API 
     */
    async ping() {
        return await this.request(Client.PING)        
    }

    /**
     * 
     * @returns @returns {object} - The /health Response from API 
     */
    async health() {
        return await this.request(Client.HEALTH)  
    }

    /**
     * 
     * @returns @returns {object} - The /getBallance Response from API 
     */
    async getballance() {
        return await this.request(Client.BALLANCE)  
    }

    /**
     * 
     * @returns @returns {object} - The /ticker Response from API 
     */
    async ticker() {
        return await this.request(Client.TICKER)  
    }

    /**
     * 
     * @returns @returns {object} - The /orderBook Response from API 
     */
    async orderbook() {
        return await this.request(Client.ORDER_BOOK)  
    }

    /**
     * 
     * @returns @returns {object} - The /candles Response from API 
     */
    async candles() {
        return await this.request(Client.CANDLES)  
    }

    /**
     * 
     * @returns @returns {object} - The /buy Response from API 
     */
    async buy() {
        return await this.request(Client.BUY)  
    }

    /**
     * 
     * @returns @returns {object} - The /sell Response from API 
     */
    async sell() {
        return await this.request(Client.SELL)  
    }

    /**
     * 
     * @returns @returns {object} - The /shutdown Response from API 
     */
    async shutdown() {
        return await this.request(Client.SHUTDOWN)  
    }
}

module.exports = { Client: Client };
