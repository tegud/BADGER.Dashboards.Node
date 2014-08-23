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
                var text = lastUpdated.fromNow();

                if(configuration && configuration.showExact) {
                    var exectTimeText = '';
                    var differenceInSeconds = Math.abs(lastUpdated.diff(moment(), 'seconds'));

                    if(differenceInSeconds) {
                        if(differenceInSeconds > 60) {
                            differenceInMinutes = Math.abs(lastUpdated.diff(moment(), 'minutes'));
                            exectTimeText = differenceInMinutes + ' minute' + (differenceInMinutes !== 1 ? 's' : '')
                        }
                        else {
                            exectTimeText = differenceInSeconds + ' second' + (differenceInSeconds !== 1 ? 's' : '')
                        }

                        text += ' (' + exectTimeText + ')';
                    }
                }

                lastUpdatedElement.text(text);
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