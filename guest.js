var method= Guest.prototype;

function Guest(senderId, firstName, lastName) {
	this._senderId= senderId;
	this._firstName= firstName;
	this._lastName= lastName;
}

method.getSenderId= function() {
    return this._senderId;
};

method.getFirstName = function() {
    return this._firstName;
};

method.getLastName = function() {
    return this._lastName;
};

module.exports = Guest;