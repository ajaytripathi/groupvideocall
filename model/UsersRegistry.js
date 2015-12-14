/**
 * New node file
 */
var log4js = require('log4js');
var UserSession  = require('./UserSession');

/* Room corresponds to each conference room*/
function UsersRegistry() {
	"use strict";
	
	/* If this constructor is called without the "new" operator, "this" points
	 * to the global object. Log a warning and call it correctly. */
	if (false === (this instanceof UsersRegistry)) {
		console.log('Warning: UsersRegistry constructor called without "new" operator');
		return new UsersRegistry();
	}

	var log = log4js.getLogger('web');
	var usersByName = {};
	var usersBySessionId = {};
	var idCounter = 0;
	
	this.register = function(usersession){
		usersByName[usersession.getName()] = usersession;
		usersBySessionId[usersession.getWebSessionId()] = usersession;
	}
	
	this.getByName = function(name){
		return usersByName[name];
	}
	
	this.exists = function(name) {
		var isUserExists = !!usersByName[name];
		return isUserExists;
	}

	this.getBySession = function(id){
		return usersBySessionId[id];
	}
	
	this.removeBySession = function(id) {
		var user = this.getBySession(id);
		if(user){
			delete usersByName[user.getName()];
			delete usersBySessionId [user.getWebSessionId()];
		}
		return user;
	}
	

	this.nextUniqueId = function() {
		idCounter++;
		if(idCounter < 0){
			idCounter = 1; // reset the counter, we will never have 65535 simultaneous clients anytime soon.
			// lets try finding number which does not exist in our map
			while (idExists(idCounter)) idCounter++;
		}
		return idCounter.toString();
	}
	
	this.idExists = function(id){
		if (!usersBySessionId[id])
			return false;
		return true;
	}
	
	this.printRegistryInfo = function(){
		//log.debug("usersByName --> ", usersByName);
		//log.debug("usersBySessionId --> ", usersByName);
	}

}

module.exports.UsersRegistry = UsersRegistry;