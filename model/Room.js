/**
 * New node file
 */
var cfg = require('../global');
var UserSession  = require('./UserSession').UserSession;
var log4js = require('log4js');

/* Room corresponds to each conference room*/
function Room(name, pipeline) {
	"use strict";

	var log = log4js.getLogger('web');
	// [String, UserSession]
	this.participants = {};
	// MediaPipeline
	this.pipeline = pipeline;
	// Room name
	this.name = name

	/*
	 * Get Name
	 */
	this.getName = function(){
		return name;
	};

	/**
	 * @param name
	 * @return the participant from this session
	 */
	this.getParticipant = function(name){
		return participants[name];
	}

	/**
	 * Join Room
	 */
	this.join = function(userName, session, callback){
		log.info("ROOM {}: adding participant {}".format(this.name, userName));
		log.info("ROOM {}: existing participants {}".format(this.name, Object.keys(this.participants)));
		var participant = new UserSession(userName, this.name,
				session, this.pipeline);
		participant._init_();
		this.joinRoom(participant);
		this.participants[userName] = participant;
		this.sendParticipantNames(participant);
		callback(null, participant);
	};

	/**
	 * Inform other participants of the rooms of new member
	 */
	this.joinRoom = function (newParticipant){
		var newParticipantMsg = {
				'id': 'newParticipantArrived',
				'name': newParticipant.getName()
		}

		for (var key in this.participants){
			log.debug(
					"ROOM {}: notifying other participants of new participant {}".format(this.name,
					newParticipant.getName()));
			try {
				this.participants[key].sendMessage(newParticipantMsg);
			} catch ( e) {
				log.debug("ROOM {}: participant {} could not be notified".format(newParticipant.getName(), e));
			}
		}
	}

	/**
	 * Participant leaving the room
	 */
	this.leave = function(user, callback){
		log.debug("PARTICIPANT {}: Leaving room {}".format(user.getName(), this.name));
		var self = this;
		this.removeParticipant(user.getName(), function(error){
			if(error)
				return callback(error);
			
			user.close();
			delete self.participants[user.getName()];
			return callback(null);
		});
	};


	/**
	 * 
	 */
	this.removeParticipant = function(name, callback) {
		log.debug("ROOM {}: notifying all users that {} is leaving the room".format(
				this.name, name));

		var participantleftRoomMsg = {
				'id': 'participantLeft',
				'name': name
		};

		// close all the participant sessions
		for (var key in this.participants){
			log.debug(
					"ROOM {}: notifying other participants of leaving participant {}".format(name,
					key));
			try {
				this.participants[key].cancelVideoFrom(name);
				this.participants[key].sendMessage(participantleftRoomMsg);
			} catch ( e) {
				log.debug("ROOM {}: Could not invoke close on participant {}".format(
						name, e));
			}
		}
		
		return callback(null);
	}

	/**
	 * Close the room
	 */
	this.close = function(){
		// close all the participant sessions
		for (var key in this.participants){
			log.debug(
					"ROOM {}: notifying other participants of new participant {}".format(
					name, newParticipant.getName()));
			try {
				participants[key].close();
			} catch ( e) {
				log.debug("ROOM {}: Could not invoke close on participant {}, exception occurred -- {} ".format(
						this.name, user.getName(), e));
			}
		}

		if(pipeline)
			pipeline.release();
		log.debug("Room {} closed".format(this.name));
	}
	
	/**
	 * 
	 */
	this.getParticipants = function(){
		return this.participants;
	}
	
	this.sendParticipantNames = function(user) {
		var participantsList = [];
		for (var key in this.participants){
			if( key !== user.getName())
				participantsList.push(this.participants[key].getName());
		}
		
		var existingParticipantsMsg = {
				'id': "existingParticipants",
				'data': participantsList
		};
		
		user.sendMessage(existingParticipantsMsg);
	}
	
}

module.exports.Room = Room;