import { Games } from '../../imports/api/games.js';
import { Questions } from '../../imports/api/questions.js';
import { GameQuestions } from '../../imports/api/gameQuestions.js';
import { ErrorLog } from '../../imports/api/errorLog.js';

Template.gamePlay.onCreated(function() {
    this.subscribe('questions');
    this.subscribe('games');
    this.subscribe('gameQuestions');
    var gameCode = Session.get("gameCode");
    var gameQuestions = Games.find({ active: "Yes", gameCode: gameCode }).fetch();
    Session.set("questionsToAsk", gameQuestions.questions);
    Session.set("questiionAnsweredNow", "no");
});

Template.gamePlay.onRendered(function() {
    Session.set("questionStatus", "live");
});

Template.activeQuestion.onCreated(function() {
    Session.set("questiionAnsweredNow", "no");
});

Template.gamePlay.helpers({
    gameCode: function() {
        return gameCode = Session.get("gameCode");
    },
    currentGameStatus: function() {
        let gameCode = Session.get("gameCode");
        return Games.find({ active: "Yes", gameCode: gameCode });
    },
    nextQuestion: function() {
        let gameCode = Session.get("gameCode");
        return GameQuestions.find({ gameCode: gameCode, currentQuestion: "Y" });
    },
    anyGames: function() {
        let gameCode = Session.get("gameCode");
        return Games.find({ active: "Yes", gameCode: gameCode });
    },
});

Template.activeQuestion.helpers({
    questionStatus: function() {
        // console.log("User ID:  " + Meteor.userId());
        var player = Meteor.userId();
        var currentlyAnswered = GameQuestions.find({ gameCode: gameCode, currentQuestion: "Y", playersAnswered: { $in: [player] } }).count();
        var continueGame = Games.find({ gameCode: gameCode, active: "Yes" }).fetch();
        // console.log("cureently answered " + currentlyAnswered);
        var statusNow = continueGame[0].nextQuestionStatus;
        // console.log("status now " + statusNow);
        if (currentlyAnswered > 0 && statusNow != "complete") {
            Session.set("questionStatus", "waiting");
            var questionStatus = Session.get("questionStatus");
            // console.log("question status should be: " + questionStatus);
        } else if (currentlyAnswered <= 0 && statusNow != "complete"){
            Session.set("questionStatus", "live");
            var questionStatus = Session.get("questionStatus");
            // console.log("question status should be: " + questionStatus);
        } else if (statusNow == "complete"){
            FlowRouter.go("/finalScoreCard");
        }
        return Session.get("questionStatus");
    },
    questAnswered: function() {
        return Session.get("questiionAnsweredNow");
    },
});

Template.activeQuestion.events({
    'click .button-option' (event) {
        
        correctAnswerVal = $("#qCorrect").text();
        clickedAns = event.currentTarget.id;
        var questionInfo = GameQuestions.find({ gameCode: gameCode, currentQuestion: "Y" }).fetch();
        var questionNo = questionInfo[0].questionNo;
        let questionId = questionInfo[0].questionId;
        // console.log("the Question No is: " + questionNo);
        var questionType = questionInfo[0].qType;
        var my_id = Meteor.userId();
        let questionData = Questions.findOne({ _id: questionId });
        if (questionType == 'trueFalse') {
            var correctAnswerValue = correctAnswerVal + ": " + questionData.trueAnswer;
        } else {
            var correctAnswerValue = correctAnswerVal;
        }
        var playersAnsweredQ = GameQuestions.find({ gameCode: gameCode, questionNo: questionNo, playersAnswered: { $in: [my_id] }}).count();
        // console.log(playersAnsweredQ + " players have answered.");

        if (clickedAns != 'qCorrect') {
            Session.set("questiionAnsweredNow", "yes");
            Meteor.call('game.addPoints', gameCode, "No", function(err, result) {
                if (err){
                    Meteor.call('Error.Set', "gamePlay.js", "line 58", err);
                } else {
                    showSnackbar("Sorry, answer is " + correctAnswerValue, "orange");
                    var correctAnswer = document.getElementById("qCorrect");
                    correctAnswer.classList.add('button-correct');

                    setTimeout(function(){
                        Meteor.call('gameQuestion.answered', gameCode, questionNo, function(err, result){
                            if (err) {
                                Meteor.call('Error.Set', "gamePlay.js", "line 67", err);
                            } else {
                                checkAllAnswered();
                            }
                        });
                    }, 3500);
                }
            });
        } else {
            Session.set("questiionAnsweredNow", "yes");
            Meteor.call('game.addPoints', gameCode, "Yes", function(err, result){
                if (err) {
                    showSnackbar("Unable to update score", "red");
                    Meteor.call('Error.Set', "gamePlay.js", "line 72", err);
                } else {
                    showSnackbar("Correct! Well done.", "green");
                    var correctAnswer = document.getElementById("qCorrect");
                    correctAnswer.classList.add('button-correct');

                    setTimeout(function() {
                        Meteor.call('gameQuestion.answered', gameCode, questionNo, function(err, result){
                            if (err) {
                                Meteor.call('Error.Set', "gamePlay.js", "line 87", err);
                            } else {
                                checkAllAnswered();
                            }
                        });
                    }, 3000);
                }
            });
        }
    },
});

