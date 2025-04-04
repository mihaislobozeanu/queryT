/**
 * Created by mihai on 8/8/2015.
 */
/*global describe:false */
/*global it:false */
/*jshint expr:true*/

/**
 * Created by mihai on 12/22/2014.
 */

const queryT = require("./../index.js"),
    should = require('should');

function createOptions(parameters) {
    return {
        hasParameter: function (name) {
            return (parameters.indexOf(name) >= 0) || (parameters.indexOf(name + 'Field') >= 0);
        },

        rewriteParameters: function (name) {
            if (name.substr(-5) === 'Field')
                return '';
            return name;
        }
    };
}

describe("queryT", function () {
    it("evaluation without parameters", async function () {
        (await queryT.templateAsync('SELECT * FROM [[Test]]')).should.equal('SELECT * FROM Test');
    });

    it("no parameters passed", async function () {
        (await queryT.templateAsync('SELECT * FROM Test [[WHERE [[TestId = @TestId]]]]')).should.equal('SELECT * FROM Test ');
        (await queryT.templateAsync('SELECT * FROM Test WHERE TestId = 0 [[AND TestId = @TestId]]')).should.equal('SELECT * FROM Test WHERE TestId = 0 ');
        (await queryT.templateAsync('SELECT * FROM Test WHERE [[TestId IS NULL]] [[AND TestId = @TestId]]')).should.equal('SELECT * FROM Test WHERE TestId IS NULL ');
        (await queryT.templateAsync('SELECT * FROM Test [[WHERE [[TestId = @TestId]] [[AND Test2Id = @Test2Id]]]]')).should.equal('SELECT * FROM Test ');
    });

    it("with parameters", async function () {
        let template = 'SELECT * FROM Test [[WHERE [[TestId = @TestId]] [[AND Test2Id = @Test2Id]]]]';
        (await queryT.templateAsync(template, createOptions(['@TestId']))).should.equal('SELECT * FROM Test WHERE TestId = @TestId');
        (await queryT.templateAsync(template, createOptions(['@Test2Id']))).should.equal('SELECT * FROM Test WHERE  Test2Id = @Test2Id');
        (await queryT.templateAsync(template, createOptions(['@TestId', '@Test2Id']))).should.equal('SELECT * FROM Test WHERE TestId = @TestId AND Test2Id = @Test2Id');

        template = 'SELECT * FROM Test [[WHERE TestId = @TestId [[AND Test2Id = @Test2Id]]]]';
        (await queryT.templateAsync(template, createOptions(['@TestId']))).should.equal('SELECT * FROM Test WHERE TestId = @TestId');
        (await queryT.templateAsync(template, createOptions(['@Test2Id']))).should.equal('SELECT * FROM Test ');

        template = 'SELECT * FROM Test [[WHERE [[TestId IS NULL]] [[AND Test1Id = @Test1Id]]]]';
        (await queryT.templateAsync(template, createOptions(['@Test1Id']))).should.equal('SELECT * FROM Test WHERE TestId IS NULL AND Test1Id = @Test1Id');
    });

    it("joins", async function () {
        let template = 'SELECT * FROM Table [[LEFT JOIN Table2 ON Table.Field1 = Table2.Field1 AND Table2.Field2 = @Param2]] [[WHERE [[Table1.Field1 = @Param1]] [[AND Table1.Field2 = @Param3]]]]';
        (await queryT.templateAsync(template, createOptions(['@Param1', '@Param3']))).should.equal('SELECT * FROM Table  WHERE Table1.Field1 = @Param1 AND Table1.Field2 = @Param3');
    });

    it("fields", async function () {
        let template = 'SELECT Table.*[[, Table2.Field2 @Param2Field]] FROM Table [[LEFT JOIN Table2 ON Table.Field1 = Table2.Field1 AND Table2.Field2 = @Param2]] [[WHERE [[Table1.Field1 = @Param1]] [[AND Table1.Field2 = @Param3]]]]';
        (await queryT.templateAsync(template, createOptions(['@Param1', '@Param3']))).should.equal('SELECT Table.* FROM Table  WHERE Table1.Field1 = @Param1 AND Table1.Field2 = @Param3');
    });

    it("production case 1", async function () {
        let template = '[[WHERE ([[T1.active = @active]] [[OR T1.county_id = @county_id]]) [[AND T1.country_id = @country_id]]]]';
        (await queryT.templateAsync(template, createOptions(['@active', '@county_id', '@country_id']))).should.equal('WHERE (T1.active = @active OR T1.county_id = @county_id) AND T1.country_id = @country_id');
    });
});
