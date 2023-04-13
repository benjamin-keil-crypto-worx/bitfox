class TelegramSession {

    static factory(){ return new TelegramSession()}
    constructor(){
        this.sessions = [];
    }

    setSession(chatId) { this.getSession(chatId) ===undefined || this.getSession(chatId) === null ? this.sessions.push({chatId: chatId}) : null};
    getSession(chatId){ let id = chatId; return this.sessions.filter((session)=>{return( session.chatId===id)})[0]}
    updateSession(chatId){
        let indexOfSession = this.sessions.findIndex(x => x.chatId ===chatId);
        this.sessions[indexOfSession].chatId = chatId;
    }
    getSessions(){ return this.sessions;}
    removeSession(chatId){
        this.sessions =  this.sessions.filter((session)=>{return( session.chatId!==chatId)});
    }
}

module.exports = {TelegramSession:TelegramSession}
