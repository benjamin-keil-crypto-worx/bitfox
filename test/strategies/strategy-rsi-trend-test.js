"use strict";

const assert = require( "assert" );
const chai = require("chai");
const utils = require( "../../lib/utility/util" );
const {State} = require("../../lib/states/States");



let mockData  =require("../resources/ohlcv.json")
let {RSITrend} = require("../../strategies/RSITrend");

describe( "Test RSI Trend ", () => {

    let data = utils.deepCopy(mockData);
    let strategy = RSITrend.init({})
    strategy.setup(data.data)
    it( "It should have indicator data initialized", () => {
       chai.assert.isTrue(strategy.getIndicator().length > 0)
    } );
    it( "It should have a state of STATE_PENDING", () => {
       chai.assert.equal(strategy.getState(),State.STATE_PENDING)
    } );
    it( "It should change State to short", () => {

        strategy.run(470,true)
        chai.assert.equal(strategy.getState(),State.STATE_ENTER_SHORT)
    } );
    it( "It should change State to STATE_AWAIT_ORDER_FILLED", () => {
        strategy.run(0,true)
        chai.assert.equal(strategy.getState(),State.STATE_AWAIT_ORDER_FILLED)
    } );
    it( "It should change State to STATE_AWAIT_TAKE_PROFIT", () => {
        strategy.setState(State.STATE_AWAIT_TAKE_PROFIT);
        chai.assert.equal(strategy.getState(),State.STATE_AWAIT_TAKE_PROFIT)
    } );
    it( "It should change State to STATE_AWAIT_TAKE_PROFIT", () => {
        strategy.setState(State.STATE_TAKE_PROFIT);
        chai.assert.equal(strategy.getState(),State.STATE_TAKE_PROFIT)
    } );
    it( "It should change State to STATE_STOP_LOSS_TRIGGERED", () => {
        strategy.setState(State.STATE_STOP_LOSS_TRIGGERED);
        chai.assert.equal(strategy.getState(),State.STATE_STOP_LOSS_TRIGGERED)
    } );
    it( "It should change State to STATE_AWAIT_CROSS_DOWN", () => {
        strategy.setState(State.STATE_AWAIT_CROSS_DOWN);
        chai.assert.equal(strategy.getState(),State.STATE_AWAIT_CROSS_DOWN)
    } );
    it( "It should change State to STATE_AWAIT_CROSS_UP", () => {
        strategy.setState(State.STATE_AWAIT_CROSS_UP);
        chai.assert.equal(strategy.getState(),State.STATE_AWAIT_CROSS_UP)
    } );
    it( "It should change State to STATE_PENDING", () => {
        strategy.setState(State.STATE_PENDING)
        chai.assert.equal(strategy.getState(),State.STATE_PENDING)
    } );
    it( "It should change State to STATE_ENTER_LONG", () => {
        strategy.run(286,true)
        chai.assert.equal(strategy.getState(),State.STATE_ENTER_LONG) ;
    } );
} );

