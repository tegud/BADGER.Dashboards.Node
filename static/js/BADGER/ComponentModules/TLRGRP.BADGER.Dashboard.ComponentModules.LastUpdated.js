(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated = function (configuration) {
        var cssClass = 'health-check-last-updated';
        if(configuration && configuration.cssClass) {
            cssClass += ' ' + configuration.cssClass;
        }
        var element = $('<div class="' + cssClass + '">Last Updated: <span class="health-check-last-updated-time">No Update Received</span></div>');
        var lastUpdatedElement = $('.health-check-last-updated-time', element);
        var lastUpdated;

        function updateLastUpdated() {
            if (lastUpdated) {
                lastUpdatedElement.text(lastUpdated.fromNow());
            }
        }

        return {
            appendTo: function (container) {
                container.append(element);
            },
            setLastUpdated: function (serverSideLastUpdated) {
                if (serverSideLastUpdated) {
                    lastUpdated = moment(serverSideLastUpdated);
                } else {
                    lastUpdated = moment();
                }
                updateLastUpdated();
            },
            refreshText: function () {
                updateLastUpdated();
            }
        };
    };
})();