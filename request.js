const Guest= require("./guest.js");

var method= Request.prototype;

function Request(trackId, guest) {
	this._trackId= trackId;
	this._votesYes= 0;
	this._votesNo= 0;
	this._guest= guest;
}

method.getTrackId= function() {
    return this._trackId;
};

method.votesYes = function() {
    return this._votesYes;
};

method.votesNo = function() {
    return this._votesNo;
};

method.getGuest= function() {
    return this._guest;
};

module.exports = Guest;