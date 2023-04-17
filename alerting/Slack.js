const axios = require('axios');

/**
 * Class Slack
 <pre>
 * This class is a Slack Messaging Client thay uses axios to make an API request to create a new Slack message
 *
 * In Order to for to leverage Slack Notifications you need to the following ready to hand:
 *
 * 1. A Slack Account and a Work Space
 * 2. A Bot User that you need to configure in order to retrieve an oAuth token to make API request!
 *
 * To Sign in or Create an Account got to https://slack.com
 *
 * Here is a Good Guide on how to Generate a Slack Bot User you can skip the (Making Your First Request) section
 * Since BitFox will handle that for you!
 * This is a good place to learn and start setting up a Slack Account & Channel!
 </pre>
 */
class Slack {

    /**
     * @typedef {Object} args the arguments
     * @property {String} channel the Slack Channel Id to send the message to
     * @property {String} token the authentication token to send a message
     */
    /**
     *
     * @param args
     * @return {Slack}
     */
    static factory(args) { return new Slack(args)}

    constructor(args) {
        this.args = args;
    }

    /**
     *
     * @param args {Object} the arguments just like in the factory
     * @param message {String} the message to send
     * @return {Promise<void>}
     */
    async notify(args,message) {
        const url = 'https://slack.com/api/chat.postMessage';
        const res = await axios.post(url, {
            channel: this.args.channel,
            text: message
        }, { headers: { authorization: `Bearer ${this.args.token}` } });

        console.log('Done', res.data);
    }
}

/**
 *
 * @type {{Slack: Slack}}
 */
module.exports = {Slack:Slack}
