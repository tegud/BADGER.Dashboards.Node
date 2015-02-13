(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading = function (configuration) {
        var cssClass = 'inline-loading-container';
        if(configuration && configuration.cssClass) {
            cssClass += ' ' + configuration.cssClass;
        }

        var container = $('<div class="' + cssClass + '"></div>');
        var loadingElement = $('<div class="inline-loading hidden"></div>').appendTo(container);

        return {
            appendTo: function (component) {
                component.append(container);
            },
            loading: function () {
                loadingElement.removeClass('hidden');
            },
            finished: function () {
                loadingElement.addClass('hidden');
            }
        };
    };
})();