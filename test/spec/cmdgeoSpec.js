//////////////////////////////////////
// Unit Tests for cmdgeo.js library //
//////////////////////////////////////

describe("cmdgeo library", function () {

    describe("uses the `cmdgeo` namespace", function () {
        it("and makes sure it exists", function () {
            expect(window.cmdgeo).toBeDefined();
        });
    });

    describe("should have the following functions", function () {
        describe("undefined before calling cmdgeo.install()", function () {
            it("and load() is undefined", function () {
                expect(window.load).not.toBeDefined();
            });
            it("and set() is undefined", function () {
                expect(window.set).not.toBeDefined();
            });
        });

        describe("defined after calling cmdgeo.install()", function () {
            //cmdgeo.install();
            console.log(window);
            it("and load() is defined", function () {
                expect(window.load).toBeDefined();
            });
        });

    });

});