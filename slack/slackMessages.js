var express = require('express');
const rp = require('request-promise');
var bodyParser = require('body-parser')
var db = require('../utils/database');
var sortUtil = require('../utils/sortUtil');
let libgen = require('../lib/booksearch/index');

var app = express.Router();
app.use(bodyParser.json());


function addMrkUpSlackSection(sectionText) {
    var returnJson = {

        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": sectionText
        }
    };
    return returnJson;

}

function addSlackDivider(sectionText) {
    var returnJson = {
        "type": "divider"
    };
    return returnJson;

}


function sendBlocksToUser(channelId, messageTitle, blocksToSend, res, isLastCall) {
    var options = {
        method: 'POST',
        url: 'https://slack.com/api/chat.postMessage',
        headers: {
            Accept: 'application/json',
            "Content-Type": "application/json; charset=utf-8",
            Authorization: 'Bearer xoxb-2253441267-496152507652-UyJGCtu8aPAKU5EV63p94TTK'
        },
        body: {
            channel: channelId,
            link_names: true,
            text: messageTitle,
            blocks: blocksToSend
        },
        json: true

    };
    return rp(options)
        .then(results => {
            if (isLastCall) {
                res.send("sent message to user").end();
            }
        });
}

function sendAttachmentsToUser(channelId, messageTitle, attachmentArray, res) {
    var options = {
        method: 'POST',
        url: 'https://slack.com/api/chat.postMessage',
        headers: {
            Accept: 'application/json',
            "Content-Type": "application/json; charset=utf-8",
            Authorization: 'Bearer xoxb-2253441267-496152507652-UyJGCtu8aPAKU5EV63p94TTK'
        },
        body: {
            channel: channelId,
            link_names: true,
            text: messageTitle,
            attachments: attachmentArray
        },
        json: true

    };
    return rp(options)
        .then(results => {
            res.send("sent message to user").end();
        });
}

function getJiraPlanActiveSprint() {
    var options = {
        method: 'GET',
        url: 'https://billsdev.atlassian.net/rest/agile/1.0/board/305/sprint',
        headers: {
            Host: 'billsdev.atlassian.net',
            Accept: 'application/json',
            Authorization: 'Basic Z25laWdlckBmcmVlZG9tZmluYW5jaWFsbmV0d29yay5jb206ODVzSWNSSExTRGVua3VkaVlndkU0MUJG'
        }
    };
    return rp(options)
        .then(body => {
            if (error) throw new Error(error);
            var jsonData = JSON.parse(body);

            for (var i = 0; i < jsonData.values.length; i++) {
                var jsonObj = jsonData.values[i];
                var curDate = new Date();

                if (jsonObj.state === "active" && curDate < new Date(jsonObj.endDate) && curDate > new Date(jsonObj.startDate)) {
                    console.log("id: " + jsonObj.id);
                    console.log("name: " + jsonObj.name);
                    console.log("state: " + jsonObj.state);
                    console.log("start date: " + jsonObj.startDate);
                    console.log("End Date: " + jsonObj.endDate);
                }
            }
            //console.log(body);
        });

}

