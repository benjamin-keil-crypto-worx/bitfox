"use strict";

const assert = require( "assert" );
const chai = require("chai");
const utils = require( "../../lib/utility/util" );
const {State} = require("../../lib/states/States");


let mockData  =require("../resources/ohlcv.json")
let {SmartAccumulate} = require("../../strategies/SmartAccumulate");
describe( "SmartAccumulate ", () => {

    let data = utils.deepCopy(mockData);
    let strategy = SmartAccumulate.init({})
    strategy.setup(data.data)
    it( "It should have indicator data initialized", () => {
        chai.assert.isTrue(strategy.getIndicator().length > 0)
    } );
    it( "It should run though data and change states", async () => {
        let cnt =0;
        let expectedState = State.STATE_PENDING;
        chai.assert.equal(strategy.getState(),expectedState)
        while (cnt<strategy.getIndicator().length) {

            await strategy.run(cnt,true)
            if(strategy.getState()===State.STATE_PENDING){cnt++; continue;}
            if(strategy.getState()===State.STATE_ENTER_LONG || strategy.getState()===State.STATE_ENTER_SHORT ){
                expectedState = State.STATE_AWAIT_ORDER_FILLED;
                cnt++; continue;
            } if(strategy.getState()===State.STATE_AWAIT_ORDER_FILLED  ){
                expectedState = State.STATE_TAKE_PROFIT;
                strategy.setState(State.STATE_TAKE_PROFIT);

            }if(strategy.getState()===State.STATE_TAKE_PROFIT  ){
                expectedState = State.STATE_STOP_LOSS_TRIGGERED;
                strategy.setState(State.STATE_STOP_LOSS_TRIGGERED)
            }if(strategy.getState()===State.STATE_STOP_LOSS_TRIGGERED  ){
                expectedState = State.STATE_PENDING;
                strategy.setState(State.STATE_PENDING)
            }
            chai.assert.equal(strategy.getState(),expectedState)
            cnt++
        }
    } );
} );

