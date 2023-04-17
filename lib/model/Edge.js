/**
 * Class Edge
 <pre>
 * Create Edges, i.e. Aggregates a Point A and a Point B of Indicator Data
 * for example Point A could be a crossover start and point B could be a crossover end!
 </pre>
 */
class Edge{

    /**
     * @typedef {Object} Point That is the Point
     * @property {number} x - the x-axis
     * @property {number} y - the y-axis
     * @property {number} index - the index of the indicator data where this point was created from
     */
    /**
     *
     * @param pointA {Point} Point A
     * @param pointB {Point} Point B
     * @returns {Edge}
     */
    static getInstance(pointA, pointB){
        return new Edge(pointA, pointB);
    }

    /**
     *
     * @param pointA {Point}
     * @param pointB {Point}
     */
    constructor(pointA, pointB){
        this.a =pointA;
        this.b= pointB;
    }

    /**
     *
     * @returns {{a, b}}
     */
    getEdge(){
        return {a:this.a, b:this.b}
    }

    /**
     *
     * @returns {{pointA: {x: *, y: *, index: *}, pointB: {x: *, y: *, index: *}}}
     */
    toInstance(){
        return {pointA:this.a.getPoint(), pointB:this.b.getPoint()}
    }
}

/**
 *
 * @type {{Edge: Edge}}
 */
module.exports = {Edge:Edge}
