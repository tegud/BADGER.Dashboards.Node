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
    
    TLRGRP.BADGER.Dashboard.Components.HealthCheck = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + ':' + configuration.port + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated();
        var inlineError = new TLRGRP.BADGER.Dashboard.ComponentModules.Error();
        var serverList = new TLRGRP.BADGER.Dashboard.ComponentModules.HealthCheckServerList();
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
        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.AjaxDataStore({
            url: refreshServerBaseUrl + configuration.serverSet,
            refresh: 2500,
            callbacks: {
                success: function (data) {
                    inlineError.hide();
                    serverList.updateStatus(data.groups);
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

                        return $.ajax({
                            url: refreshServerBaseUrl + 'servers/' + configuration.serverSet,
                            success: function (groups) {
                                stateMachine.handle('complete', groups);
                                dataStore.start(true);
                            },
                            error: function (errorInfo) {
                                internalApi.transitionToState('failedToInitialise', errorInfo);
                            }
                        });
                    },
                    complete: function (groups) {
                        serverList.setGroups(groups);
                    }
                },
                failedToInitialise: {
                    _onEnter: function (errorInfo) {
                        if (errorInfo && errorInfo.responseJSON && errorInfo.responseJSON.error) {
                            componentLayout.append('<h4 class="health-check-comms-error">' + errorInfo.responseJSON.error + '</h4>');
                            return;
                        }

                        componentLayout.append('<h4 class="health-check-comms-error">Could not access Health Check Server</h4>');
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

