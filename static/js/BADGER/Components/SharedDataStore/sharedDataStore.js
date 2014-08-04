(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    TLRGRP.BADGER.Dashboard.Components.SharedDataStore = function (configuration) {
        var subscribedComponents = {};
        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            request:  new TLRGRP.BADGER.Dashboard.DataSource[(configuration.dataSource)](configuration),
            refresh: 5000,
            mappings: configuration.mappings,
            callbacks: {
                success: function (data) {
                    _.each(subscribedComponents, function(subscribedComponent) {
                        if(subscribedComponent.refreshComplete) {
                            subscribedComponent.refreshComplete(data);
                        }

                        if(subscribedComponent.loading) {
                            subscribedComponent.loading.finished();
                        }
                    });
                }
            },
            components: {
                loading: {
                    loading: function() {
                        _.each(subscribedComponents, function(subscribedComponent) {
                            if(subscribedComponent.loading) {
                                subscribedComponent.loading.loading();
                            }
                        });
                    },
                    finished: function() {
                        _.each(subscribedComponents, function(subscribedComponent) {
                            if(subscribedComponent.loading) {
                                subscribedComponent.loading.finished();
                            }
                        });
                    }
                }
            }
        });

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.SharedDataStore.Subscribe', function(storeSubscription) {
            if(subscribedComponents[storeSubscription.id]) {
                return;
            }

            subscribedComponents[storeSubscription.id] = storeSubscription;
        });

        TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Unsubscribe', function(id) {
            delete subscribedComponents[id];
        });

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
