const extendClass = require('extend-interface');
const ks = require('kitchen-sync');
const access = require('object-accessor');
const arrays = require('async-arrays');
const jsonToJSONSchema = require('to-json-schema');
const joiToJSONSchema = require('joi-to-json')
const jsonSchemaFaker = require('json-schema-faker');
const { makeGenerator } = require('./random');
const fs = require('fs');
const Pop = require('tree-pop');
const path = require('path');
//const sift = require('sift').default;
const { WKR, classifyRegex, generateData } = require('well-known-regex');
const sql = require('json-schema2sql');
const sequelize = require('json-schema2sequelize');
const validate = require('jsonschema').validate;
const template = require('es6-template-strings');

let OutputFormat = function(opts){
	this.options = opts || {};
}


OutputFormat.prototype.mutateEndpoint = function(endpoint){
	throw new Error('mutateEndpoint() not implemented.')
};
OutputFormat.prototype.attach = function(expressInstance, endpoint){
	if(!endpoint){
		
	}else{
		let options = endpoint.options;
		let prefix = options.path.substring(
			path.join(options.root, options.subpath).length
		);
		let urlPath = prefix+'/'+options.spec.split('.').shift();
		//let ob = this;
		let config = endpoint.config();
		let errorConfig = endpoint.errorSpec();
		let primaryKey = config.primaryKey || 'id';
		
		let pathOptions = {
			basePath : urlPath,
			primaryKey : primaryKey
		}
		this.basePath = urlPath;
		let resultSpec = endpoint.resultSpec();
		let cleaned = endpoint.cleanedSchema(resultSpec.returnSpec || {});
		let readOnly = config.readOnlyFields || ['id'];
		this.attachEndpoint(expressInstance, endpoint, {
			prefix, 
			urlPath, 
			config, 
			errorConfig, 
			primaryKey,
			resultSpec,
			cleaned,
			readOnly,
			pathOptions
		});
	}
};
OutputFormat.prototype.attachEndpoint = function(expressInstance, endpoint){
	throw new Error('attach() not implemented.')
};
OutputFormat.prototype.attachRoot = function(expressInstance){
	throw new Error('attach() not implemented.')
};
OutputFormat.prototype.attachSpec = function(expressInstance, endpoint){
	throw new Error('spec documentation unsupported.')
};
OutputFormat.extend = function(cls, cns){
	var cons = cns || function(){
		OutputFormat.apply(this, arguments);
		return this;
	};
	return extendClass(cls, cons, OutputFormat);
};

module.exports = OutputFormat;