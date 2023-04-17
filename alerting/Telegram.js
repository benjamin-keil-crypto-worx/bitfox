const TelegramBot = require('node-telegram-bot-api');
const {TelegramSession} = require('./TelegramSession');

/**
 * Class Telegram
 <pre>
 * This class is the Telegram Bot Client
 In Order to for to leverage Telegram Notifications you need to go through a few simple steps

 1. Create a Bot with Bot Father
 2. Take Note of the API token
 3. Retrieve your session or Chat ID.

 To Create a Bot with BotFather visit this link:https://blog.devgenius.io/how-to-set-up-your-telegram-bot-using-botfather-fd1896d68c02

 Follow the Instructions and once you have created a bot all you need to do, is start your alerting bot with BitFox,
 and open your newly created Bot on Telegram and enter ``/start`` In the chat box.

 This will Create an internal Chat ID on the Bot side and the bot will start sending Notifications to your Chat!
 </pre>
 *
 */
class Telegram{

    /**
     * @typedef {Object} args The Arguments to the Telegram Client
     * @property {String} token The Telegram Bot Authentication Token
     * @property {String} chatId The Telegram Bot ChatId (optional)
      */
    /**
     *
     * @param args
     * @return {Telegram}
     */
    static factory(args) {
        return new Telegram(args)
    }

    /**
     *
     * @param args the Arguments to the Telegram Client
     */
    constructor(args) {
        this.bot = new TelegramBot(args.token, {polling: true});
        this.session = TelegramSession.factory();
        if(args.chatId){
            this.session.setSession(args.chatId);
        }
        this.setOnMessageEventHandler();
    }

    /**
     * Method to make sure we can consume inbound requests from the TelegramBot
     */
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

    /**
     *
     * @param message {String} sends out the message to the Telegram owner
     * @return {Promise<void>}
     */
    async notify( message) {
        let me = this;
        let sessions = this.session.getSessions();
        sessions.forEach(session =>{
            me.bot.sendMessage(session.chatId, message);
        })
    }
}

/**
 *
 * @type {{Telegram: Telegram}}
 */
module.exports = {Telegram:Telegram}
