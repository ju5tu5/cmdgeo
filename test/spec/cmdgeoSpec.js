//////////////////////////////////////
// Unit Tests for cmdgeo.js library //
//////////////////////////////////////

describe("cmdgeo library uses the `cmdgeo` namespace", function () {
    it("and makes sure it exists", function () {
        expect(window.cmdgeo).toBeDefined();
    });
});

describe("are undefined before calling cmdgeo.install()", function () {
    it("loader() is undefined", function () {
        expect(window.loader).not.toBeDefined();
    });
    it("set() is undefined", function () {
        expect(window.set).not.toBeDefined();
    });
    console.log('foo');
});

describe("The following functions defined after calling cmdgeo.install()", function () {
    //window.cmdgeo.install();
    console.log('bar');
    it("and loader() is defined", function () {
        expect(window.loader).toBeDefined();
    });
});