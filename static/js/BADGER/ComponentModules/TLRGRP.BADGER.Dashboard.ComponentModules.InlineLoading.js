(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading = function () {
        var container = $('<div class="inline-loading-container"></div>');
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