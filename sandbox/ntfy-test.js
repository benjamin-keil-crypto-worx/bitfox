let {Ntfy} = require("../alerting/Ntfy");

let options = {
    token:"YourBasicAuthtoken",
    ntfyAddress:"http://192.168.0.38:80",
    ntfyTopic:"bitfox-signals"
}

let ntfyClient = Ntfy.factory(options);

ntfyClient.notify({message:"Hello", data:{test:"test", status:200}});

