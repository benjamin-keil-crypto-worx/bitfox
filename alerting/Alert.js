const utils = require("../lib/utility/util");
const {Email} = require("./Email");
const {Slack} = require("./Slack");
const {Telegram} = require("./Telegram");
const {State} = require("../lib/states/States");
const Indicators = require("../lib/indicators/Indicators")

class Alert {
    constructor(args=null){

        this.args = args;
        this.email = null;
        this.telegramBot = null;
        this.slack = null;
        this.states =  State;
        this.getNotificationInstance(args.type);

    }

    getNotificationInstance(type){
        switch ( type.toLowerCase()) {
            case "email":{this.email = Email.factory() }break;
            case "slack":{this.slack =  Slack.factory(this.args)}break;
            case "telegram":{global.tb = (global.tb === undefined) ? Telegram.factory(this.args) : global.tb; this.telegramBot = global.tb}break;
        }
    }

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
    setState(state){ this.state = state; }

    setIndicator(klineCandles, args, target){
        let { o,h,l,c,v, buffer } = utils.createIndicatorData(klineCandles)
        this.indicator = Indicators[target].getData(o,h,l,c,v,args,buffer);
        this.kline = { o,h,l,c,v, buffer };
    }
    getIndicator(){
        return this.indicator;
    }


    hasValidArgs(args,list){
        return utils.validateRequiredArgs(args,list);
    }
}

module.exports = {Alert:Alert}
