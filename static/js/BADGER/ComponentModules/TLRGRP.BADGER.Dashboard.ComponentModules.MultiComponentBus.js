(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.MultiComponentBus = function(storeId) {
        var subscribedComponents = {};

        return {
            refreshComplete: function(data) {
                _.each(subscribedComponents, function(subscribedComponent) {
                    if(subscribedComponent.refreshComplete) {
                        subscribedComponent.refreshComplete(data);
                    }

                    if(subscribedComponent.loading) {
                        subscribedComponent.loading.finished();
                    }
                });
            },
            subscribeToEvents: function() {
                TLRGRP.messageBus.subscribe('TLRGRP.BADGER.SharedDataStore.Subscribe.' + storeId, function(storeSubscription) {
                    if(subscribedComponents[storeSubscription.id]) {
                        return;
                    }

                    subscribedComponents[storeSubscription.id] = storeSubscription;
                });

                TLRGRP.messageBus.subscribe('TLRGRP.BADGER.SharedDataStore.Unsubscribe.' + storeId, function(id) {
                    delete subscribedComponents[id];
                });
            },
            showLoading: function() {
                _.each(subscribedComponents, function(subscribedComponent) {
                    if(subscribedComponent.loading) {
                        subscribedComponent.loading.loading();
                    }
                });
            },
            hideLoading: function() {
                _.each(subscribedComponents, function(subscribedComponent) {
                    if(subscribedComponent.loading) {
                        subscribedComponent.loading.finished();
                    }
                });
            }
        };
    }
})();