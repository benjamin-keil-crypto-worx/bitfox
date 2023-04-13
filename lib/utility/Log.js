let colors = require("colors")
class Log{
    static sanitize( msg){
        if (msg instanceof String){ return msg}
        if (msg instanceof Number){ return msg.toString()}
        if( msg instanceof Error){
            let buffer =[];
            buffer.push(msg.name || "");
            buffer.push(msg.message || "");
            buffer.push(msg.stack || "");
            return JSON.stringify(buffer);
        }
        return JSON.stringify( msg );
    }
    static info( msg ){console.log(`${"[INFO]".gray} ${this.sanitize(msg).cyan}`);}
    static warn( msg ){console.log(`${"[WARN]".gray} ${this.sanitize(msg).yellow}`);}
    static error( msg ){console.log(`${"[ERROR]".gray} ${this.sanitize(msg).red}`);}
    static debug( msg ){console.log(`${"[DEBUG]".gray} ${this.sanitize(msg).green}`);}
    static log( msg ){console.log(`${"[INFO]".gray} ${this.sanitize(msg).white}`);}
    static long( msg ){console.log(`${"[Long]".gray} ${this.sanitize(msg).green}`);}
    static short( msg ){console.log(`${"[Short]".gray} ${this.sanitize(msg).red}`);}
}

module.exports = {Log:Log};
