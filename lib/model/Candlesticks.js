/**
 * Class CandleSticks
 *
 * This Class is just a convenience helper class to parse and create Candle Stick data Model
 *
 */
class Candlesticks{

    /**
     *
     * @param symbol {String} The Base/Quote Currency Symbol i.e. BTC/USDT
     * @param data  {Array}   An Array of o,h,l,c,v data
     */
    constructor( symbol, data ){
        this.candles = [];
        this.symbol = symbol;
        this.populateCandles( data )
    }

    /**
     *
     * @param data {Array} An Array of o,h,l,c,v data
     *
     *
     */
    populateCandles( data ){

        data.forEach( candle => {
            this.candles.push({time:candle[0], o:candle[1], h:candle[2],l:candle[3], c:candle[4], v:candle[5]});
        });

    }

    /**
     * @typedef {Object} CandleData
     * @property {Array<number>} Candles - The Candles
     * @property {number} timestamp - The Timestamp
     * @property {string} symbol - The Symbol
     */

    /**
     *
     * @returns {CandleData}
     */
    getCandles(){
        return { candles:this.candles, timestamp:this.candles[this.candles.length - 1].time, symbol:this.symbol }
    }
}

/**
 *
 * @type {{Candlesticks: Candlesticks}}
 */
module.exports = {
    Candlesticks:Candlesticks
};
