/**
 * Class Point
 *
 * Creates a Point, with x and y and stores an index of the starting location where the Point was created from an Candle Data Array
 */
class Point{

    /**
     *
     * @returns {Point}
     */
    static getInstance(){
        return new Point();
    }

    constructor(){
        this.x = null;
        this.y= null;
        this.index = null;
    }

    /**
     *
     * @param x {number} The x-axis of this point
     * @returns {Point}
     */
    setX(x){this.x = x; return this;}

    /**
     *
     * @param y {Date} The y-axis of this point
     * @returns {Point}
     */
    setY(y){this.y = y; return this;}


    /**
     *
     * @returns {x:number} the x-axis of this point
     */
    getX(){return this.x;}

    /**
     *
     * @returns {y:number} the y-axis of this point
     */
    getY(){return this.y;}

    /**
     *
     * @param index {number} the index of the indicator data where this point was created from
     * @returns {Point}
     */
    setIndex(index){this.index = index; return this;}

    /**
     *
     * @returns {Point} Returns a Point
     */
    getPoint(){
        return {x:this.x, y:this.y, index:this.index}
    }
}

/**
 *
 * @type {{Point: Point}}
 */
module.exports = {Point:Point}
