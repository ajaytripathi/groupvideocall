var cfg = require('../global');

var express = require('express');
var log4js = require('log4js');
var kurento = require('kurento-client');

var UserSession  = require('../model/UserSession').UserSession;
var UserRegistry  = require('../model/UsersRegistry').UsersRegistry;
var RoomManager  = require('../model/RoomManager').RoomManager;

exports = module.exports = (function (ws)  {
	var logger = log4js.getLogger('web');
	var webrtclog = log4js.getLogger('webrtc');
	var registry = new UserRegistry();
	var roomManager = new RoomManager();
	
	_init_();

	/**
	 * One time init
	 */
	function _init_(){
		roomManager._init_();
	}
	
	/*
	 * Management of WebSocket messages
	 */
	ws.on('connection', function(ws) {
		var sessionId = ws.session_id;
   		var user = registry.getBySession(sessionId);
    	if (sessionId && registry.getBySession(sessionId)) {
    		logger.debug("Incoming message from user '{}': {}".format( user.getName(),
					_message));
		} else {
			ws.session_id = registry.nextUniqueId();
			logger.debug("Incoming message from new user ");
		}
		
	    ws.on('message', function(_message) {
	   		var sessionId = ws.session_id;
	   		logger.info('Connection ' + sessionId + ' received message ', _message.id);
	   		webrtclog.info('Connection ' + sessionId + ' received message ', _message);
	   		
	   		var user = registry.getBySession(sessionId);
	    	if (sessionId && registry.getBySession(sessionId)) {
	    		logger.debug("Incoming message from user '{}': {}".format( user.getName(),
						_message.id));
	    		logger.debug("user '{}': message id {}".format(user.getName(),_message.id));
	    		webrtclog.debug("Incoming message from user '{}': {}".format( user.getName(),
						_message.id));
			} else {
				ws.session_id = registry.nextUniqueId();
				logger.debug("Incoming message from new user ");
			}

	    	var message = JSON.parse(_message);
	        switch (message.id) {
	        case 'joinRoom':
				// tell others, we have started!
	        	joinRoom(message, ws);
				break;
	        case "receiveVideoFrom":
				var senderName = message.sender;
				// UserSession 
				var sender = registry.getByName(senderName);
				var sdpOffer = message.sdpOffer;
				user.receiveVideoFrom(sender, sdpOffer, function(error) {
					if(error)
						logger.warn("receiveVideoFrom {}: something wrong", senderName);
				});
				break;
	        case "leaveRoom":
				leaveRoom(user);
				break;
	        case "onIceCandidate":
	        	onIceCandidate(sessionId, message);
				break;
	        default:
	            ws.send(JSON.stringify({
	                id : 'error',
	                message : 'Invalid message ' + message
	            }));
	            break;
	        }
	    });
	    
	    ws.on('error', function(error) {
	        logger.error('Connection ' + ws.session_id + ' error');
			webrtclog.error('Connection ' + ws.session_id + ' error');
	        stop(sessionId);
	    });

	    ws.on('close', function() {
	        logger.info('Connection ' + ws.session_id + ' closed');
			webrtclog.info('Connection ' + ws.session_id + ' closed');
			var user = registry.removeBySession(ws.session_id);
			if(user) {
				leaveRoom(user);
			}
	    });
	    
	    
		function joinRoom( message,  session)
		{
			var roomName = message.room;
			var name = message.name;
			logger.info("PARTICIPANT {}: trying to join room {}".format( name, roomName));
		
			roomManager.getRoom(roomName, function(error, room ){
				if(error) {
					logger.info('Error occurred ', error);
					return;
				}
					
				// User session
				room.join(name, session, function (error, user){
					if(error){
						logger.info('Error occurred ', error);
						return;						
					}
					registry.register(user);
					
					roomManager.printRoomStack()
					registry.printRegistryInfo();
				});
			});
		}

		/**
		 * UserSession user
		 */
		function leaveRoom(user)  {
			if(!user) {
				logger.info("PARTICIPANT {}: leaving room failed, empty user");
				return;
			}

			logger.info("PARTICIPANT {}: leaving room {}".format( user.getName(), user.getRoomName()));
			var room = roomManager.getExistingRoom(user.getRoomName());
			if(room){
				logger.info("Leaving room function ");
				room.leave(user, function(error) {
					if(error){
						logger.info("LEAVE ROOM : failed ", error);
						return;						
					}
					logger.info("participant count left -- ", Object.keys(room.getParticipants()).length);
	
					if (Object.keys(room.getParticipants()).length == 0) {
						logger.info("PARTICIPANT {}: Last participant leaving, deleting room ".format( user.getName(), user.getRoomName()));
						roomManager.removeRoom(room);
					}
				});
				registry.removeBySession(user.getWebSessionId());
			}else {
				logger.info("PARTICIPANT {}: unable to find room in register {}".format(user.getRoomName()));
			}
		}
		
		/**
		 * 
		 */
		function onIceCandidate(sessionId, message) {
			logger.info("ICE Candidate {}: name {}".format(sessionId, message.name));
			webrtclog.info("ICE Candidate {}: name {}".format(sessionId, message.name));	
			webrtclog.info("ICE Candidate {}: media {}".format(roomManager.getMediaHandle()));			
		    var candidate = kurento.register.complexTypes.IceCandidate(message.candidate);
		    var user = registry.getBySession(sessionId);
		    if(user)
		    	user.addCandidate(message.name, candidate);
		}
	});
});

