let colors = require("colors")

/**
 * Class Log
 *
 * This class is a Logger that provides a few static methods to format and print colorful log messages!
 */
class Log{

    /**
     *
     * @param msg {String} the String to sanitize
     * @returns {String} the sanitized message
     */
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

    /**
     *
     * @param msg {any} Log Content
     */
    static info( msg ){console.log(`${"[INFO]".gray} ${this.sanitize(msg).cyan}`);}

    /**
     *
     * @param msg {any} Log Content
     */
    static warn( msg ){console.log(`${"[WARN]".gray} ${this.sanitize(msg).yellow}`);}

    /**
     *
     * @param msg {any} Log Content
     */
    static error( msg ){console.log(`${"[ERROR]".gray} ${this.sanitize(msg).red}`);}

    /**
     *
     * @param msg {any} Log Content
     */
    static debug( msg ){console.log(`${"[DEBUG]".gray} ${this.sanitize(msg).green}`);}

    /**
     *
     * @param msg {any} Log Content
     */
    static log( msg ){console.log(`${"       "} ${this.sanitize(msg).green}`);}

    /**
     *
     * @param msg {any} Log Content
     */
    static yellow( msg ){console.log(`${"[*]".grey} ${this.sanitize(msg).yellow}`);}
    /**
     *
     * @param msg {any} Log Content
     */
    static long( msg ){console.log(`${"[Long]".gray} ${this.sanitize(msg).green}`);}

    /**
     *
     * @param msg {any} Log Content
     */
    static short( msg ){console.log(`${"[Short]".gray} ${this.sanitize(msg).red}`);}

    /**
     *
     * @param msg {any} Log Content
     */
    static trade( msg ){console.log(`${"[Trade]".gray} ${this.sanitize(msg).cyan}`);}
}

/**
 *
 * @type {{Log: Log}}
 */
module.exports = {Log:Log};
