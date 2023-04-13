
class Email{
    constructor() {
        this.sgMail = null;
        this.msg = null;
    }
    static factory(){return new Email()}

    setOptions(options){
        this.sgMail = require('@sendgrid/mail');
        this.sgMail.setApiKey(options.token);
        this.msg = null;
    }
    createMessage(options,message){
        this.msg =  {
            to: options.to,
            from: options.from, // Use the email address or domain you verified above
            subject: 'Bot-Vox Alert',
            html: `<strong>Bot Vox Alert</strong><br/><p>${message}</p>`,
            text: message,
        };
    }
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
module.exports = {Email:Email}

