const ks = require('kitchen-sync');
const access = require('object-accessor');
const arrays = require('async-arrays');
const jsonToJSONSchema = require('to-json-schema');
const joiToJSONSchema = require('joi-to-json')
const jsonSchemaFaker = require('json-schema-faker');
const { makeGenerator } = require('./random');
const fs = require('fs');
const path = require('path');
const { WKR, classifyRegex, generateData } = require('well-known-regex');
const sql = require('json-schema2sql');
const sequelize = require('json-schema2sequelize');
const template = require('es6-template-strings');

const defaults = {
    error : ()=>{

    },
    results: ()=>{

    }
}


const returnError = (res, error, errorConfig, config)=>{
    let response;
    try{
        response = JSON.parse(JSON.stringify(errorConfig.structure));
    }catch(ex){
        response = {
            structure: {
                status: 'error',
                error: {}
            }
        };
    }
    access.set(response, errorConfig.code, error.code);
    access.set(response, errorConfig.message, error.message);
    res.send(JSON.stringify(response, null, '    '));
};

const returnContent = (res, result, errorConfig, config)=>{
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(result, null, '    '));
};

const capitalize = (s)=>{
    return s.split(' ').map((word)=>{
        return word[0].toUpperCase()+word.substring(1);
    }).join('');
};

const getInstance = (ob, key, cb)=>{
    if(ob.instances[key]){
        cb(null, ob.instances[key]);
    }else{
        ob.generate(key, (err, instance)=>{
            cb(err, instance);
        });
    }
};


const DummyEndpoint = function(options, api){
    this.returnError = returnError;
    this.returnContent = returnContent;
    this.makeGenerator = makeGenerator;
    this.save = save;
    this.nextId = ()=>{
        return nextId(this);
    }
    this.getInstance = (key, cb)=>{
        return getInstance(this, key, cb);
    };
    this.options = options || {};
    this.api = api;
    this.instances = {};
    this.endpointOptions = {};
    this.cleanupOptions(this.endpointOptions);

    if(this.options.spec && !this.options.name){
        this.options.name = this.options.spec.split('.').shift();
    }
    let conf = this.config();
    if(!this.options.expandable){
        if(!conf.expandable){
            // use the default
            let keyPartJoiner = conf.foreignKeyJoin || ((...parts)=>{
                return parts.map((part, index)=>{
                    if(index === 0) return part;
                    return capitalize(part);
                }).join('');
            })
            let identifier= this.options.identifier || 'id';
            this.options.expandable = function(type, fieldName, fieldValue){
                // returns falsy *OR* {type, value}
                const sentinel = keyPartJoiner('a', identifier).substring(1);
                const index = fieldName.lastIndexOf(sentinel);
                if(index === -1) return false;
                if(
                    // did we find it at the end of the string?
                    index + identifier.length === fieldName.length &&
                    // is the id an integer?
                    fieldValue === '::'?true:Number.isInteger(fieldValue)
                ){
                    const linkField = fieldName.substring(0, fieldName.length - sentinel.length);
                    return {
                        type: linkField,
                        suffix: fieldName.substring(fieldName.length - identifier.length)
                    };
                }
                return false;
            };
        }
        if(conf.expandable && typeof conf.expandable === 'function'){
            // use the default
            this.options.expandable = conf.expandable;
        }
    }
}

DummyEndpoint.prototype.cleanupOptions = function(options){
    if(!options.method){
        options.method = 'ALL';
    }
}

DummyEndpoint.prototype.log = function(message, level){
    if(this.api && (this.api.options.verbose || this.api.options.debug)){
        this.api.log(message, level);
    }
}

DummyEndpoint.prototype.makeDataFileWrapper = function(opts, statements){
    let options = opts || {format:'sql'};
    let result = null;
    let config = this.config();
    // TODO: switch to a plugin loader pattern
    let exportNames = opts.export || [ this.options.name.substring(0,1).toUpperCase()+
        this.options.name.substring(1) ];
    switch((options.format||'').toLowerCase()){
        case 'sequelize':
            let include = `const { Sequelize, DataTypes, Model } = require('@sequelize/core');`;
            include += `\nconst sequelize = require('${options.sequelizePath}');\n`
            let exportText = `module.exports = ###;`
            result = include+statements.join("\n")+'';
            if(!options.seperate){
                result = result+"\n"+exportText.replace('###', `{${exportNames.join(', ')}}`)
            }
            break;
        case 'sql':
            result = statements.join(";\n")+';';
            break;
        default: throw new Error('Unknown Type: '+options.format);
    }
    return result;
}

