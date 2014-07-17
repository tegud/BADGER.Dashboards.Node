(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    TLRGRP.BADGER.Dashboard.Components.sharedDataStore = function (configuration) {
        var dataStore = TLRGRP.BADGER.Dashboard.DataStores.StandardDataStore(configuration);

        return {
            render: function () {
                dataStore.start();
            },
            unload: function () {
                dataStore.stop();
            }
        };
    };
})();