exports.getbookSearch = function (slackUserId, channelId, taskData, res) {
    var blocksToSend = [];
    var countBooksFound = 0;
    var totalProcessed = 0;
    var totalBooksFound = 0;
    var currentlyProcessed = 0;
    var bookToSearch = '';

    try {

        if (taskData.queryResult.queryText) {
            bookToSearch = taskData.queryResult.queryText.toLowerCase().replace(/lookup: /g, "").replace(/search book: /g, "").replace(/book: /g, "").trim();
        }

        libgen(bookToSearch).then(function (books) {
            var resultsData = {
                "data": JSON.parse(JSON.stringify(books))
            };

            totalBooksFound = resultsData.data.length;
            console.log("Search: " + bookToSearch + " total Found: " + totalBooksFound);

            for (var i = 0; i < resultsData.data.length; i++) {
                countBooksFound++;

                currentlyProcessed++;
                var urlDownload = resultsData.data[i].download.toString().replace(/ /g, "%20");
                db.saveBookData(slackUserId, resultsData.data[i].id, resultsData.data[i].title, resultsData.data[i].author, resultsData.data[i].language, resultsData.data[i].filesize, resultsData.data[i].extension, resultsData.data[i].download, resultsData.data[i].bookImage);
                blocksToSend.push(addMrkUpSlackSection("*Found Book*: " + bookToSearch + "\n*TITLE*\n" + resultsData.data[i].title + "\n*AUTHOR*\n" + resultsData.data[i].author));

                blocksToSend.push({
                    "type": "actions",
                    "elements": [{
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "emoji": true,
                            "text": "Download Book (" + resultsData.data[i].extension + ")"
                        },
                        "url": urlDownload,
                        "style": "primary",
                        "value": "do_nothing"
                    }]
                });


                if (currentlyProcessed === 5 || i === totalBooksFound - 1) {
                    sendBlocksToUser(channelId, 'Found Books..', blocksToSend, res, (i === (totalBooksFound - 1)));
                    totalProcessed = totalProcessed + currentlyProcessed;
                    currentlyProcessed = 0;
                    blocksToSend = [];
                }
            }

            if (countBooksFound === 0) {

                blocksToSend.push(addMrkUpSlackSection("*Book Search Results*\nNo books found for *" + bookToSearch + "*.\nTyping less words or key words may work better."));
                sendBlocksToUser(channelId, 'No Books Found..', blocksToSend, res, true);
            }
        }).catch(function (error) {

            blocksToSend.push(addMrkUpSlackSection("*Book Search Results*\nNo books found for *" + bookToSearch + "*.\nTyping less words or key words may work better."));
            sendBlocksToUser(channelId, 'No Books Found..', blocksToSend, res, true);
        });
    } catch (err) {
        console.log("book search err: " + err);

        blocksToSend.push(addMrkUpSlackSection("*Book Search Results*\nNo books found for *" + bookToSearch + "*.\nTyping less words or key words may work better."));
        sendBlocksToUser(channelId, 'No Books Found..', blocksToSend, res, true);
    }
}

