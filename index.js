'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const passport = require('passport')
var SpotifyStrategy = require('passport-spotify/lib/passport-spotify/index').Strategy;
const app = express()
var querystring = require('qs');
var Party = require("./party.js")
const SpotifyWebApi = require('spotify-web-api-node');

var redirectUri = 'https://safe-badlands-68520.herokuapp.com/auth/spotify/callback/',
    clientId = 'f13b2795eee8443a9eef41050f0054a2',
    clientSecret = '927c7af2338f4a7eb371884a436446a7';

var spotifyApi = new SpotifyWebApi({
  clientId : clientId,
  clientSecret : clientSecret,
  redirectUri : redirectUri,
});

var user = "";

app.set('port', (process.env.PORT || 5000))
app.use(passport.initialize());
app.use(passport.session());

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

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// for Spotify login
passport.use(new SpotifyStrategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: "https://safe-badlands-68520.herokuapp.com/auth/spotify/callback/"
  },
  function(accessToken, refreshToken, profile, done) {
  	user = profile.id;
  	return done("", profile.id);
  }
));

app.get('/auth/spotify/', passport.authenticate('spotify', 
	{scope: ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-modify-private', 'streaming'], showDialog: true}),
	function(req, res) {
	});

app.get('/auth/spotify/callback/',
  passport.authenticate('spotify', { failureRedirect: '/auth/spotify' }),
  function(req, res) {
    // Successful authentication, redirect home. 
    res.redirect('https://www.messenger.com/t/414205672270256');
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
  		    	var playlistName = partyName + " Playlist";

  		    	// spotifyApi.getMe()
  		    	//   .then(function(data) {
  		    	//     sendTextMessage('Some information about the authenticated user', JSON.stringify(data.body));
  		    	//   }, function(err) {
  		    	//     console.log('Something went wrong getMe!', err);
  		    	//   });


  		    	spotifyApi.createPlaylist(user, playlistName, { 'public' : false })
  		    	  .then(function(data) {
  		    	    sendTextMessage(sender, "Made playlist " + playlistName)
  		    	  }, function(err) {
  		    	    console.log('Something went wrong createPlaylist!', err);
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
	var loginURL = "https://safe-badlands-68520.herokuapp.com/auth/spotify/"

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

// Spin up the server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})