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

/**
 * Class Process Manager
 * 
 * <pre>
 * This Class is responsible to schedule Bitfox Engine Runtime context's
 * 
 * The BitFox Engine when executed without a Process Manager executes Strategie, Alerts based on a interval mechanism relying
 * on Javascript's setInterval() function where the interval is provided via the options provided to the engine, for long periods like hourly or 
 * daily, weekly or even monthly processes this is not a good way of scheduling the trading bots so we included a Process Manager that functions
 * like a cron job for your Engine runtime strategies.
 * 
 * The Process Manager has a predefined set of Schedules outlined below:
 *
 *  "1m"  Runs the Engine Context once every  minute
 *  "3m"  Runs the Engine Context once every  3 minute's
 *  "5m"  Runs the Engine Context once every  5 minute's
 *  "15m" Runs the Engine Context once every  15 minute's
 *  "30m" Runs the Engine Context once every  30 minute's
 *  "1h"  Runs the Engine Context once every  hour
 *  "2h"  Runs the Engine Context once every  2 hour's
 *  "4h"  Runs the Engine Context once every  4 hour's
 *  "12h  Runs the Engine Context once every  12 hour's
 *  "1d"  Runs the Engine Context once every  Day
 *  "1W"  Runs the Engine Context once every  Week
 *  "1M"  Runs the Engine Context once every  MOnths
 * </pre>
 */
class ProcessManager{

    /**
     * 
     * @returns {ProcessManager} - The Process Manager Instance
     */
    static getProcessManager(){
        return new ProcessManager()
    }

    constructor() {
        this.schedule = null;
        this.task = null;
        this.job = null;
    }

    /**
     * 
     * @param {String} timeFrame - The Time Frame represented as a String  Default 5m
     * @returns {ProcessManager} - The Process Manager Instance
     */
    setProcessSchedule( timeFrame ){
        if(SCHEDULES.hasOwnProperty(timeFrame)){
            this.schedule = SCHEDULES["5m"];
        }
        this.schedule =  SCHEDULES[timeFrame];
        return this;
    }

    /**
     * 
     * @param {BitFox} task - The BitFox Engine  
     */
    setProcessTask( task ){
        this.task = task;
    }

    /**
     * Schedules the Process and executes the run() context in the BitFox engine instance
     */
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
