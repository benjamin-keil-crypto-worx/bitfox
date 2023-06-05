const express = require("express");
const bodyParser = require("body-parser");
const uuid = require('uuid');
let {Log} = require("../lib/utility/Log")
let rpcHandler = require("./server-response");
let crypto = require("crypto");


const app = express();

/**
 * Class Server 
 * 
 * <pre>
 * This class is a standalone Express Server, 
 * that allows external systems to connect to BitFox and perform opeartions without relying on 
 * Bitfox Strategies, Some Trading platforms like TradingView for example allow users to connect to third party app and send out request
 * to an Application to for example execute a buy or Sell order.
 * 
 * The  Server provides the following below endpoints:
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
class Server {

    /**
     * 
     * @param {*} config - The Server Configuration
     * @returns  {Server} - A Server Instance
     */
    static getNode(config) {
        return new Server(config)
    }

    /**
     * 
     * @returns {string} The generted API Key for a given session
     */
    static createApiKey(  ){
        let id = crypto.randomBytes(32).toString('hex');
        return Buffer.from("x-session-id:"+id).toString('base64');
    }

    /**
     * 
     * @param {*} config 
     */
    constructor(config) {
        this.id = uuid.v4();
        this.port = config.port || 8080;
        this.address = config.address || "http://localhost";
        this.xSession = config.xApiKey || Buffer.from("x-session-id:"+this.id).toString('base64');
        this.requiredCredentials = config.requiredCredentials;
        this.log = Log;
    }


    /**
     * 
     * @returns {string} - Server Address and Port information
     */
    getAddressInfo() {
        let address = `${this.address}:${this.port}/bitfox`;
        return address;
    }

    /**
     * 
     * @param {object} req 
     * @returns {boolean} - check if the current user is authenticated i.e. has correct sesionId
     */
    isAuthenticated( req ){
        if( req && req.headers["xsession"]){
            return req.headers["xsession"] === this.xSession;
        }
        else{
            if (req && req.body && req.body.xSession){
                return  req.body.xSession === this.xSession;
            }
        }
        return false;
    }

    /**
     * 
     * @param {string} apiKey
     * 
     * @description - Starts the RPC Server  
     */
    async run(apiKey) {
        let me = this;
        let address = this.getAddressInfo();
        this.log.info(`Server running at: ${address}`);
        this.log.warn(`Your Login Api Key is: ${apiKey}`);
        console.log()
        app.use(bodyParser.json());

        app.post("/bitfox/ping", (req, res) => {
            try{
                res.json((this.isAuthenticated(req)) ? rpcHandler.ping() : {error:"Unauthorized", "code":401});
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
            
        });
        app.post("/bitfox/health", async (req, res) => {
            try{
                res.json((this.isAuthenticated(req)) ? await rpcHandler.health(this) : {error:"Unauthorized", "code":401});
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
        });

        app.post("/bitfox/ballance", async (req, res) => {
            try{
                res.json((this.isAuthenticated(req)) ? await rpcHandler.ballance(req, me.requiredCredentials) : {error:"Unauthorized", "code":401});
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
        });

        app.post("/bitfox/ticker", async (req, res) => {
            try{
                res.json((this.isAuthenticated(req)) ? await rpcHandler.ticker(req) : {error:"Unauthorized", "code":401});
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
        });

        app.post("/bitfox/orderbook", async (req, res) => {
            try{
                res.json((this.isAuthenticated(req)) ? await rpcHandler.orderBook(req) : {error:"Unauthorized", "code":401});
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
        });

        app.post("/bitfox/candles", async (req, res) => {
            try{
                res.json((this.isAuthenticated(req)) ? await rpcHandler.candles(req) : {error:"Unauthorized", "code":401});
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
        });

        app.post("/bitfox/buy", async (req, res) => {
            try{
                res.json((this.isAuthenticated(req)) ? await rpcHandler.buy(req, me.requiredCredentials) : {error:"Unauthorized", "code":401});
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
        });

        app.post("/bitfox/sell", async (req, res) => {
            try{
                res.json((this.isAuthenticated(req)) ? await rpcHandler.sell(req, me.requiredCredentials) : {error:"Unauthorized", "code":401});
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
        });

        app.post("/bitfox/shutdown", (req, res) => {
            try{
                if(this.isAuthenticated(req)){
                    res.json(rpcHandler.shutdown(req));
                    me.log.info(`Shutting Down Servers and closing ports!`)
                    setTimeout(()=>{
                        process.exit(0);
                    },2000)
                }else{
                    res.json({error:"Unauthorized", "code":401})
                }
            }catch (e){
                this.log.error(e)
                res.json({error:"Internal Sever Error", code:500})
            }
        });
        app.listen(me.port);
    }
}

module.exports = {Server: Server};

