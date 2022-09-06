const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const PerigressTest = require('../test/util.js');

module.exports = (target, format)=>{
	
	// Instantiate a Mocha instance.
	var mocha = new Mocha();
	
	var current = process.cwd();
	var testDir = current+'/test';
	
	var dir = fs.readdirSync(testDir);
	
	if(fs.existsSync('/test.js')){ //root test script
		mocha.addFile(
			path.join(current, 'test.js')
		);
	}else{ // /test subdirectory
		dir.filter(function(file){
			// Only keep the .js files
			return file.substr(-3) === '.js';
		}).forEach(function(file){
			mocha.addFile(
				path.join(testDir, file)
			);
		});
	}

	PerigressTest.apiFrom(target, format, (err, {api, server})=>{
		// Run the tests.
		global.perigressAPI = api;
		//this server only existed to be profiled
		server.close(()=>{
			mocha.run(function(failures){
				log();
				process.on('exit', function () {
					process.exit(failures);  // exit with non-zero status if there were failures
				});
			});
		});
	});
}
