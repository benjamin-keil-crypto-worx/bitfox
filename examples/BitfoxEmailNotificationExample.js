let helper = require("./helpers/helper");

let engine = helper.getEmailNotificationEngine();

engine.notifyOnly(true);
