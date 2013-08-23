/***
* cmdaan.js
*   Contains functions for easy implementation of CMDAan style
*   geolocation for mobile apps as explained in class.
*
*   Author: J.P. Sturkenboom <j.p.sturkenboom@hva.nl>
*   Credit: Dive into html5, geo.js, Nicholas C. Zakas
*
*   Copyleft 2013, all wrongs reversed.
*/

typeof window === undefined && (window = {});

// `cmdgeo` is the namespace for this application
var cmdgeo = window.cmdgeo || {};

// Copies public functions in `cmdgeo` into the global namespace.
// If the optional argument $except$ is present, functions named by
// its property names are not copied. Example: cmdgeo.install()
cmdgeo.install = function () {
    _.each(_.filter(_.keys(this), this._isPublicFunction, this), this._publish);
};

cmdgeo.load = function (url) {
    console.log('foo');
};

cmdgeo.set = function (x) {
    console.log('foo');
};

/////////////
// Helpers //
/////////////

// Three error levels to pass messages to the programmer
cmdgeo._fail = function (thing) { throw new Error(thing); };
cmdgeo._warn = function (thing) { console.log(["WARNING:", thing].join(' ')); };
cmdgeo._note = function (thing) { console.log(["NOTE:", thing].join(' ')); };

// Returns true if @x is not null
cmdgeo._existy = function (x) {
    return x !== null;
};

// Returns true if @x is not false and not null
cmdgeo._truthy = function (x) {
    return (x !== false) && this._existy(x);
};

// Returns a function that returns a collection of all values that don't belong to @predicate
cmdgeo._complement = function(predicate) {
    return function() {
        return !predicate.apply(null, _.toArray(arguments));
    };
};

// Returns true if @string contains @character
cmdgeo._hasLeadingUnderscore = function (string) {
    return string.charAt(0) === '_';
};

// By convention our public functions have no leading underscore,
// complements cmdgeo._hasLeadingUnderscore. Returns true if @fun
// has no leading underscore.
cmdgeo._isPublicFunction = function (fun) {
    return this._complement(this._hasLeadingUnderscore)(fun) && fun !== 'install';
};


//
cmdgeo._publish = function (name) {
    cmdgeo._note("Publishing `" + name + "` to global namespace.");
    return (window[name] = cmdgeo[name]);
};

// Calls the function @action when @condition is met
cmdgeo._doWhen = function (condition, action) {
    return this._truthy(condition) ? action() : undefined;
};

cmdgeo._validator = function (message, fun) {
    var f = function(/* args */) {
        return fun.apply(fun, arguments);
    };
    f['message'] = message;
    return f;
};
// EOF