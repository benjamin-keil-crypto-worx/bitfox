let {Point} = require("./Point")
let {Edge} = require("./Edge")
let {IndicatorConvergence} = require("./IndicatorConvergence")
let {Candlesticks} = require("./Candlesticks")
let {Mock} = require("./Mock")


/**
 *
 * @returns {{Candlesticks: Candlesticks, Point: Point, IndicatorConvergence: (IndicatorConvergence|IndicatorConvergence), Edge: (Edge|Edge), Mock: (Mock|Mock)}}
 */
module.exports.getModels = ()  => {
    return  {
        Point:Point,
        Edge:Edge,
        IndicatorConvergence:IndicatorConvergence,
        Candlesticks:Candlesticks,
        Mock:Mock
    }
}
