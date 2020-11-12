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

module.exports = router;
