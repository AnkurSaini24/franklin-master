//require('dotenv').config()
const express = require('express')
// will use this later to send requests
const http = require('http')
const https = require('https')
// import env variables
//require('dotenv').config()

var router = express.Router();

router.get('/', function (req, res, next) {    
    res.send('Router is come here!');
});

router.post('/',(req, res,next) => {
	//console.log('post called!');
	//var intentName = req.body.queryResult.intent.displayName;
	
	console.log('ankur');
	console.log(intentName);
	console.log(req.body);
});

module.exports = router;
