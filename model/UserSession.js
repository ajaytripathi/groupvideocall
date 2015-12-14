/**
 * New node file
 */

var cfg = require('../global');
var kurento = require('kurento-client');

/* The UsersDAO must be constructed with a connected database object */
function UserSession(name,  roomName, ws, pipeline) {
	"use strict";

	var log4js = require('log4js');
	var log = log4js.getLogger('web');
	var webrtclog = log4js.getLogger('webrtc');
	this.session = ws;
	this.pipeline = pipeline;
	this.name = name;
	this.roomName = roomName;
	// webrtc end point
	this.outgoingMedia = null;
	// name and webrtc end point
	this.incomingMedia = {};

	this.getName = function() {
		return this.name;
	}

	this.getWebSessionId = function(){
		return this.session.session_id;
	}

	this.getRoomName = function(){
		return this.roomName;
	}

	this.getOutgoingWebRtcPeer = function() {
		return this.outgoingMedia;
	}

	this.setOutgoingWebRtcPeer = function(endpoint){
		this.outgoingMedia = endpoint;
	}

	/**
	 * Class init
	 */
	this._init_ = function(){
		log.info("USER {}: class init_ {}".format(this.name, this.roomName));

		var self = this;
		this._setupEndpoints(this.name, function(error, webrtcendpoint){
			if(error){
				log.info("Error occured ", error);				
			}			
			self.setOutgoingWebRtcPeer(webrtcendpoint);
		});
	}

	/** 
	 * Setup initial outgoing end point
	 */
	this._setupEndpoints = function(name, callback)
	{
		var self = this;
		self.pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
			if (error) {
				return callback(error);
			}

			webRtcEndpoint.on('OnIceCandidate', function(event) {
				var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
				var iceMsg = {
						id : 'iceCandidate',
						name : name,
						candidate : candidate
				};
				self.sendMessage(iceMsg);

			});
			callback(null, webRtcEndpoint);
		});


	}

	this.addCandidate = function(name, candidate){
		/**
		 * 
		 */
		if(this.name === name){
			this.outgoingMedia.addIceCandidate(candidate);
		}else {
			var webRtc = this.incomingMedia[name];
			if (webRtc != null) {
				webRtc.addIceCandidate(candidate);
			}
		}
	}

	this.sendMessage = function(message){
		webrtclog.debug("USER {}: sending message -- {} )".format(this.name, JSON.stringify(message)));
		log.debug("USER {}: sending message -- {} )".format(this.name, JSON.stringify(message)));
		
		this.session.send(JSON.stringify(message));
	}

	this.receiveVideoFrom = function(sender, sdpOffer, callback){
		log.info("USER {}: connecting with {} in room {}".format( this.name,
				sender.getName(), this.roomName));

		webrtclog.trace("USER {}: SdpOffer for {} is {}".format( this.name,
				sender.getName(), sdpOffer));

		log.info("OutWebrtc endpoint ", this.outgoingMedia);
		var self = this;
		this.getEndpointForUser(sender, function(error, webRtcEndpoint) {
			if(error){
				log.info("error occurred ", error);
				return callback(error);
			}

			if(!webRtcEndpoint){
				log.info("unknown error occurred", error);
				return callback('Unable to create webrtc end point');
			}

			webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
				try {
					if (error) {
						log.info("unknown error occurred", error);
						return callback(error);
					}
					
					log.trace("USER {}: SdpAnswer for {} is shared".format(self.name,
							sender.getName()));
					
					webrtclog.trace("USER {}: SdpAnswer for {} is {}".format(self.name,
							sender.getName(), sdpAnswer));
					
					var recAns = {
							id : 'receiveVideoAnswer',
							name: sender.getName(),
							sdpAnswer: sdpAnswer
					};

					self.sendMessage(recAns);
				}catch(e){
					log.debug("failed --- ", e);
					callback(e);
				}
			});

			log.debug("gather candidates");
			webRtcEndpoint.gatherCandidates(function(error) {
				if (error) {
					log.debug("failed --- ", error);
					return callback(error);
				}
			});



		});
	}

	this.getEndpointForUser = function(sender, callback){
		if (sender.getName() === this.name) {
			log.debug("PARTICIPANT {}: configuring loopback".format(this.name));
			return callback( null, this.outgoingMedia);
		}

		log.debug("PARTICIPANT {}: receiving video from {}".format(this.name,
				sender.getName()));

		try {
			var incoming = this.incomingMedia[sender.getName()];
			if (!incoming) {
				log.debug("PARTICIPANT {}: creating new endpoint for {}".format(
						this.name, sender.getName()));

				/**
				 * Create a incoming webrtcend point
				 */
				var self = this;
				this._setupEndpoints(sender.getName(), function(error, incoming){
					self.incomingMedia[sender.getName()] =  incoming;

					sender.getOutgoingWebRtcPeer().connect(incoming, function(error) {
						if (error) {
							return callback(error);
						}
						return callback(null, incoming);
					});
				});
			}else {
				log.debug("PARTICIPANT {}: reusing previous endpoint for {}".format(
						this.name, sender.getName()));
				return callback(null, incoming);
			}
		}catch(e){
			return callback(e);
		}
	}


	/**
	 * @param sender
	 *            the participant
	 */
	this.cancelVideoFrom = function(senderName){
		log.debug("PARTICIPANT {}: canceling video reception from {}",
				this.name, senderName);

		var incoming = this.incomingMedia[senderName];

		if( incoming ){
			log.debug("PARTICIPANT {}: removing endpoint for {}".format( this.name,senderName));
			incoming.release( function(error) {
				if(error ){
					log.warn(
							"PARTICIPANT {}: Could not release incoming EP ".format(
							 senderName));
				}else {
					log.trace("PARTICIPANT {}: Released successfully incoming EP for ".format(
							senderName));
				}
				delete this.incomingMedia[senderName];
			});
		}else {
			log.debug("PARTICIPANT {}: removing endpoint for {}".format(senderName, "incoming end point not found"));
		}
	}

	/**
	 * Close master session
	 */
	this.close = function(){
		log.debug("PARTICIPANT {}: Releasing resources".format( this.name));
		for (var remoteParticipantName in this.incomingMedia) {
			log.trace("PARTICIPANT {}: Released incoming EP for {}".format(this.name,
					remoteParticipantName));

			var endpoint = this.incomingMedia[remoteParticipantName];

			releaseRTCEndPoint(endpoint, this.name, this.roomName);
		}

		releaseRTCEndPoint(this.outgoingMedia, this.name, this.roomName);
	}

	function releaseRTCEndPoint (endpoint, name, groupname){
		endpoint.release( function(error) {
			if(error ){
				log.warn(
						"PARTICIPANT {}: Could not release incoming EP for {}".format(
						name, groupname));
			}else {
				log.trace("PARTICIPANT {}: Released successfully incoming EP for {}".format(
						name, groupname));
			}
		});

	}

}

module.exports.UserSession = UserSession;
