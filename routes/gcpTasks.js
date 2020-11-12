const bodyParser = require('body-parser');
const express = require('express');
var slackMsg = require('../slack/slackMessages');
var db = require('../utils/database');
const taskRouter = express();
taskRouter.enable('trust proxy');

// By default, the Content-Type header of the Task request is set to "application/octet-stream"
// see https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#AppEngineHttpRequest
taskRouter.use(bodyParser.raw({
    type: 'application/octet-stream'
}));

taskRouter.get('/', (req, res) => {
    // Basic index to verify app is serving
    res.send('Hello, World!').end();
});

taskRouter.post('/taskhandler', (req, res) => {
    // Log the request payload
    //   console.log('Received task with payload: %s', req.body);
    //   res.send(`Printed task payload: ${req.body}`).end();
    var jsonData = JSON.parse(req.body);


    //var intentName = jsonData.data.queryResult.intent.displayName;
	var intentName = req.body.intentname;



    //slackMsg.getJiraSearchITProj(jsonData.slackUserId, jsonData.channelId, jsonData.data, res);



    //var intentName = jsonData.data.queryResult.intent.displayName;

    switch (intentName) {
        case "JIRA-SpecProj":
            slackMsg.getJiraSearchITProj(jsonData.slackUserId, jsonData.channelId, jsonData.data, res);
            break;
        case "JIRA-MyTasks":
        case "MyTask":
            slackMsg.getJiraMyTasksHandler(jsonData.slackUserId, jsonData.channelId, res);
            break;
        case "bookSearch":
            slackMsg.getbookSearch(jsonData.slackUserId, jsonData.channelId, jsonData.data, res);
            break;
        default:
            db.logError("Unable to match intent. Received: " + intentName, jsonData.slackUserId, 'UNKNOWN', 'gcpTask/taskhandler');
            break;
    }
});

taskRouter.get('*', (req, res) => {
    res.send('OK').end();
});

module.exports = taskRouter;