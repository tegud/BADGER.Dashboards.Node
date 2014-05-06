(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    TLRGRP.BADGER.Dashboard.Components.Kibana = function (configuration) {
        var iframe;

        return {
            render: function (container) {
                iframe = $('<iframe />', {
                    'class': 'kibana-frame',
                    src: 'http://kibana.laterooms.com/index.html#/dashboard/' + (configuration.path || ''),
                    css: {
                        height: $(window).height() - container.position().top - 15
                    }
                }).appendTo(container);
            },
            unload: function () {
                iframe.remove();
                iframe = null;
            }
        };
    };
})();

