var TLRGRP = TLRGRP || {};

TLRGRP.namespace = function (ns_string) {
    var parts = ns_string.split('.'),
        parent = TLRGRP,
        i;

    // strip redundant leading global
    if (parts[0] === "TLRGRP") {
        parts = parts.slice(1);
    }

    for (i = 0; i < parts.length; i += 1) {
        // create a property if it doesn't exist
        if (typeof parent[parts[i]] === "undefined") {
            parent[parts[i]] = {};
        }
        parent = parent[parts[i]];
    }
    return parent;
};

TLRGRP.messageBus = (function() {
    var messages = {};

    function publish(name, data) {
        if (messages[name] !== undefined) {
            for (var i = 0; i < messages[name].length; i++) {
                messages[name][i].call({}, data);
            }
        }
    }

    function subscribe(name, callback) {
        if (messages[name] === undefined) {
            messages[name] = [callback];
        } else {
            var alreadySubcribed = false;

            for (var i = 0; i < messages[name].length; i++) {
                if (messages[name][i] === callback) {
                    alreadySubcribed = true;
                }
            }

            if (!alreadySubcribed) {
                messages[name].push(callback);
            } 
        }
    }

    function unsubscribe(name, callback) {
        var position = -1;

        if (messages[name] !== undefined) {
            for (var i = 0; i < messages[name].length; i++) {
                if (messages[name][i] === callback) {
                    position = i;
                }
            }
            messages[name].splice(position, 1);
        }

    }

    return {
        publish:publish,
        subscribe:subscribe,
        unsubscribe:unsubscribe,
        reset: function() {
            messages = {};
        }
    };
})();