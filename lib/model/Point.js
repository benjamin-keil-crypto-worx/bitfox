class Point{
    static getInstance(){
        return new Point();
    }

    constructor(){
        this.x = null;
        this.y= null;
        this.index = null;
    }

    setX(x){this.x = x; return this;}
    setY(y){this.y = y; return this;}
    getX(){return this.x;}
    getY(){return this.y;}

    setIndex(index){this.index = index; return this;}

    getPoint(){
        return {x:this.x, y:this.y, index:this.index}
    }
}

module.exports = {Point:Point}
