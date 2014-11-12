(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function buildViewModel(alertData) {
        return {
            alertState: alertData.level
        };
    }
    
    TLRGRP.BADGER.Dashboard.ComponentModules.AlertsSentinel = function () {
        var containerElement = $('<div class="alert-info-container"></div>');

        return {
            appendTo: function(componentElement) {
                componentElement.append(containerElement);
            },
            appendToLocation: function() {
                return 'content';
            },
            updateStatus: function (alertData) {
                var viewModel = buildViewModel(alertData);

                containerElement.html($(Mustache.render(
                     '<div class="alert-error hidden">'+
                        '<div class="alert-error-text-container">'+
                            '<h3>Warning</h3>'+
                            '<div class="alert-error-text">'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                    '<div class="alert-info alert-state-{{alertState}}">{{alertState}}</div>', viewModel)));
            }
        };
    };
})();

