(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.Error = function () {
        var errorContainer = $('<div class="health-check-error hidden"></div>');
        var errorTextContainer = $('<div class="health-check-error-text-container"></div>').appendTo(errorContainer);
        var errorText = $('<div class="health-check-error-text"></div>').appendTo(errorTextContainer);

        return {
            appendTo: function (container) {
                container.append(errorContainer);
            },
            show: function (message) {
                errorContainer.removeClass('hidden');

                errorText
                    .text(message)
                    .css({
                        marginTop: (errorTextContainer.height() - errorText.innerHeight()) / 2
                    });
                
                errorTextContainer.css({
                    left: (errorContainer.width() - errorTextContainer.outerWidth()) / 2,
                    top: (errorContainer.height() - errorTextContainer.height()) / 2
                });
            },
            hide: function () {
                errorContainer.addClass('hidden');
            },
            appendToLocation: function () {
                return 'content';
            }
        };
    };
})();