'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var querystring = require('qs');
var Party = require("./party.js")
const SpotifyWebApi = require('spotify-web-api-node');

var redirectUri = 'https://safe-badlands-68520.herokuapp.com/callback/',
    clientId = 'f13b2795eee8443a9eef41050f0054a2',
    clientSecret = '927c7af2338f4a7eb371884a436446a7';

var spotifyApi = new SpotifyWebApi({
  clientId : clientId,
  clientSecret : clientSecret,
  redirectUri : redirectUri,
});

var userObj = "";

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
	res.send(req.query['hub.challenge'])
})

const token = "EAAStcXwYvj0BANT3zJEGr1Iq9yDJaQuGyOpoSDUPyjW7HtGHNVc8groZBWqpzSQzaZBqxJNBnhEr4aehFweZCHuQZA5vdHcajZBOCw7ftiqROmua4VbtgZCcpq7uqlkwwbu6neA4fJZCzZCfTEoxXAeiDw8vML8vawl2PlZBezTLu8wZDZD"

// for Facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'example_token') {
		res.send(req.query['hub.challenge'])
	}
	res.send("Error, wrong token")
});

// for Spotify login
app.get('/callback/', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  	var code = req.query.code || null;
    var authOptions = {
	      url: 'https://accounts.spotify.com/api/token',
	      form: {
	        code: code,
	        redirect_uri: redirectUri,
	        grant_type: 'authorization_code'
	      },
	      headers: {
	        'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))
	      },
	      json: true
  	}
    
    request.post(authOptions, function(error, response, body) {
      	if (!error && response.statusCode === 200) {

	        var access_token = body.access_token,
	            refresh_token = body.refresh_token;

	        var options = {
	          url: 'https://api.spotify.com/v1/me',
	          headers: { 'Authorization': 'Bearer ' + access_token },
	          json: true
	        };

	        // use the access token to access the Spotify Web API
	        request.get(options, function(error, response, body) {
	          userObj = body;
	        });
    	}
	});

	res.redirect("https://www.messenger.com/t/414205672270256");
});

var createPartyRE = /^createparty \"(.+)\" \"(.+)\"$/
var joinParty = /^joinparty \"(.+)\" \"(.+)\"$/
var requestSong = /^requestsong \"(.+)\" \"(.+)\"$/
var found = [];

// After user commands
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
	    let event = req.body.entry[0].messaging[i]
	    let sender = event.sender.id
	    if (event.message && event.message.text) {
	    	let text = event.message.text;
		    let lowerCaseText = text.toLowerCase().trim();
		    if (lowerCaseText === 'login') {
		    	spotifyLogin(sender)
		    }
		    else if (lowerCaseText === 'userinfo') {
  		    	if (userObj)
  		    		sendTextMessage(sender, "You are logged in as " + userObj["email"])
  		    	else
  		    		sendTextMessage(sender, "You are not logged in. Type 'login' to get started!")
  		    }
  		    else if (found = lowerCaseText.match(createPartyRE)) {
  		    	var partyName = found[1];
  		    	var partyCode = found[2];

  		    	spotifyApi.getMe()
  		    	  .then(function(data) {
  		    	  	var username = data.body["user_id"];
  		    	  	sendTextMessage(sender, username);
  		    	    console.log('Some information about the authenticated user', data.body);
  		    	  }, function(err) {
  		    	    console.log('Something went wrong!', err);
  		    	  });

  		    	spotifyApi.createPlaylist('thelinmichael', 'My Cool Playlist', { 'public' : false })
  		    	  .then(function(data) {
  		    	    console.log('Created playlist!');
  		    	  }, function(err) {
  		    	    console.log('Something went wrong!', err);
  		    	  });
  		    }
  		    else if (lowerCaseText === 'help') {
  		    	sendTextMessage(sender, "-login\n-userInfo\n-createParty \"<partyName>\" \"<partyCode>\"\n-joinParty \"<partyName>\" \"<partyCode>\"\n-requestSong \"<songTitle>\" \"<artistName>\"\n")
  		    }
		    else {
		    	sendTextMessage(sender, text + " is not a valid command. Type 'help' for list of commands.")
		    }
	    }
	    if (event.postback) {
	    		let text = JSON.stringify(event.postback)
	      	    sendTextMessage(sender, "Postback received: " + text)
	    }
    }
    res.sendStatus(200)
})

function spotifyLogin(sender) {
	var scopes = 'user-read-private user-read-email';
	var loginURL = 'https://accounts.spotify.com/authorize' + 
	  '?response_type=code' +
	  '&client_id=' + clientId + '&scope=' + encodeURIComponent(scopes) +
	  '&redirect_uri=' + encodeURIComponent(redirectUri);

	let messageData = {
	    "attachment": {
		    "type": "template",
		    "payload": {
				"template_type": "button",
				"text":"To use this bot, you must login to your Spotify account using the link below",
			    "buttons": [
			    	{
					    "type": "web_url",
					    "url": loginURL,
					    "title": "Log In"
					}
			    ]
		    }
	    }
    }
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token:token},
	    method: 'POST',
	    json: {
		    recipient: {id:sender},
		    message: messageData,
	    }
    }, function(error, response, body) {
	    if (error) {
		    console.log('Error sending messages: ', error)
	    } else if (response.body.error) {
		    console.log('Error: ', response.body.error)
	    }
    })
}

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token:token},
	    method: 'POST',
		json: {
		    recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
		    console.log('Error sending messages: ', error)
		} else if (response.body.error) {
		    console.log('Error: ', response.body.error)
	    }
    })
}

function sendGenericMessage(sender) {
    let messageData = {
	    "attachment": {
		    "type": "template",
		    "payload": {
				"template_type": "generic",
			    "elements": [{
					"title": "First card",
				    "subtitle": "Element #1 of an hscroll",
				    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
				    "buttons": [{
					    "type": "web_url",
					    "url": "https://www.messenger.com",
					    "title": "web url"
				    }, {
					    "type": "postback",
					    "title": "Postback",
					    "payload": "Payload for first element in a generic bubble",
				    }],
			    }, {
				    "title": "Second card",
				    "subtitle": "Element #2 of an hscroll",
				    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
				    "buttons": [{
					    "type": "postback",
					    "title": "Postback",
					    "payload": "Payload for second element in a generic bubble",
				    }],
			    }]
		    }
	    }
    }
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token:token},
	    method: 'POST',
	    json: {
		    recipient: {id:sender},
		    message: messageData,
	    }
    }, function(error, response, body) {
	    if (error) {
		    console.log('Error sending messages: ', error)
	    } else if (response.body.error) {
		    console.log('Error: ', response.body.error)
	    }
    })
}

// Spin up the server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})