var checkAllAnswered = function() {

    var gameCode = Session.get("gameCode");
    var gameAnswers = Games.find({ gameCode: gameCode, active: "Yes" }).fetch();
    var game_id = gameAnswers[0]._id;
    Session.set("game_id", game_id);
    var status = "waiting";
    Session.set("questiionAnsweredNow", "no");



    // console.log("No of Players: " + gameAnswers[0].numberOfPlayers + " = Players Answered: " + gameAnswers[0].playersAnswered + " ?");
    if (gameAnswers[0].numberOfPlayers <= gameAnswers[0].playersAnswered) {
        // now set gameStatus to "live" again, and change the question with
        // current = "Y" to the next questionNo in the list.

        moveGameForward(gameCode, gameAnswers, game_id)
    } else if (gameAnswers[0].playersAnswered <= 0) {
        // console.log("!!! *** !!! game tried to move forward on it's own. !!! *** !!!");
        var status = "live";
    } else {
        // call and set game for this player to waiting status until all have Answered
        // has to be done through db or can't set it back to live for all at once.
        Session.set("questionStatus", "waiting");
        Meteor.call('setGameLive', gameCode, status, function(err, result){
            if (err) {
                Meteor.call('Error.Set', "gamePlay.js", "line 148", err);
            }
        });
    }
}

moveGameForward = function(gameCode, gameAnswers, game_id) {
    // get the current questionNo
    var questionInfo = GameQuestions.find({ gameCode: gameCode, currentQuestion: "Y" }).fetch();
    var currQuestionNo = questionInfo[0].questionNo;
    var nextQuestionNo = currQuestionNo + 1;
    // console.log("------------------");
    // console.log("Changing current question from " + currQuestionNo + " to " + nextQuestionNo);
    // console.log("------------------");
    var status = "live";

    var totalQuestions = gameAnswers[0].numberofQuestions;

    // console.log("** -- ** -- ** Total Questions: " + totalQuestions);

    // now increment the currQuestionNo in the db
    Meteor.call('gameQuestions.changeCurrent', gameCode, nextQuestionNo, totalQuestions, function(err, result){
        if (err) {
            Meteor.call('Error.Set', "gamePlay.js", "line 115", err);
        } else if (result == "complete") {
            // console.log("Game Complete!");
            Meteor.call('setGameStatus', gameCode, "complete", function(err, result){
                if (err) {
                    Meteor.call('Error.Set', "gamePlay.js", "line 118", err);
                }
            });
        } else {
            // now set gameStatus back to 'live'
            Meteor.call('resetPlayerAnswerCount', gameCode, function(err, result){
                if (err) {
                    Meteor.call('Error.Set', "gamePlay.js", "line 128", err);
                } else {
                    Meteor.call('setGameLive', gameCode, status, function(err, result) {
                        if (err) {
                            Meteor.call('Error.Set', "gamePlay.js", "line 134", err);
                        } else {

                        }
                    });
                }
            });
        }
    });
}