DummyEndpoint.prototype.toDataDefinition = function(opts, names){
    let options = opts || {format:'sql'};
    let tableDefinitions = [];
    let config = this.config();
    // TODO: switch to a plugin loader pattern
    let statements = null;
    let isSerial = config.primaryKey?
        [
            'integer',
            'number'
        ].indexOf(this.schema.properties[config.primaryKey].type) !== -1:
        false;
    switch((options.format||'').toLowerCase()){
        case 'sequelize':
            let capName = this.options.name.substring(0,1).toUpperCase()+
                this.options.name.substring(1);
            if(names) names.push(capName);
            statements = sequelize.toSequelize(this.options.name, this.schema, {
                primaryKey: config.primaryKey,
                foreignKey: options.isForeignKey,
                serial: isSerial
            });
            if(options.seperate){
                statements = statements.map(
                    (s)=>include+"\n"+s+"\n"+exportText.replace('###', capName)
                )
            }
            tableDefinitions = tableDefinitions.concat(statements);
            break;
        case 'sql':
            statements = sql.toSQL(this.options.name, this.schema, {
                primaryKey: config.primaryKey,
                serial: isSerial,
                foreignKey: options.isForeignKey
            });
            tableDefinitions = tableDefinitions.concat(statements);
            break;
        default: throw new Error('Unknown Type: \''+options.format+'\'');
    }
    return tableDefinitions;
}

DummyEndpoint.prototype.makeMigrationFileWrapper = function(opts, statements){
    let options = opts || {format:'sql'};
    let result = null;
    let config = this.config();
    // TODO: switch to a plugin loader pattern
    let exportNames = opts.export || [ this.options.name.substring(0,1).toUpperCase()+
        this.options.name.substring(1) ];
    switch((options.format||'').toLowerCase()){
        case 'sequelize':

            break;
        case 'sql':

            break;
        default: throw new Error('Unknown Type: '+options.format);
    }
    return result;
}

DummyEndpoint.prototype.toDataMigration = function(schema, opts, names){
    let options = opts || {format:'sql'};
    let tableDefinitions = [];
    let config = this.config();
    // TODO: switch to a plugin loader pattern
    let statements = null;
    switch((options.format||'').toLowerCase()){
        case 'sequelize':

            break;
        case 'sql':

            break;
        default: throw new Error('Unknown Type: \''+options.format+'\'');
    }
    return tableDefinitions;
}

DummyEndpoint.prototype.cleanedSchema = function(s){
    let schema = s || {};
    if(schema && schema.type === 'object' && schema['$_root']){ //this is a joi def
        schema = joiToJSONSchema(schema);
    }
    let copy = JSON.parse(JSON.stringify(schema));
    (Object.keys(copy.properties || {})).forEach((key)=>{
        if(copy.properties[key] && copy.properties[key].pattern){
            copy.properties[key].pattern = copy.properties[key].pattern.replace(/\?<[A-Za-z][A-Za-z0-9]*>/g, '')
        }
        if(!copy.properties[key]){
            process.exit();
        }
        //TODO: object, array support
    });
    return copy;
}

DummyEndpoint.prototype.formatItems = function(opts, items){
    let options = opts || {format:'sql'};
    let result = null;
    let config = this.config();
    // TODO: switch to a plugin loader pattern
    let exportNames = opts.export || [ this.options.name.substring(0,1).toUpperCase()+
        this.options.name.substring(1) ];
    switch((options.format||'').toLowerCase()){
        case 'sequelize':
            result = sequelize.toSequelizeInsert(this.options.name, items, {});
            break;
        case 'sql':
            result = sql.toSQLInsert(this.options.name, items, {});
            break;
        default: throw new Error('Unknown Type: '+options.format);
    }
    return result;
}

DummyEndpoint.prototype.generate = function(id, o, c){
    let cb = typeof o === 'function'?o:(typeof c === 'function'?c:()=>{});
    let options = typeof o === 'object'?o:{};
    let gen = makeGenerator(id+'');
    jsonSchemaFaker.option('random', () => gen.randomInt(0, 1000)/1000);
    // JSF's underlying randexp barfs on named capture groups, which we care about
    let cleaned = this.cleanedSchema(this.schema);
    let config = this.config();
    //TODO: make default come from datasource
    let primaryKey = config.primaryKey || 'id';
    jsonSchemaFaker.resolve(cleaned, [], process.cwd()).then((value)=>{
        if(this.schema.properties[primaryKey] && value[primaryKey]){
            switch(this.schema.properties[primaryKey].type){
                case 'integer':
                    value[primaryKey] = parseInt(id);
                    break
                case 'string':
                    value[primaryKey] = id;
                    break;
                default : throw new Error(
                    'Cannot create a primary key with type:'+
                        this.schema.properties[primaryKey].type
                )
            }
        }
        let generated;
        try{
            generated = generateData(this.schema, {
                locale: 'en_us',
                seed: id
            });
        }catch(ex){
            console.log(ex);
        }
        Object.keys(generated).forEach((key)=>{
            value[key] = generated[key];
        });
        cb(null, value);
    }).catch((ex)=>{
        console.log(ex);
    });
}

const nextId = (instance)=>{
    let id = 1;
    while(instance.instances[id]) id++;
    return id;
};

const getEndpoint = (ob, type)=>{
    let res = ob.api.endpoints.find((item)=>{
        return item.options.name === type;
    });
    return res;
};

