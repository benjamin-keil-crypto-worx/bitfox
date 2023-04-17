const utils = require("../lib/utility/util");
const {Email} = require("./Email");
const {Slack} = require("./Slack");
const {Telegram} = require("./Telegram");
const {State} = require("../lib/states/States");
const Indicators = require("../lib/indicators/Indicators")

/**
 * Class Alert
 <pre>
 * This Class is the Factory Class for Email,Telegram & Slack Notification Instances
 * It also acts as the base Class for all Alerting instances that can be executed just like Strategies
 </pre>
 */
class Alert {

    /**
     * @param args {any} Alert Specific arguments for set up
     */
    constructor(args=null){

        this.args = args;
        this.email = null;
        this.telegramBot = null;
        this.slack = null;
        this.states =  State;
        this.getNotificationInstance(args.type);

    }

    /**
     *
     * @param type {String} Returns a Alert ing instance based on the type provided
     */
    getNotificationInstance(type){
        switch ( type.toLowerCase()) {
            case "email":{this.email = Email.factory() }break;
            case "slack":{this.slack =  Slack.factory(this.args)}break;
            case "telegram":{global.tb = (global.tb === undefined) ? Telegram.factory(this.args) : global.tb; this.telegramBot = global.tb}break;
        }
    }

    /**
     *
     * @param args {any} Alert Specific arguments for set up
     * @param message {String} the message to send
     * @return {Promise<void>}
     */
    async notify(args, message){
        switch (this.args.type.toLowerCase()) {
            case "email":{
                this.email.setOptions(this.args);
                this.email.createMessage(this.args,message);
                await this.email.notify();
            }break;
            case "slack":{await this.slack.notify(this.args,message);}break;
            case "telegram":{await this.telegramBot.notify(message);}break;
        }
    }

    /**
     *
     * @param state {String} sets the state of this Alert instance
     */
    setState(state){ this.state = state; }

    /**
     *
     * @param klineCandles {Array<Array<Number>>}
     * @param args {any} Indicator related custom parameters that you can supply
     * @param target {String} the class name of the Indicator we wan to use
     */
    setIndicator(klineCandles, args, target){
        let { o,h,l,c,v, buffer } = utils.createIndicatorData(klineCandles)
        this.indicator = Indicators[target].getData(o,h,l,c,v,args,buffer);
        this.kline = { o,h,l,c,v, buffer };
    }

    /**
     *
     * @return {any} returns an indicator instance with initialized data
     */
    getIndicator(){
        return this.indicator;
    }

    /**
     *
     * @param args {any} an object with Strategy required arguments
     * @param list {Array<String>} a list of keys to verify that the args instance has these keys
     * @return {Boolean}
     */
    hasValidArgs(args,list){
        return utils.validateRequiredArgs(args,list);
    }
}

module.exports = {Alert:Alert}
