import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Questions = new Mongo.Collection('questions');

Questions.allow({
    insert: function(userId, doc) {
        // if user id exists, allow insert
        return !!userId;
    },
});

Meteor.methods({
    'newQuestionTF.insert'(qCat, qDiff, qType, private, question, tOrF, trueAnswer, nextSeqNo, mySeqNo) {
        // check that values sent are of expected type
        check(qCat, String);
        check(qDiff, String);
        check(qType, String);
        check(private, String);
        check(question, String);
        check(tOrF, String);
        check(trueAnswer, String);
        check(nextSeqNo, Number);
        check(mySeqNo, Number);


        if (private == 'private') {
            owner = Meteor.users.findOne(this.userId).username;
        } else {
            owner = "all";
        }

        return Questions.insert({
            category: qCat,
            difficulty: qDiff,
            type: qType,
            owner: owner,
            question: question,
            correctAnswer: tOrF,
            trueAnswer: trueAnswer,
            seqNo: nextSeqNo,
            mySeqNo: mySeqNo,
            addedOn: new Date(),
            addedBy: Meteor.users.findOne(this.userId).username,
            timesUsedInAGame: 0,
        });
    },
    'Question.update' (questionId) {
        Questions.update({ _id: questionId }, { $inc: { timesUsedInAGame: 1 }});
    },
    'newQuestionMC.insert'(qCat, qDiff, qType, private, question, correct, incorrect1, incorrect2, incorrect3, nextSeqNo) {
        // check that values sent are of expected type
        check(qCat, String);
        check(qDiff, String);
        check(qType, String);
        check(private, String);
        check(question, String);
        check(correct, String);
        check(incorrect1, String);
        check(incorrect2, String);
        check(incorrect3, String);
        check(nextSeqNo, Number);


        if (private == 'private') {
            owner = Meteor.users.findOne(this.userId).username;
        } else {
            owner = "all";
        }

        return Questions.insert({
            category: qCat,
            difficulty: qDiff,
            type: qType,
            owner: owner,
            question: question,
            correctAnswer: correct,
            inCorrectAnswers: [
                incorrect1,
                incorrect2,
                incorrect3,
            ],
            seqNo: nextSeqNo,
            addedOn: new Date(),
            addedBy: Meteor.users.findOne(this.userId).username,
            timesUsedInAGame: 0,
        });
    },
});