/**
 * New node file
 */
var url = require('url');
var minimist = require('minimist');
var format = require('string-format')
//Extend string prototype
format.extend(String.prototype)

var config = module.exports = {};

config.env = 'development';
config.hostname = 'dev.example.com';

config.argv = minimist(process.argv.slice(2),
		{
	default: {
		as_uri: "https://0.0.0.0:8080/",
		ws_uri: "ws://localhost:8888/kurento"
	}
});
