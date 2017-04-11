'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var querystring = require('qs');
var Party = require("./party.js")
const SpotifyWebApi = require('spotify-web-api-node');
var createPartyRE = /^createParty \"(.+)\" \"(.+)\"$/i
var joinParty = /^joinParty \"(.+)\" \"(.+)\"$/i
var requestSong = /^requestSong \"(.+)\" \"(.+)\"$/i
var found = [];
var currentParty= null;
var scopes = ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-modify-private', 'streaming', 'playlist-modify', 'playlist-modify-public']
var code = "";

var redirectUri = 'https://safe-badlands-68520.herokuapp.com/callback/',
    clientId = 'f13b2795eee8443a9eef41050f0054a2',
    clientSecret = '927c7af2338f4a7eb371884a436446a7';

var spotifyApi = new SpotifyWebApi({
  clientId : clientId,
  clientSecret : clientSecret,
  redirectUri : redirectUri
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

const token = "EAAStcXwYvj0BAHhgZAeyZBwBhyYIqX1IPEk5CawRCcbZCJdk0OSzqcfvAk2UtdYaBaKs2DZClTajYafrtUEhJsSTKqSBSoPEnMPtEZCOQ46kvOQ3sEFYPTZAFswRG8AAdygYhO6NnCU3yLst38n6exStKyZCF9HMTuwebwSstAs0QZDZD"

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

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
  	code = req.query.code || null;

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

      		spotifyApi.setAccessToken(body.access_token)
      		spotifyApi.setRefreshToken(body.refresh_token)

	        var options = {
	          url: 'https://api.spotify.com/v1/me',
	          headers: { 'Authorization': 'Bearer ' + body.access_token },
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

// from FreeCodeCamp.com
function titleCase(str) {
  str = str.toLowerCase().split(' ');
  for (var i = 0; i < str.length; i++) {
    str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
  }
  return str.join(' ');
}

// After user commands
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
	    let event = req.body.entry[0].messaging[i]
	    let sender = event.sender.id
	    if (event.message && event.message.text) {
	    	let text = event.message.text;
		    let lowerCaseText = text.toLowerCase().trim();
		    if (lowerCaseText == 'login') {
		    	spotifyLogin(sender)
		    }
		    else if (lowerCaseText === 'userinfo') {
  		    	if (userObj)
  		    		sendTextMessage(sender, "You are logged in as " + userObj["email"])
  		    	else
  		    		sendTextMessage(sender, "You are not logged in. Type 'login' to get started!")
  		    }
  		    else if (found = lowerCaseText.match(createPartyRE)) {
  		    	var partyName = titleCase(found[1]);
  		    	var partyCode = found[2];
  		    	var playlistName = partyName + " Playlist";

  		    	spotifyApi.authorizationCodeGrant(code)
  		    	    .then(function(data) {
	    	            spotifyApi.setAccessToken(data.body['access_token']);
	    	            spotifyApi.setRefreshToken(data.body['refresh_token']);
  		    	}, function(err) {
    				console.log('Something went wrong authorizationCodeGrant!', err);
  				});

  		    	var playlistId = "";

  		    	spotifyApi.createPlaylist(userObj['id'], playlistName, { public : false })
  		    	  .then(function(data) {
  		    	  	playlistId = data.body.id
  		    	    sendTextMessage(sender, "success! created playlist: " + JSON.stringify(data.body.id))
  		    	  }, function(err) {
  		    	    console.log('Something went wrong createPlaylist!', err);
  		    	  });

  		    	if (playlistId) {
  		    		currentParty= new Party(partyName, partyCode, sender, playlistId);
  		    		// res.sendStatus(200);
  		    	}
  		    	else {
  		    		sendTextMessage(sender, "Party playlist could not be created, login and try again!");
  		    	}
  		    	res.sendStatus(200);
  		    }
  		    else if (lowerCaseText === 'help') {
  		    	sendTextMessage(sender, "-login\n-userInfo\n-createParty \"<partyName>\" \"<partyCode>\"\n-joinParty \"<partyName>\" \"<partyCode>\"\n-requestSong \"<songTitle>\" \"<artistName>\"\n")
  		    }
		    else {
		    	sendTextMessage(sender, text + " is not a valid command. Type 'help' for list of commands.")
		    }
	    }
    }
    res.sendStatus(200)
})

function spotifyLogin(sender) {
	const state = generateRandomString(16);
	var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

	let messageData = {
	    "attachment": {
		    "type": "template",
		    "payload": {
				"template_type": "button",
				"text":"To use this bot, you must login to your Spotify account using the link below",
			    "buttons": [
			    	{
					    "type": "web_url",
					    "url": authorizeURL,
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

// Spin up the server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})