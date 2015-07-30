(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    function calculateNextRefresh(nextServerSideRefresh) {
        var adjustedNextServerSideRefresh = moment(nextServerSideRefresh).add(500, 'ms');
        var refreshIn = moment(adjustedNextServerSideRefresh).diff(moment());
        var minRefreshInterval = 5000;

        if (refreshIn < minRefreshInterval) {
            refreshIn = minRefreshInterval;
        }

        return refreshIn;
    }
    
    TLRGRP.BADGER.Dashboard.Components.ZookeeperHealthCheckSentinel = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + ':' + configuration.port + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated();
        var inlineError = new TLRGRP.BADGER.Dashboard.ComponentModules.Error();
        var serverList = new TLRGRP.BADGER.Dashboard.ComponentModules.ZookeeperHealthCheckSentinel();
        var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
            title: configuration.title,
            componentClass: 'health-check-component',
            layout: configuration.layout,
            modules: [
                inlineLoading,
                lastUpdated,
                inlineError,
                serverList
            ]
        });
        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            query: {
                url: refreshServerBaseUrl + 'currentStatus/kafka-check.' + configuration.environment + '.zookeeper-status',
            },
            refresh: 2500,
            callbacks: {
                success: function (data) {
                    inlineError.hide();
                    serverList.updateStatus(data);
                    dataStore.setNewRefresh(calculateNextRefresh(data.nextRefreshAt));
                },
                error: function (errorInfo) {
                    if (errorInfo && errorInfo.responseJSON && errorInfo.responseJSON.error) {
                        inlineError.show(errorInfo.responseJSON.error);
                    }
                    else {
                        inlineError.show('Cannot access health check server.');
                    }

                    dataStore.setNewRefresh(10000);
                }
            },
            mappings: [
                { "type": "pickValue", "value": "query", "field": "query" }
            ],
            components: {
                loading: inlineLoading,
                lastUpdated: lastUpdated
            }
        });

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        componentLayout.appendTo(container);

                        return this.transitionToState('initialising');
                    }
                },
                initialising: {
                    _onEnter: function () {
                        var internalApi = this;
                        dataStore.start(true);
                    }
                }
            },
            initialState: 'uninitialised'
        });
        
        return {
            render: function (container) {
                return stateMachine.handle('initialise', container);
            },
            unload: function () {
                stateMachine.handle('stop');
                stateMachine.handle('remove');
            }
        };
    };
})();

