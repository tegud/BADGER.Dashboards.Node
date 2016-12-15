(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    function calculateNextRefresh(nextServerSideRefresh) {
        var adjustedNextServerSideRefresh = moment(nextServerSideRefresh).add(500, 'ms');
        var refreshIn = moment(adjustedNextServerSideRefresh).diff(moment());
        var minRefreshInterval = 1000;

        if (refreshIn < minRefreshInterval) {
            refreshIn = minRefreshInterval;
        }

        return refreshIn;
    }

    TLRGRP.BADGER.Dashboard.Components.HealthCheckIcinga = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + (configuration.port ? (':' + configuration.port) : '') + '/';

        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated();
        var inlineError = new TLRGRP.BADGER.Dashboard.ComponentModules.Error();
        var serverList = new TLRGRP.BADGER.Dashboard.ComponentModules.HealthCheckIcingaServerList();
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

        function buildDataStoreFor(group) {
            var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
                query: {
                    url: refreshServerBaseUrl + 'icinga/health?group=' + group,
                },
                refresh: 2500,
                callbacks: {
                    success: function (data) {
                        inlineError.hide();
                        serverList.updateStatus(group, data);
                        dataStore.setNewRefresh(calculateNextRefresh(data.nextRefreshAt));
                    },
                    error: function (errorInfo) {
                        if (errorInfo && errorInfo.responseJSON && errorInfo.responseJSON.error) {
                            inlineError.show(errorInfo.responseJSON.error);
                        } else {
                            inlineError.show('Cannot access health check server.');
                        }

                        dataStore.setNewRefresh(10000);
                    }
                },
                mappings: [{
                    "type": "pickValue",
                    "value": "query",
                    "field": "query"
                }],
                components: {
                    loading: inlineLoading,
                    lastUpdated: lastUpdated
                }
            });

            return dataStore;
        }

        var dataStores = []
        for (var i = configuration.groups.length - 1; i >= 0; i--) {
            dataStores.push(buildDataStoreFor(configuration.groups[i]))
        };

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
                        for (var i = dataStores.length - 1; i >= 0; i--) {
                            dataStores[i].start(true);
                        };
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
