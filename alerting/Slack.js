const axios = require('axios');
class Slack {
    static factory(args) { return new Slack(args)}

    constructor(args) {
        this.args = args;
    }

    async notify(args,message) {
        const url = 'https://slack.com/api/chat.postMessage';
        const res = await axios.post(url, {
            channel: this.args.channel,
            text: message
        }, { headers: { authorization: `Bearer ${args.token}` } });

        console.log('Done', res.data);
    }
}
module.exports = {Slack:Slack}
