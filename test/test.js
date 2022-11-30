const should = require('chai').should();
const Perigress = require('../perigress');
const path = require('path');
//const express = require('express');
//const request = require('postman-request');

describe('perigress', ()=>{
    describe('Works with a simple API', ()=>{
        it('loads the demo API', (done)=>{
            const api = new Perigress.DummyAPI({
                subpath : 'api',
                dir: __dirname
            });
            api.ready.then(()=>{
                done();
            }).catch((ex)=>{
                should.not.exist(ex);
            });
        });

    });

    describe.skip('Works using a simple form API', ()=>{

    });

});
