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
    
    TLRGRP.BADGER.Dashboard.Components.AlertsSentinel = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + ':' + configuration.port + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated();
        var inlineError = new TLRGRP.BADGER.Dashboard.ComponentModules.Error();
        var alertInfo = new TLRGRP.BADGER.Dashboard.ComponentModules.AlertsSentinel();
        var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
            title: configuration.title,
            componentClass: 'alert-component',
            layout: configuration.layout,
            modules: [
                inlineLoading,
                lastUpdated,
                inlineError,
                alertInfo
            ]
        });
        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            query: {
                url: refreshServerBaseUrl + 'currentStatus/' + configuration.alertName,
            },
            refresh: 2500,
            callbacks: {
                success: function (data) {
                    if (data != "") {
                        inlineError.hide();
                        alertInfo.updateStatus(data);
                    } else {
                        inlineError.show('No response from health check server.');
                    }
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
                { "type": "pickValue", "value": "query" }
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

