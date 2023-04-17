/**
 *
 */

/**
 * Class Email
 <pre>
 * This class is an Email Client that wraps around sendgrid Emailing API
 *
 * Visit this link: https://sendgrid.com/ to follow the Account Setup Instructions and optain an API Key,
 * you need to provide this key when you start your Alerting Bot.
 *
 * As a side note, its important that after you have created an Account and generated an API Key that you also create a verified sender email address we found
 * this link useful and helpful: https://app.sendgrid.com/settings/sender_auth/senders
 </pre>
 *
 */
class Email{
    constructor() {
        this.sgMail = null;
        this.msg = null;
    }

    /**
     *
     * @return {Email} factory method to get an Email client
     */
    static factory(){return new Email()}

    /**
     * @module Email
     * @typedef {Object} options
     * @property {String} token  The API token to send email
     * @property {string} to the email address to send the email to
     * @property {string} from the email address to send email from
     */

    /**
     *
     * @param options.token {options} sets the API token on the Email Client
     */
    setOptions(options){
        this.sgMail = require('@sendgrid/mail');
        this.sgMail.setApiKey(options.token);
        this.msg = null;
    }

    /**
     *
     * @param options {options} The Emailing options
     * @param message {String} the text content for the email
     */
    createMessage(options,message){
        this.msg =  {
            to: options.to,
            from: options.from, // Use the email address or domain you verified above
            subject: 'Bot-Vox Alert',
            html: `<strong>Bot Vox Alert</strong><br/><p>${message}</p>`,
            text: message,
        };
    }

    /**
     *
     * @return {Promise<void>} Send out the email
     */
    async notify(){
        try {
            await this.sgMail.send(this.msg);
        } catch (error) {
            console.error(error);
            if (error.response) {
                console.error(error.response.body)
            }
        }
    }
}

/**
 *
 * @type {{Email: Email}}
 */
module.exports = {Email:Email}

