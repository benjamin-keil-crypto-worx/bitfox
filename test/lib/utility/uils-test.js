"use strict";

const assert = require( "assert" );
const chai = require("chai");
const utils = require( "../../../lib/utility/util");
let  buff = [
    [
        1504541580000, // UTC timestamp in milliseconds, integer
        4235.4,        // (O)pen price, float
        4240.6,        // (H)ighest price, float
        4230.0,        // (L)owest price, float
        4230.7,        // (C)losing price, float
        37.72941911    // (V)olume float (usually in terms of the base currency, the exchanges docstring may list whether quote or base units are used)
    ]
]
describe( "Get Floor Pivots", () => {

    let { o,h,l,c,v, buffer } = utils.createIndicatorData(buff)
    let floorPivots = utils.floorPivots(o,h,l,c,v,{}, buffer)
    it( "Return correct Object Structure", () => {
        chai.assert.equal(floorPivots.length,1);
        chai.assert.containsAllKeys(floorPivots[0],["floor"])
        chai.assert.containsAllKeys(floorPivots[0].floor,["pivot","r1","r2","r3","s1","s2","s3"])

    } );
} );
describe( "Woodies Points", () => {
    let { o,h,l,c,v, buffer } = utils.createIndicatorData(buff)
    let woodies = utils.woodies(o,h,l,c,v,{}, buffer)
    it( "Return correct Object Structure", () => {
        chai.assert.equal(woodies.length,1);
        chai.assert.containsAllKeys(woodies[0],["woodies"])
        chai.assert.containsAllKeys(woodies[0].woodies,["pivot","r1","r2","s1","s2"])
    });

    it( "It Should have correct values", () => {
        chai.assert.strictEqual(woodies[0].woodies.pivot, 4233, "pivot is 4233");
        chai.assert.strictEqual(woodies[0].woodies.r1, 4236, "pivot is 4233");
        chai.assert.strictEqual(woodies[0].woodies.r2, 4243.6, "pivot is 4233");
        chai.assert.strictEqual(woodies[0].woodies.s1, 4225.4, "pivot is 4233");
        chai.assert.strictEqual(woodies[0].woodies.s2, 4222.4, "pivot is 4233");
    } );
} );
