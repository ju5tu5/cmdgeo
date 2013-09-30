//      cmdgeo-0.2.js
//      http://cmdgeo.nl
//      J.P. Sturkenboom <j.p.sturkenboom@hva.nl>
//      Copyleft 2013, all wrongs reversed.

(function() {
    'use strict';

    // Create a default settings object, these are overrided once a settings file is loaded
    var defaultSettings = {
        'googleMapsKey': '',
        'tourType': 'LINEAIR',
        'mapOptions': { 'center': [52.35955620231157, 4.908019635968003], 'zoom': 15, 'mapTypeId': 'ROADMAP' },
        'poiMarker': { 'path': 'CIRCLE', 'fillColor': 'GhostWhite', 'strokeColor': 'FireBrick' },
        'posMarker': { 'path': 'BACKWARD_CLOSED_ARROW', 'fillColor': 'FireBrick', 'strokeColor': 'Black' },
        'poiList' : []
    };

    // Create a safe reference to the cmdgeo object for use below.
    var cmdgeo = function(obj) {
        if (obj instanceof cmdgeo) { return obj; }
        if (!(this instanceof cmdgeo)) { return new cmdgeo(obj); }
        this.cmdgeowrapped = obj;
    };

    // Add cmdgeo as a global object
    this.cmdgeo = cmdgeo;

    // Current version
    cmdgeo.VERSION = 0.2;

    // Three vars we can't live without (or can we). cmdgeo.storage wil get a reference to
    // either localStorage or sessionStorage through the function storageSupported()
    // cmdgeo.settings wil be filled with the settings loaded externally through the
    // function loadSettings(). They will be used as global vars by a lot of functions
    // inside this module, this represents tight-coupling and i am aware of it.
    cmdgeo.storage = cmdgeo.settings = cmdgeo.map = undefined;

    ////////////////
    // Predicates //
    ////////////////

    // Returns true if @x is not null
    function existy(x) {
        return x !== null;
    }

    // Returns true if @x is not false and not null
    function truthy(x) {
        return (x !== false) && existy(x);
    }

    // Returns true if client-side storage is supported
    function storageSupported() {
        return typeof Storage !== undefined ? cmdgeo.storage = sessionStorage : false;
    }

    // Returns true if settings are loaded correctly
    function settingsLoaded() {
        return isDefined(cmdgeo.settings);
    }

    // Returns true if we can use the geo API
    function gpsInitialized() {
        return geo_position_js.init();
    }

    // Returns true if the passed variable is defined
    var isDefined = complement(_.isUndefined);

    // Returns true if @key is defined in storage
    function isDefinedInStorage(key) {
        return isDefined(cmdgeo.storage[key]);
    }

    // Returns true if the name of @poi is defined in storage
    function poiInStorage(poi) {
        return isDefinedInStorage(poi.name);
    }

    // Returns the poi status (true/false)
    function poiStatusInactive(poi) {
        return cmdgeo.storage.getItem(poi.name) === "false";
    }

    // Returns true if @poi has an onEnter string longer than zero
    function hasEnterTarget(poi) {
        return _.isString(poi.onEnter) && poi.onEnter.length > 0;
    }

    // Returns true if @poi has an onEnter string longer than zero
    function hasExitTarget(poi) {
        return isDefined(poi.onExit) && _.isString(poi.onExit) && poi.onExit.length > 0;
    }

    /////////////
    // Getters //
    /////////////

    // Use makeGetter() to create getter functions for the settings format
    var getPoiList = makeGetter('poiList', defaultSettings);
    var getTourType = makeGetter('tourType', defaultSettings);
    var getMapOptions = makeGetter('mapOptions', defaultSettings);
    var getPoiMarker = makeGetter('poiMarker', defaultSettings);
    var getPosMarker = makeGetter('posMarker', defaultSettings);
    var getGoogleMapsKey = makeGetter('googleMapsKey', defaultSettings);

    //////////////
    // Checkers //
    //////////////

    // Test what happens when a checker fails
    var alwaysFail = validator("Failing deliberately", always(false));

    // Returns true if the settings file is formatted correctly
    // Todo:
    // check overall structure
    // check tour type
    // check for unique names on poi's
    // check for url to go to on enter or on exit, or both
    var settingsFormatting = checker(

    );

    // Checks if requirements for storage are met
    var storageRequirements = checker(
        validator("Storage (localStorage/ sessionStorage) is not supported on your system, this app can't live without it.", storageSupported)
    );

    // Checks if requirements for tracking are met
    var trackRequirements = checker(
        validator("Unable to find settings, did you load them before calling the track() function?.", settingsLoaded),
        validator("Unable to initialise GPS, this app can't live without it.", gpsInitialized)
    );

    // Checks if requirements to enter a @poi are met, requires @poi
    var canEnterPoi = checker(
        validator("Unable to find poi in storage, are you sure it's in your settings file?", poiInStorage),
        validator("The poi does not have an onEnter property.", hasEnterTarget),
        validator("The poi has to be inactive!", poiStatusInactive)
    );

    // Checks if requirements to exit a @poi are met, requires @poi
    var canExitPoi = checker(
        validator("Unable to find poi in storage, are you sure it's in your settings file?", poiInStorage),
        validator("The poi does not have an onExit property.", hasExitTarget)
    );

    ////////////////////
    // Tour functions //
    ////////////////////

    // Loads an external settings file from @url
    cmdgeo.loadSettings = function loadSettings(url) {
        // check if settings are loaded, set var in sessionStorage, dont't load when var is true
        cmdgeo.settings = readFileContents(url);
        errorDispatcher(settingsFormatting(cmdgeo.settings), fail);
        populateStorage(cmdgeo.settings); // this is too much for this function
    };

    // Returns the contents of an external file (json) as a string. We use a variable
    // here because the request API works like this. (note: Can i make this functional?)
    function readFileContents(url) {
        var request = chooseAppropriateRequestObject();
        request.open("GET", url, false);
        request.send(null);
        return JSON.parse(request.responseText);
    }

    // Returns a request object that can read files based on the users browser environment
    function chooseAppropriateRequestObject() {
        return instantiateIfExists(window.XMLHttpRequest) || instantiateIfExists(window.ActiveXObject) || fail("Your platform doesn't support HTTP request objects");
    }

    // Fill storage with the poi's from the settings file, the locations in storage
    // are used to decide if we have to call the enter or exit properties of the poi
    function populateStorage(settings) {
        errorDispatcher(storageRequirements(), fail);
        _.each(getPoiList(settings), function (poi) {
            return !(poi.name in cmdgeo.storage) ? cmdgeo.storage.setItem(poi.name, false) : false;
        });
    }

    // Fire up the GPS update interval if GPS is available or fail horribly if it's not
    cmdgeo.track = function track() {
        errorDispatcher(trackRequirements(), fail);
        updatePosition();
    };

    // Returns the radian value of @deg
    function toRad(deg) {
        return deg * (Math.PI / 180);
    }

    // Returns the distance between two GPS locations in meters ignoring landmarks,
    // the distance is 'as the crow flies'. Calculated using the spherical law of
    // cosines, 6376136 is the radius of earth in meters
    function distance(c1, c2) {
        return Math.acos(Math.sin(toRad(c1.latitude)) * Math.sin(toRad(c2.latitude)) + Math.cos(toRad(c1.latitude)) * Math.cos(toRad(c2.latitude)) * Math.cos(toRad(c2.longitude) - toRad(c1.longitude))) * 6376136;
    }

    // Call the update function from the geo.js API, it uses a callback structure
    function updatePosition() {
        return geo_position_js.getCurrentPosition(gotPosition, function (c,m) { fail(["geo.js", c, m].join(' ')); }, {enableHighAccuracy:true});
    }

    // Callback function that gets called by the update function from the geo.js API that our updatePosition() wraps
    function gotPosition(pos) {
        setTimeout(updatePosition, 500);
        if(cmdgeo.map !== undefined) updateMap(pos);

        // this has got to be changed.. ugly as hell
        var poi = onPoi(pos.coords);
        if(poi) {
            if(poiStatusInactive(poi)) {
                enterPoi(poi);
            }
        } else {
            poi = findActivePoi();
            if(poi) {
                exitPoi(poi);
            }
        }
    }

    // Returns a poi if the current coordinate matches a POI's action-radius and false if there is no match
    function onPoi(coord) {
        return _.find(getPoiList(cmdgeo.settings), function (poi) {
            return distance(coord, poi.coordinate) < poi.radius;
        }, false) || false;
    }

    // Checks if @poi has a valid onEnter object and activates it
    function enterPoi(poi) {
        return !errorDispatcher(canEnterPoi(poi), note) ? activatePoi(poi) : undefined;
    }

    // Checks if @poi has a valid onExit object and deactivates it
    function exitPoi(poi) {
        return !errorDispatcher(canExitPoi(poi), note) ? deactivatePoi(poi) : changePoiStatus(poi, false);
    }

    // Searches for an active poi in cmdgeo.storage, then searches for the
    // corresponding settings from cmdgeo.settings and returns it all.
    function findActivePoi() {
        return _.find(getPoiList(cmdgeo.settings), function (poi) {
            return poi.name === _.find(_.keys(cmdgeo.storage), function (key) {
                return cmdgeo.storage[key] === "true";
            });
        });
    }

    // Follows the onEnter url on @poi and sets its activity status to true
    function activatePoi(poi) {
        changePoiStatus(poi, true);
        window.location = poi.onEnter;
    }

    // Follows the onExit url on @poi and sets its activity status to false
    function deactivatePoi(poi) {
        changePoiStatus(poi, false);
        window.location = poi.onExit;
    }

    // Change the activity @status of @poi
    function changePoiStatus(poi, status) {
        note(poi.name + (status ? " activated" : " deactivated"));
        cmdgeo.storage.setItem(poi.name, status);
    }

    /////////////////////////////
    // Google maps API wrapper //
    /////////////////////////////

    // Load the google maps API asynchronously when needed, it has a callback to the drawmap function
    cmdgeo.loadmap = function loadmap() {
        var script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=true&key='+getGoogleMapsKey(cmdgeo.settings)+'&callback=cmdgeo.drawmap';
        document.body.appendChild(script);
    };

    // Draws a google map on a HTML element with the id 'map_canvas'
    cmdgeo.drawmap = function drawmap() {
        formatSettings();
        cmdgeo.map = new google.maps.Map(document.getElementById('map_canvas'), getMapOptions(cmdgeo.settings));
        drawroute();
    };

    // Changes cmdgeo.settings to correspond with the google maps API (which wasn't loaded before )
    function formatSettings() {
        cmdgeo.settings.mapOptions.center = new google.maps.LatLng(cmdgeo.settings.mapOptions.center[0], cmdgeo.settings.mapOptions.center[1]);
        cmdgeo.settings.mapOptions.mapTypeId = google.maps.MapTypeId[cmdgeo.settings.mapOptions.mapTypeId];
        cmdgeo.settings.posMarker.path = google.maps.SymbolPath[cmdgeo.settings.posMarker.path];
        cmdgeo.settings.poiMarker.path = google.maps.SymbolPath[cmdgeo.settings.poiMarker.path];
    }

    // Draw the route on the map, this function needs some extra work
    function drawroute() {
        // Add poi's to the route
        cmdgeo.map.route = _.map(getPoiList(cmdgeo.settings), function (poi) {
            return new google.maps.LatLng(poi.coordinate.latitude, poi.coordinate.longitude);
        });

        // Add markers to the poi's
        cmdgeo.map.markers = _.map(getPoiList(cmdgeo.settings), function (poi, i) {
            return new google.maps.Marker({ position: cmdgeo.map.route[i], map: cmdgeo.map, icon: getPoiMarker(cmdgeo.settings), title: poi.name });
        });

        // Draw lines between the poi's when this is a lineair route, the lines are as the crow flies
        if(getTourType(cmdgeo.settings) === "LINEAIR"){
            var route = new google.maps.Polyline({ clickable: false, map: cmdgeo.map, path: cmdgeo.map.route, strokeColor: 'Black', strokeOpacity: .6, strokeWeight: 3 });
        }

        // Add the position marker
        cmdgeo.map.pm = new google.maps.Marker({position: getMapOptions(cmdgeo.settings).center, map: cmdgeo.map, icon: getPosMarker(cmdgeo.settings)});
    };


    function updateMap(pos) {
        cmdgeo.map.pm.setPosition(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
        cmdgeo.map.setCenter(cmdgeo.map.pm.position);
    }

    //////////////
    // Messages //
    //////////////

    // Calls @fun when the length of @errs is bigger than zero, returns true if an error is dispatched and false if none is dispatched
    function errorDispatcher(errs, fun) {
        return errs.length > 0 ? !fun(errs) : false;
    };

    // Three error levels to pass messages to the programmer
    function fail(thing) { throw new Error(thing); }
    function warn(thing) { console.log(["WARNING:", thing].join(' ')); }
    function note(thing) { console.log(["NOTE:", thing].join(' ')); }

    ////////////////////////////
    // Higher order functions //
    ////////////////////////////

    // Always returns @val which is captured in a closure
    function always(val) {
        return function () {
            return val;
        };
    }

    // Returns a collection of all values that don't belong to the results of @predicate.
    function complement(predicate) {
        return function() {
            return !predicate.apply(null, _.toArray(arguments));
        };
    }

    // Calls the function @action1 when @condition is met and @action2 if it is not.
    function doWhen(condition, action1, action2) {
        return truthy(condition) ? action1() : action2();
    }

    // Returns an instantiation of object @Target if it exists in the environment.
    function instantiateIfExists(Target) {
        return doWhen(existy(Target), function () {
            return new Target();
        });
    }

    // Circumvents the execution of @fun, checks its incomming arguments for null
    // or undefined, fills in the original defaults if either is found, and then
    // calls the original with the patched args.
    function fnull(fun /*, defaults */) {
        var defaults = _.rest(arguments);
        return function(/* arguments */) {
            return fun.apply(null, _.map(arguments, function(arg, i) {
                return existy(arg) ? arg : defaults[i];
            }));
        };
    }

    // Returns a function that searches for a @key in the object @obj,
    // if it doesn't exist it returns the @key from the default object @def.
    function defaults(def) {
        return function (obj, key) {
            var val = fnull(_.identity, def[key]);
            return obj && val(obj[key]);
        };
    }

    // Returns a getter function that searches for a @key in object @obj, if
    // @key is not present in @obj the returned function will pass the value for
    // @key from default object @def.
    function makeGetter(key, def) {
        return function (obj) {
            return defaults(def)(obj, key);
        };
    }

    // Create a chain of validators that will be pulled over a passed @obj,
    // returns an empty array or one filled with the messages from the passed
    // @validators.
    function checker(/* validators */) {
        var validators = _.toArray(arguments);
        return function(obj) {
            return _.reduce(validators, function (errs, check) {
                if (check(obj)){
                    return errs;
                }else{
                    return _.chain(errs).push(check.message).value();
                }
            }, []);
        };
    }

    // Create a validator function and the corresponding failure message.
    function validator(message, fun) {
        var f = function(/* args */) {
            return fun.apply(fun, arguments);
        };
        f.message = message;
        return f;
    }

}).call(this);