exports.getJiraMyTasksHandler = function (slackUserId, channelId, res) {
    var myTasks = [];
    var startAtOffsetMultipiler = 1;
    var tryUserName = '';
    var blocksArray = [];
    var totalProcessed = 0;
    var attachmentArray = [];


    var options = {
        method: 'GET',
        url: 'https://ffn-chatbot-weather-dev.appspot.com/ideas/getSlackUserInfo',
        qs: {
            userid: slackUserId
        },
        headers: {
            Host: 'ffn-chatbot-weather-dev.appspot.com',
            Accept: 'applicaiton/json'
        }
    };

    return rp(options)
        .then(body => {
            var slackUserData = JSON.parse(body);
            //slackFullName = slackUserData.user.profile.real_name;

            if (slackUserData.data.email !== undefined) {
                var splitName = slackUserData.data.email.split("@");
                //var indexOfAtSign = slackUserData.data.email.toString().indexOf("@");
                tryUserName = splitName[0];
            } else {
                tryUserName = '';
            }

            var optionsJira = {
                method: 'GET',
                url: 'https://billsdev.atlassian.net/rest/api/latest/search',
                qs: {
                    jql: 'assignee=' + tryUserName
                },
                headers: {
                    Authorization: 'Basic Z25laWdlckBmcmVlZG9tZmluYW5jaWFsbmV0d29yay5jb206ODVzSWNSSExTRGVua3VkaVlndkU0MUJG',
                    Accept: 'application/json'
                }
            };

            return rp(optionsJira)
                .then(body => {
                    var jsonData = JSON.parse(body);
                    var numItems = jsonData.issues.length;
                    var maxResults = jsonData.maxResults;
                    var offset = startAtOffsetMultipiler * 50;

                    var emojiStr = "";

                    if (numItems > maxResults) {
                        console.log("Num Items exceeds MaxResults " + numItems);
                    }

                    for (var j = 0; j < numItems; j++) {
                        var objData = jsonData.issues[j];
                        if (objData.fields.status.name !== "Done" && objData.fields.status.name !== "Released" && objData.fields.status.name !== "Won't Do") {
                            myTasks.push(objData);
                        }
                    }

                    if (numItems > maxResults) {
                        console.log("Note: Over " + maxResults + " items. Total: " + numItems);
                    }

                    // continue to get other elements in batches of whatever maxResults is.
                    while (numItems > maxResults && numItems < (maxResults * startAtOffsetMultipiler)) {

                        offset = startAtOffsetMultipiler * maxResults;
                        var optionsJiraInner = {
                            method: 'GET',
                            url: 'https://billsdev.atlassian.net/rest/api/latest/search',
                            qs: {
                                jql: 'assignee=' + tryUserName + '&startAt=' + offset.toString()
                            },
                            headers: {
                                Authorization: 'Basic Z25laWdlckBmcmVlZG9tZmluYW5jaWFsbmV0d29yay5jb206ODVzSWNSSExTRGVua3VkaVlndkU0MUJG',
                                Accept: 'application/json'
                            }
                        };

                        return rp(optionsJiraInner)
                            .then(body => {
                                var jsonDataInner = JSON.parse(body);
                                var numItems = jsonDataInner.issues.length;

                                for (var k = 0; k < numItems; k++) {
                                    var objDataInner = jsonDataInner.issues[k];
                                    if (objData.fields.status.name !== "Done" && objData.fields.status.name !== "Released" && objData.fields.status.name !== "Won't Do") {
                                        myTasks.push(objDataInner);
                                    }
                                }
                                startAtOffsetMultipiler++;
                            });
                    }

                    var sortedMyTasks = myTasks.sort(sortUtil.compareTasksDate);

                    var totalFound = sortedMyTasks.length;
                    for (var i = 0; i < totalFound; i++) {
                        if (totalProcessed === 10) {
                            blocksArray = [];
                            totalProcessed = 0;
                        }
                        totalProcessed++;
                        var objData = sortedMyTasks[i];
                        var actionArray = [];
                        emojiStr = "";
                        status = objData.fields.status.name;
                        if (objData.fields.customfield_13939 != null) {
                            switch (objData.fields.customfield_13939.value.toLowerCase()) {
                                case "green":
                                    emojiStr = " :thumbsup:";
                                    break;
                                case "yellow":
                                    emojiStr = " :thumbsup::thumbsdown:";
                                    break;
                                case "red":
                                    emojiStr = " :thumbsdown:";
                                    break;
                            }
                        }
                        actionArray.push({
                            "text": "View in JIRA",
                            "type": "button",
                            "url": "https://billsdev.atlassian.net/browse/" + objData.key,
                            "style": "primary"
                        });

                        if (objData.fields.duedate !== null) {

                            attachmentArray.push({
                                "text": "*" + objData.key + "*: " + objData.fields.summary,
                                "fallback": objData.key + ": " + objData.fields.summary,
                                "color": "#3AA3E3",
                                "attachment_type": "default",

                                "fields": [{
                                        "title": "Status",
                                        "value": status + emojiStr,
                                        "short": true
                                    },
                                    {
                                        "title": "Created",
                                        "value": '' + objData.fields.created.substring(0, 10),
                                        "short": true

                                    },
                                    {
                                        "title": "Due Date",
                                        "value": '' + objData.fields.duedate,
                                        "short": true

                                    }
                                ],
                                "actions": actionArray
                            });
                        } else {

                            attachmentArray.push({
                                "text": "*" + objData.key + "*: " + objData.fields.summary,
                                "fallback": objData.key + ": " + objData.fields.summary,
                                "color": "#3AA3E3",
                                "attachment_type": "default",

                                "fields": [{
                                        "title": "Status",
                                        "value": status + emojiStr,
                                        "short": true
                                    },
                                    {
                                        "title": "Created",
                                        "value": '' + objData.fields.created.substring(0, 10),
                                        "short": true

                                    }
                                ],
                                "actions": actionArray
                            });
                        }
                    }
                    if (attachmentArray.length > 0) {
                        sendAttachmentsToUser(channelId, "My JIRA Tasks ...", attachmentArray, res)
                    } else {
                        blocksArray = [];
                        blocksArray.push({
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "MY JIRA Tasks ...\nNo tasks found."
                            }
                        });

                        sendBlocksToUser(channelId, "My JIRA Tasks ...", blocksArray, res, true);
                    }
                });

        })
        .catch(function (err) {

            db.logError('loop request to get data Error: ' + err, slackUserId, 'JIRA-MyTasks', 'getJiraMyTasksHandler');
            blocksArray = [];
            blocksArray.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "MY JIRA Tasks ...\nNo tasks found."
                }
            });

            sendBlocksToUser(channelId, "My JIRA Tasks ...", blocksArray, res, true);
        })
        .catch(function (err) {
            db.logError('inital request to get data Error: ' + err, slackUserId, 'JIRA-MyTasks', 'getJiraMyTasksHandler');
        });

}

