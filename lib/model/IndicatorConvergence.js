/**
 * Class IndicatorConvergence
 *
 * This class is a Store for Edges and use full for tracking Indicator Convergences like RSI over bought and Moving Average crossovers or cross under
 *
 */
class IndicatorConvergence{

    /**
     *
     * @param context {String} a String value that can be used to identify what context this Indicator convergences was created for!
     * @returns {IndicatorConvergence}
     */
    static getInstance(context){
        return new IndicatorConvergence(context);
    }

    /**
     *
     * @param context  {String} a String value that can be used to identify what context this Indicator convergences was created for!
     */
    constructor(context){
        this.edge = null;
        this.edgeIndeces = [];
        this.context = context;
        this.stopped = false;
    }

    /**
     *
     * @returns {String} The Context
     */
    getContext(){ return this.context;}

    /**
     *
     * @param isStopped {Boolean} flag to indicate that the context was stopped out in a fictional trade scenario
     * @returns {IndicatorConvergence}
     */
    setStopped(isStopped){this.stopped = isStopped; return this;}

    /**
     *
     * @param edge {Object} Sets an edge instance that contains 2 points
     */
    setEdge(edge){ this.edge=edge}

    /**
     *
     * @param aIndex {number} The index in the indicator data where point A was created
     * @param bIndex {number} The index in the indicator data where point B was created
     */
    setEdgeIndexes(aIndex, bIndex){
        this.edgeIndeces.push(aIndex)
        this.edgeIndeces.push(bIndex)
    }

    /**
     *
     * @returns {Object} Edge Object
     */
    toInstance(){
        return { context:this.context, edge:this.edge.toInstance(), index:this.edgeIndeces, isStopped:this.stopped}
    }
}

/**
 *
 * @type {{IndicatorConvergence: IndicatorConvergence}}
 */
module.exports = {IndicatorConvergence:IndicatorConvergence}
