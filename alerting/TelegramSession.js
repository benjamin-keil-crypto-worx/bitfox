/**
 * Class TelegramSession
 <pre>
 * This class is just a support class to help out with managing Chat ID's
 * so that multiple users can receive Alerts and Notifications.
 </pre>
 */
class TelegramSession {

    /**
     *
     * @return {TelegramSession}
     */
    static factory(){ return new TelegramSession()}
    constructor(){
        this.sessions = [];
    }

    /**
     *
     * @param chatId {String} The Chat Id to add to the session instance
     */
    setSession(chatId) { this.getSession(chatId) ===undefined || this.getSession(chatId) === null ? this.sessions.push({chatId: chatId}) : null};

    /**
     *
     * @param chatId {String} The Chat Id to add to the session instance
     * @return {{chatId: String}}
     */
    getSession(chatId){ let id = chatId; return this.sessions.filter((session)=>{return( session.chatId===id)})[0]}
    updateSession(chatId){
        let indexOfSession = this.sessions.findIndex(x => x.chatId ===chatId);
        this.sessions[indexOfSession].chatId = chatId;
    }

    /**
     * @typedef {Object} session A Session objetc
     * @property {string} chatId The ChatId
     */
    /**
     *
     * @return [session]
     */
    getSessions(){ return this.sessions;}
    removeSession(chatId){
        this.sessions =  this.sessions.filter((session)=>{return( session.chatId!==chatId)});
    }
}

/**
 *
 * @type {{TelegramSession: TelegramSession}}
 */
module.exports = {TelegramSession:TelegramSession}
