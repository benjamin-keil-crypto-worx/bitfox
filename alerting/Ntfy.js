let axios = require('axios');
class Ntfy {

    static factory(options) { return new Ntfy(options); }

    constructor(options) {
        this.token = options.token,
        this.address = options.ntfyAddress;
        this.topic = options.ntfyTopic;
    }

     notify(body){
        return axios.post(`${this.address.trim()}/${this.topic}`, {singal:body}, {
            headers: {
              'Authorization': `Basic ${this.token}`,
              'Content-Type': 'text/plain', // Set the Content-Type for plain text
            },
            responseType: 'text'
          })
            .then(response => {
              // Handle the response
              console.log('Response:', response.data);
            })
            .catch(error => {
              // Handle errors
              console.error('Axios error:', error);
            });
    }

}

module.exports = {Ntfy:Ntfy}