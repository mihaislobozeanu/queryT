/**
 * Created by mihai on 8/8/2015.
 */
/*global describe:false */
/*global it:false */
/*jshint expr:true*/

/**
 * Created by mihai on 12/22/2014.
 */

var queryT = require("./../index.js"),
    should = require('should');

function createOptions(parameters) {
    return {
        hasParameter: function (name) {
            return (parameters.indexOf(name) >= 0);
        }
    };
}

describe("queryT", function () {
    it("1", function () {
        queryT.template('SELECT * FROM Test [[WHERE [[TestId = @TestId]]]]').should.equal('SELECT * FROM Test ');
        queryT.template('SELECT * FROM Test [[WHERE [[TestId = @TestId]] [[AND Test2Id = @Test2Id]]]]').should.equal('SELECT * FROM Test ');
    });

    it("2", function () {
        var template = 'SELECT * FROM Test [[WHERE [[TestId = @TestId]] [[AND Test2Id = @Test2Id]]]]';
        queryT.template(template, createOptions(['@TestId'])).should.equal('SELECT * FROM Test WHERE TestId = @TestId');
        queryT.template(template, createOptions(['@Test2Id'])).should.equal('SELECT * FROM Test WHERE  Test2Id = @Test2Id');
    });
});
