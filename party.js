const Guest = require('./guest.js')
const Request = require('./request.js')

var method = Party.prototype;

function Party(partyName, pw, hostID, playlist) {
	this._partyName = partyName;
	this._password = pw;
	this._hostID = hostID;
	this._playlist = playlist;
	this._requests = [];
	this._guests = [host]
}

method.getPartyName = function() {
	return partyName;
};

method.getPlaylistURI = function() {
	return playlist;
};

method.getGuests = function() {
	var guestIDs = [];
	this._guests.foreach(function(guest) {
		guestIDs.push(guest.getSenderID);
	});
	return guestIDs;
};

method.addGuest = function(newGuest) {
	this._guests.push(newGuest);
};

method.addRequest = function(newRequest) {
	this._requests.push(newRequest);
};

method.getFirstRequest = function() {
	return this._requests.shift();
};