const save = (ob, identifier, type, item, cb)=>{
    let instance = getEndpoint(ob, type);
    if(!instance) return setTimeout(
        ()=> cb(new Error('No registered type:'+type))
    );
    if(!item[identifier]){
        item[identifier] = nextId(instance);
    }
    instance.instances[item[identifier]] = item;
    setTimeout(()=>{
        cb(null, item);
    });
};

DummyEndpoint.prototype.attach = function(expressInstance){
    if(!this.api.outputFormat) throw new Error('no output format');
    this.api.outputFormat.mutateEndpoint(this);
    if(expressInstance) this.api.outputFormat.attach(expressInstance, this);
}

DummyEndpoint.prototype.config = function(){
    return this.api.config(this.options.path);
}

DummyEndpoint.prototype.errorSpec = function(){
    return this.api.errorSpec(this.options.path);
}

DummyEndpoint.prototype.resultSpec = function(){
    return this.api.resultSpec(this.options.path);
}

DummyEndpoint.prototype.loadSchema = function(filePath, extension, callback){
    let fixedPath = filePath[0] === '/'?filePath:path.join(process.cwd(), filePath);
    switch(extension){
        case 'spec.js':
            try{
                schema = require(fixedPath);
                schema = joiToJSONSchema(schema);
                setTimeout(()=>{
                    callback(null, schema);
                });
            }catch(ex){
                callback(ex);
            }
            break;
        case 'spec.json':
            fs.readFile(fixedPath, (err, body)=>{
                try{
                    schema = JSON.parse(body);
                    schema = jsonToJSONSchema(schema);
                    callback(null, schema);
                }catch(ex){
                    callback(ex);
                }
            });
            break;
        case 'spec.schema.json':
            fs.readFile(fixedPath, (err, body)=>{
                try{
                    schema = JSON.parse(body);
                    schema = jsonToJSONSchema(schema);
                    callback(null, schema);
                }catch(ex){
                    callback(ex);
                }
            });
            break;
        default : throw new Error('Unrecognized extension: '+extension);
    }
}

DummyEndpoint.prototype.load = function(dir, name, extension, cb){
    const callback = ks(cb);
    const filePath = path.join(dir, `${name}.${extension}`);
    const requestPath = filePath.replace('.spec.', '.request.');
    const optionsPath = path.join(dir, `${name}.options.json`);
    fs.readdir(dir, (err, list)=>{
        let exampleFiles = list.filter(listname =>{
            return (listname.indexOf(`.${name}.example.json`) !== -1) ||
                (listname.indexOf(`.${name}.input.json`) !== -1);
        });
        let matched = null;
        if(exampleFiles.length){
            let examples = exampleFiles.filter(listname => listname.indexOf(`.${name}.example.json`) !== -1);
            let inputs = exampleFiles.filter(listname => listname.indexOf(`.${name}.input.json`) !== -1);
            matched = examples.map((i)=>{ return {
                output: i,
                input: (
                    inputs.filter(
                        item =>  item.indexOf(`${i.split('.').shift()}.${name}.input.json`) === 0
                    )[0]
                )
            }});
            //now load
            matched = matched.map((item)=>{
                let res = {};
                if(item.input) res.input = require(
                    dir[0] === '/'?
                    path.join(dir, item.input):
                    path.join(process.cwd(), dir, item.input)
                );
                if(item.output) res.output = require(
                    dir[0] === '/'?
                    path.join(dir, item.output):
                    path.join(process.cwd(), dir, item.output)
                );
                return res;
            });
        }
        this.loadSchema(filePath, extension, (err, schema)=>{
            if(err) return callback(err);
            this.schema = schema;
            this.originalSchema = JSON.parse(JSON.stringify(schema));
            let config = this.config();
            let primaryKey = config.primaryKey || 'id';
            if(matched){
                matched.forEach((item)=>{
                    if(item.output && item.output[primaryKey]){
                        this.instances[item.output[primaryKey]] = item.output;
                    }
                });
                //TODO: handle inputs
            }
            if(config && config.auditColumns && config.auditColumns['$_root']){
                config.auditColumns = joiToJSONSchema(config.auditColumns);
            }
            if(config.auditColumns && config.auditColumns.properties){
                Object.keys(config.auditColumns.properties).forEach((key)=>{
                    this.schema.properties[key] = config.auditColumns.properties[key];
                });
            }
            if(config.auditColumns && config.auditColumns.required){
                config.auditColumns.required.forEach((key)=>{
                    this.schema.required.push(key);
                });
            }
            this.loadSchema(requestPath, extension, (err, requestSchema)=>{
                if(!err){
                    this.requestSchema = requestSchema;
                }
                fs.readFile(optionsPath, (err, body)=>{
                    if(err) return callback(err);
                    try{
                        this.endpointOptions = JSON.parse(body);
                        this.cleanupOptions(this.endpointOptions);
                    }catch(ex){
                        callback(ex);
                    }
                });
            });
        });
    });
    return callback.return;
}


module.exports = DummyEndpoint;
