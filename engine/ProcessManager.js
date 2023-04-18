const schedule = require('node-schedule');

const SCHEDULES = {
    "1m":"*/1 * * * *",
    "3m":"*/3 * * * *",
    "5m":"*/5 * * * *",
    "15m":"*/15 * * * *",
    "30m":"*/30 * * * *",
    "1h":"0 */1 * * *",
    "2h":"0 */2 * * *",
    "4h":"0 */1 * * *",
    "12h":"0 */12 * * *",
    "1d":"0 0 */1 * *",
    "1W":"0 0 */7 * 0",
    "1M":"0 0 1 */1 *"
}
class ProcessManager{

    static getProcessManager(){
        return new ProcessManager()
    }

    constructor() {
        this.schedule = null;
        this.task = null;
        this.job = null;
    }

    setProcessSchedule( timeFrame ){
        if(SCHEDULES.hasOwnProperty(timeFrame)){
            this.schedule = SCHEDULES["5m"];
        }
        this.schedule =  SCHEDULES[timeFrame];
        return this;
    }

    setProcessTask( task ){
        this.task = task;
    }

    scheduleProcess(){
        let instance=  this;
        this.job = schedule.scheduleJob(this.schedule, async function(){
            await instance.task.run();
        });
        let nextInvocation = this.job.nextInvocation();
        console.log(`[ BitFoxProcessManager ] Scheduling next invocation at ${nextInvocation._date}`)
    }
}

module.exports = {ProcessManager:ProcessManager}
