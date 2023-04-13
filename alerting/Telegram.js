const TelegramBot = require('node-telegram-bot-api');
const {TelegramSession} = require('./TelegramSession');

class Telegram{
    static factory(args) {
        return new Telegram(args)
    }

    constructor(args) {
        this.bot = new TelegramBot(args.token, {polling: true});
        this.session = TelegramSession.factory();
        if(args.chatId){
            this.session.setSession(args.chatId);
        }
        this.setOnMessageEventHandler();
    }

    setOnMessageEventHandler() {
        let me = this;
        this.bot.on('error', (error) => {
            console.log(error)
        });
        this.bot.onText(/\/start/, async (msg, match) => {
             this.session.setSession(msg.chat.id);
             await me.bot.sendMessage(msg.chat.id, `Welcome to BotVox Notifications\nHere is your Chat ID:\n${msg.chat.id}\nYou are all setup to receive BotVox Notifications!`);
        });
    }

    async notify( message) {
        let me = this;
        let sessions = this.session.getSessions();
        sessions.forEach(session =>{
            me.bot.sendMessage(session.chatId, message);
        })
    }
}
module.exports = {Telegram:Telegram}
