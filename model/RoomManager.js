/**
 * New node file
 */
var log4js = require('log4js');
var Room  = require('./Room').Room;
var cfg = require('../global');
var kurento = require('kurento-client');

/* Room corresponds to each conference room*/
function RoomManager () {
	"use strict";
	
	/* If this constructor is called without the "new" operator, "this" points
	 * to the global object. Log a warning and call it correctly. */
	if (false === (this instanceof RoomManager)) {
		console.log('Warning: RoomManager constructor called without "new" operator');
		var mgr = new RoomManager();
		// Initialization 
		return mgr;
	}

	var log = log4js.getLogger('web');
	
	/**
	 * Kurento media client API
	 */
	var kurentoClient = null;
	
	/**
	 * collection rooms, associate array
	 */
	var rooms = {};

	/**
	 * Object initialization 
	 */
	this._init_ = function(){
		// start connecting with media server
		setTimeout(connectToMediaServer, 100);
	}

	
	/**
	 * roomName
	 *            the name of the room
	 * @return the room if it was already created, or a new one if it is the
	 *         first time this room is accessed
	 */
	
	this.getRoom = function(roomName, callback){
		log.debug("Searching for room {}".format(roomName));
		var isRoomExists = !!rooms[roomName];
		log.info("ROOM MGR {}: room exist {}".format(roomName,isRoomExists));
		
		if(!isRoomExists){
			log.debug("Room {} not existent. Will create now!".format(roomName));
			//room = new Room(roomName, kurento.createMediaPipeline());
			this.createMediaPipeline(function(error, pipeline) {
				if (error) {
					return callback(error);
				}
				
				var room = new Room(roomName, pipeline);//kurento.createMediaPipeline());
				rooms[roomName] = room;				
				return callback(null, room);
			});
		}else {
			log.debug("Room {} exisit. Will use the same!".format(roomName));
			var room = rooms[roomName];
			return callback(null, room);
		}
	}
	
	/**
	 * 
	 */
	this.getExistingRoom = function(roomName){
		return rooms[roomName];
	}

	/**
	 * Removes a room from the list of available rooms
	 */
	this.removeRoom = function (room){
		if(rooms[room.getName()])
			delete rooms[room.getName()];
		
		room.close();
		log.info("Room {} removed and closed".format(room.getName()));
	}
	
	/**
	 * Print room information
	 */
	this.printRoomStack = function(){
		log.debug("Room data", rooms);
	}
	
	/**
	 * Get media library 
	 */
	this.getMediaHandle = function(){
		return kurentoClient;
	}
	
	/** 
	 * Media server connection management 
	 */
	var isconnected = false;
	function connectToMediaServer()
	{
		log.info("Connecting with Media Server -- ", cfg.argv.ws_uri);
		connectWithKurentoServer(function(error, kurentoClient) {		
			if(error) {
				log.info(error);
				isconnected = false;
				kurentoClient = null;
				setTimeout(connectToMediaServer, 1000);
				return;
			}
			
			log.info("Connected with Media Server -- ", cfg.argv.ws_uri);
			isconnected = true;
			// set kurentoClient value in global objects 
			cfg.kurentoClient = kurentoClient;
			// set close event 		
			kurentoClient.on('disconnect', function (evt) {
				log.info("Disconnected  with Media Server -- ", cfg.argv.ws_uri);
				handleClose(evt)
			});
		});	
	}

	function handleClose(event){
		log.info("Connection to Media server is lost..");
		var code = event.code;
	    var reason = event.reason;
	    var wasClean = event.wasClean;
		kurentoClient =  null;
		isconnected = false;
		// sleep for 
		// disconnect all connect client and restart the media server client
		connectToMediaServer();
	}

	// Recover kurentoClient for the first time.
	function connectWithKurentoServer(callback) {
	    if (kurentoClient !== null) {
	        return callback(null, kurentoClient);
	    }

	    kurento(cfg.argv.ws_uri, function(error, _kurentoClient) {
	        if (error) {
	            log.info("Could not find media server at address " + cfg.argv.ws_uri);
	            return callback("Could not find media server at address" + cfg.argv.ws_uri
	                    + ". Exiting with error " + error);
	        }

	        kurentoClient = _kurentoClient;
			

	        callback(null, kurentoClient);
	    });
	}

	function getKurentoClient(callback) {
	    if (kurentoClient !== null) {
	        return callback(null, kurentoClient);
	    } else {
			log.info("Could not find media server at address " + cfg.argv.ws_uri);
	        return callback("Could not find media server at address" + cfg.argv.ws_uri
	                    + ". Exiting with error ");
		}
	}
	
	/**
	 * 
	 */
	this.createMediaPipeline = function(callback){
		getKurentoClient(function(error, kurentoClient) {
			if (error) {
				return callback(error);
			}

			log.info("initialized  getKurentoClient " );
			kurentoClient.create('MediaPipeline', function(error, pipeline) {
				if (error) {
                     kurentoClient = null;
                     return callback(error);
 				}
				callback(null, pipeline);
			});
			
		});
	}
	
}

module.exports.RoomManager = RoomManager;