class IndicatorConvergence{

    static getInstance(context){
        return new IndicatorConvergence(context);
    }

    constructor(context){
        this.edge = null;
        this.edgeIndeces = [];
        this.context = context;
        this.stopped = false;
    }

    getContext(){ return this.context;}
    setStopped(isStopped){this.stopped = isStopped; return this;}
    setEdge(edge){ this.edge=edge}
    setEdgeIndexes(aIndex, bIndex){
        this.edgeIndeces.push(aIndex)
        this.edgeIndeces.push(bIndex)
    }

    toInstance(){
        return { context:this.context, edge:this.edge.toInstance(), index:this.edgeIndeces, isStopped:this.stopped}
    }
}

module.exports = {IndicatorConvergence:IndicatorConvergence}