exports.getJiraSearchITProj = function (slackUserId, channelId, taskData, res) {
    var report = '';
    var projectSlide = '';
    var projSchedule = '';
    var emojiStr = '';
    var blocksArray = [];
    var actionArray = [];
    var searchResults = [];
    var matchCount = 0;
    var status;
    var activeSprints = [];

    if (taskData.queryResult.queryText) {
        report = taskData.queryResult.queryText.toLowerCase().replace(/status of /g, "").replace(/status /g, "").trim();
    }

    var sprintOptions = {
        method: 'GET',
        url: 'https://billsdev.atlassian.net/rest/agile/1.0/board/305/sprint',
        headers: {
            Host: 'billsdev.atlassian.net',
            Accept: 'application/json',
            Authorization: 'Basic Z25laWdlckBmcmVlZG9tZmluYW5jaWFsbmV0d29yay5jb206ODVzSWNSSExTRGVua3VkaVlndkU0MUJG'
        }
    };
    return rp(sprintOptions)
        .then(sprints => {
           
            var sprintData = JSON.parse(sprints);

            for (var i = 0; i < sprintData.values.length; i++) {
                var jsonObj = sprintData.values[i];
                var curDate = new Date();

                if (jsonObj.state === "active" && curDate < new Date(jsonObj.endDate) && curDate > new Date(jsonObj.startDate)) {
                    // console.log("id: " + jsonObj.id);
                    // console.log("name: " + jsonObj.name);
                    // console.log("state: " + jsonObj.state);
                    // console.log("start date: " + jsonObj.startDate);
                    // console.log("End Date: " + jsonObj.endDate);
                    activeSprints.push(jsonObj);
                }
            }
           


            var options = {
                method: 'GET',
                url: 'https://billsdev.atlassian.net/rest/agile/1.0/board/305/issue',
                qs: {
                    maxResults: '25',
                    jql: 'project = PLAN AND type = "IT Initiative" AND summary ~ "' + report + '*" ORDER BY Rank ASC'
                    //  'project%20=%20PLAN%20AND%20type%20=%20%22IT%20Initiative%22%20AND%20summary%20~%20%22'+ encodeURIComponent(report) + '%2A%22%20ORDER%20BY%20Rank%20ASC'
                },
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Basic Z25laWdlckBmcmVlZG9tZmluYW5jaWFsbmV0d29yay5jb206ODVzSWNSSExTRGVua3VkaVlndkU0MUJG'
                }
            };

            return rp(options)
                .then(body => {
                    var jsonData = JSON.parse(body);
                    totalItems = jsonData.total;
                    for (var j = 0; j < totalItems; j++) {
                        var objData = jsonData.issues[j];

                        for(var k = 0;k<activeSprints.length;k++) {

                            if(objData.fields.sprint !== null && (activeSprints[k].id === objData.fields.sprint.id)) {
                                searchResults.push(objData);
                                matchCount++;
                            }
                        }
                        

                    }

                    if (matchCount > 1) {
                        searchResults = searchResults.sort(sortUtil.compareTitle);
                    }
                    var resultsCount = searchResults.length;
                    for (var i = 0; i < resultsCount; i++) {
                        objData = searchResults[i];
                        actionArray = [];
                        projectSlide = '';
                        projSchedule = '';
                        emojiStr = '';
                        desc = "";

                        if (objData.fields.description !== null) {
                            desc = objData.fields.description.replaceAll("*", "•").replace('#', "•");
                        }

                        var assigneeName = "";
                        if (objData.fields.assignee !== null) {
                            assigneeName = objData.fields.assignee.displayName;
                        }
                        status = objData.fields.status.name;
                        if (objData.fields.customfield_13939 != null) {
                            switch (objData.fields.customfield_13939.value.toLowerCase()) {
                                case "green":

                                    emojiStr = " :thumbsup:";
                                    break;
                                case "yellow":

                                    emojiStr = " :thumbsup::thumbsdown:";
                                    break;
                                case "red":
                                    emojiStr = " :thumbsdown:";
                                    break;
                            }
                        }
                        if (objData.fields.customfield_13941 !== null) {
                            projectSlide = objData.fields.customfield_13941;
                        }
                        if (objData.fields.customfield_13940 !== null) {
                            projSchedule = objData.fields.customfield_13940;
                        }

                        if (i === 0) {
                            blocksArray.push({
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": "IT JIRA Projects ..."
                                }
                            });
                        }
                        blocksArray.push({
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "*" + objData.fields.summary + "*\n\n" + "*Highlights*:\n" + desc,
                            }
                        });

                        var epicText = objData.fields.epic !== null ? objData.fields.epic.summary : '';

                        if (epicText !== '') {
                            blocksArray.push({
                                "type": "section",
                                "fields": [{
                                        "type": "mrkdwn",
                                        "text": "*Assignee*\n" + assigneeName
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": "*Status*\n" + status + emojiStr
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": "*Epic*\n" + epicText
                                    }
                                ]
                            });
                        } else {
                            blocksArray.push({
                                "type": "section",
                                "fields": [{
                                        "type": "mrkdwn",
                                        "text": "*Assignee*\n" + assigneeName
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": "*Status*\n" + status + emojiStr
                                    }
                                ]
                            });
                        }

                        actionArray.push({
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "View In JIRA"
                            },
                            "url": "https://billsdev.atlassian.net/browse/" + objData.key,
                            "style": "primary",
                            "value": "click_do_nothing"
                        });

                        if (projectSlide !== '') {

                            actionArray.push({
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "emoji": true,
                                    "text": "View Project Slide"
                                },
                                "url": projectSlide,
                                "style": "primary",
                                "value": "click_do_nothing"
                            });
                        }

                        if (projSchedule !== '') {
                            actionArray.push({
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "emoji": true,
                                    "text": "View Project Schedule",
                                },
                                "url": projSchedule,
                                "style": "primary",
                                "value": "click_do_nothing"
                            });
                        }

                        blocksArray.push({
                            "type": "actions",
                            "elements": actionArray
                        });

                        if (i < (resultsCount - 1) && resultsCount > 1) {
                            blocksArray.push(addSlackDivider());
                        }
                    }

                    if (matchCount > 0) {

                        sendBlocksToUser(channelId, "TASK IT JIRA Projects ...", blocksArray, res, true);
                    } else {
                        blocksArray = [];
                        blocksArray.push({
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "*IT JIRA Projects ...*\n" + "Nothing was found while searching for " + report + ". Try again maybe type less words or a specific keyword. Or view projects in JIRA using button below."
                            }
                        });

                        blocksArray.push({
                            "type": "actions",
                            "elements": [{
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "emoji": true,
                                    "text": "View JIRA Projects",
                                },
                                "url": 'https://billsdev.atlassian.net/secure/RapidBoard.jspa?rapidView=305&projectKey=PLAN&view=planning.nodetail&epics=visible',
                                "style": "primary",
                                "value": "click_do_nothing"
                            }]
                        });

                        sendBlocksToUser(channelId, "TASK IT JIRA Projects ...", blocksArray, res, true);

                    }
                })
                .catch(function (err) {
                    db.logError('error occured on getting specific project details for JIRA search (' + report + ') Error: ' + err, slackUserId, 'JIRA-SpecProj', 'jiraSearchITProj');
                    console.log('error occured on getting specific project details for JIRA search (' + report + ') ' + +err);

                    blocksArray = [];
                    blocksArray.push({
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*IT JIRA Projects ...*\n" + "Unable to process your request at this time. For immediate access to the project data, view directly in JIRA using the button below."
                        }
                    });

                    blocksArray.push({
                        "type": "actions",
                        "elements": [{
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "View JIRA Projects",
                            },
                            "url": 'https://billsdev.atlassian.net/secure/RapidBoard.jspa?rapidView=305&projectKey=PLAN&view=planning.nodetail&epics=visible',
                            "style": "primary",
                            "value": "click_do_nothing"
                        }]
                    });

                    sendBlocksToUser(channelId, "TASK IT JIRA Projects ...", blocksArray, res, true);
                });
        });
}