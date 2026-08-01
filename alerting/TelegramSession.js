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
    static factory(allowedChatIds = []){ return new TelegramSession(allowedChatIds)}

    /**
     * @param allowedChatIds {Array<String>} when non-empty, only these chat ids may register.
     *                       Empty (the default) preserves the previous open behaviour.
     */
    constructor(allowedChatIds = []){
        this.sessions = [];
        this.allowedChatIds = (allowedChatIds || []).map(String).filter(Boolean);
    }

    /**
     * @param chatId {String} The Chat Id to test against the allowlist
     * @return {Boolean} whether this chat is permitted to register and receive notifications
     */
    isAllowed(chatId){
        return this.allowedChatIds.length === 0 || this.allowedChatIds.includes(String(chatId));
    }

    /**
     *
     * @param chatId {String} The Chat Id to add to the session instance
     * @return {Boolean} true when the session was registered, false when the allowlist rejected it
     */
    setSession(chatId) {
        // Previously ANY chat that sent /start registered itself and began receiving
        // notifications. With an allowlist configured, registration is now refused.
        if (!this.isAllowed(chatId)) return false;
        if (this.getSession(chatId) === undefined || this.getSession(chatId) === null) {
            this.sessions.push({chatId: chatId});
        }
        return true;
    };

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
