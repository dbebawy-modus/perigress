const ks = require('kitchen-sync');
const Perigress = require('../perigress');
const path = require('path');
const express = require('express');
const request = require('postman-request');

const port = 8082;

const fromFn = (opts, format, cb)=>{
	let callback = ks(cb);
	let api;
	if(typeof opts === 'string'){
		let parts = path.parse(opts);
		let subpath = parts.name;
		let dir = parts.dir;
		api = new Perigress.DummyAPI({
			subpath,
			dir
		}, format);
	}else{
		api = new Perigress.DummyAPI(opts, format);
	}
	api.ready.then(()=>{
		callback(null, api);
	}).catch((ex)=>{
		callback(ex);
	});
	return callback.return;
}

const apiFrom = (opts, format, cb)=>{
	let callback = ks(cb);
	const app = express();
	app.use(express.json({strict: false}));
	fromFn(opts, format, (err, api)=>{
		if(err) throw err;
		api.attach(app, ()=>{
			const server = app.listen(port, ()=>{
				callback(null, {app, api, server});
			});
		});
	});
	return callback.return;
};

const makeAPIGenerator = (format)=>{
	return (p, cb)=>{
		apiFrom(p, format, (err, {app, api, server})=>{
			cb(null, app, (clb)=>{
				server.close(()=>{
					clb();
				});
			}, (type)=>{
				let joiSchema = require(path.join(
					__dirname, p, 'v1', type+'.spec.js'
				));
				return joiSchema;
			});
		});
	};
};

const generateAllEndpointTestsFromAPI = (api, hook, opts, format)=>{
	describe('[API SUITE  '+opts+' ]', ()=>{
		api.endpoints.forEach((endpoint)=>{
			describe('Testing '+endpoint.options.name, ()=>{
				let serv;
				let apiArgs;
				before((finish)=>{
					apiFrom(opts, format, (err, {app, api, server})=>{
						serv = server;
						apiArgs = {app, api, server};
						finish();
					});
				});
				
				it('creates an instance of '+endpoint.options.name, (finish)=>{
					let ob = {};
					actions.create(endpoint.options.name, ob, (err, returnedOb)=>{
						(err === null).should.equal(true);
						Object.keys(ob).forEach((key)=>{
							ob[key].should.equal(returnedOb[key]);
						});
						finish();
					});
				});
				
				it('read an instance of '+endpoint.options.name, (finish)=>{
					let ob = {};
					actions.read(endpoint.options.name, ob, (err, returnedOb)=>{
						(err === null).should.equal(true);
						Object.keys(ob).forEach((key)=>{
							ob[key].should.equal(returnedOb[key]);
						});
						finish();
					});
				});
				
				it('edits an instance of '+endpoint.options.name, (finish)=>{
					let ob = {};
					actions.update(endpoint.options.name, ob, (err, returnedOb)=>{
						(err === null).should.equal(true);
						Object.keys(ob).forEach((key)=>{
							ob[key].should.equal(returnedOb[key]);
						});
						finish();
					});
				});
				
				it('deletes an instance of '+endpoint.options.name, (finish)=>{
					let ob = {};
					actions.delete(endpoint.options.name, ob, (err, returnedOb)=>{
						(err === null).should.equal(true);
						Object.keys(ob).forEach((key)=>{
							ob[key].should.equal(returnedOb[key]);
						});
						finish();
					});
				});
				
				if(hook){
					hook(endpoint, api);
				}
				
				after((done)=>{
					if(serv){ serv.close((err)=>{
						done();
					})} else {
						done();
					};
				})
			});
		});
	});
};

//ASYNC issues
const generateAllEndpointTests = (opts, format, hook)=>{
	apiFrom(opts, format, (err, {app, api, server})=>{
		generateAllEndpointTestsFromAPI(api, hook, opts, format);
	});
};

let actions = {
	create : (type, ob, cb)=>{
		request({
			uri: 'http://localhost:'+port+'/v1/'+type+'/create',
			json: ob
		}, (err, data)=>{
			(err === null).should.equal(true);
			cb(err, data);
		});
	},
	read : (type, ob, cb)=>{
		request({
			uri: 'http://localhost:'+port+'/v1/'+type+'/read',
			json: ob
		}, (err, data)=>{
			(err === null).should.equal(true);
			cb(err, data);
		});
	},
	update : (type, ob, cb)=>{
		request({
			uri: 'http://localhost:'+port+'/v1/'+type+'/update',
			json: ob
		}, (err, data)=>{
			(err === null).should.equal(true);
			cb(err, data);
		});
	},
	delete : (type, ob, cb)=>{
		request({
			uri: 'http://localhost:'+port+'/v1/'+type+'/update?delete=true',
			json: ob
		}, (err, data)=>{
			(err === null).should.equal(true);
			cb(err, data);
		});
	},
};

module.exports = {
	from: fromFn,
	apiFrom,
	makeAPIGenerator,
	actions,
	generateAllEndpointTests,
	generateAllEndpointTestsFromAPI
};