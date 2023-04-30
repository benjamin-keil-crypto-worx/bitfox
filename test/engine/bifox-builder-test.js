"use strict";
const assert = require( "assert" );
const chai = require("chai");
const sinon = require('sinon');

process.env.NODE_ENV = "test"
const spy = sinon.spy(console, 'log');
let validationConf = require("../resources/config.json");
let {builder} = require("../../engine/BitFox");
const getTypeValidationErrormMessage = (provided, target, expected) =>{
  return `Error Initializing BitFox Engine, cannot proceed with execution context ( Cause: Invalid type: ${provided} provided for ${target} expected type is: ${expected} , code: 1000 )`;
}

describe( "BitFox Builder Validation Tests", async () => {
    it( "It Should Validate Everything Correct", async () => {
        Object.keys(validationConf).forEach(key =>{
           
            builder()[key](validationConf[key].validate[0].value)
            let message = getTypeValidationErrormMessage(validationConf[key].validate[0].type , validationConf[key].target , validationConf[key].expected )
            sinon.assert.calledWith(spy,message )

            builder()[key](validationConf[key].validate[1].value)
            message = getTypeValidationErrormMessage(validationConf[key].validate[1].type , validationConf[key].target , validationConf[key].expected )
            sinon.assert.calledWith(spy,message )

            builder()[key](validationConf[key].validate[2].value)
            message = getTypeValidationErrormMessage(validationConf[key].validate[2].type , validationConf[key].target , validationConf[key].expected )
            sinon.assert.calledWith(spy,message )

        })
    });
} );


