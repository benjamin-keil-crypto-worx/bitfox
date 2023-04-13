class Edge{
    static getInstance(pointA, pointB){
        return new Edge(pointA, pointB);
    }

    constructor(pointA, pointB){
        this.a =pointA;
        this.b= pointB;
    }

    getEdge(){
        return {a:this.a, b:this.b}
    }

    toInstance(){
        return {pointA:this.a.getPoint(), pointB:this.b.getPoint()}
    }
}

module.exports = {Edge:Edge}
