(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    TLRGRP.BADGER.Dashboard.Components.ConversionStatus = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        var dataStore = { start: function() {}, "stop": function() {} };

        var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
            title: configuration.title,
            layout: configuration.layout,
            componentClass: 'conversion-status',
            modules: [
                inlineLoading,
                {
                    appendTo: function (container) {
                        container.append('<div>'
                                + '<table class="status-table">'
                                    + '<tr class="status-header-row">'
                                        + '<th></th>'
                                        + '<th class="total-cell">Total</th>'
                                        + '<th>IE</th>'
                                        + '<th>Chrome</th>'
                                        + '<th>Firefox</th>'
                                    + '</tr>'
                                    + '<tr class="status-row">'
                                        + '<th>LateRooms.com</th>'
                                        + '<td class="total-cell good">3.0%<div class="status-cell-indicator"></div></td>'
                                        + '<td class="warn"><div class="status-cell-container"><div class="status-cell-value">2.5</div><div class="status-cell-indicator"></div><div class="status-cell-percentage">%</div></div></td>'
                                        + '<td class="alert"><div class="status-cell-container"><div class="status-cell-value">2.7</div><div class="status-cell-indicator"></div><div class="status-cell-percentage">%</div></div></td>'
                                        + '<td class="warn"><div class="status-cell-container"><div class="status-cell-value">3.5</div><div class="status-cell-indicator"></div><div class="status-cell-percentage">%</div></div></td>'
                                    + '</tr>'
                                    + '<tr class="status-row">'
                                        + '<th>AsiaRooms.com</th>'
                                        + '<td class="alert total-cell">1.6%<div class="status-cell-indicator"></div></td>'
                                        + '<td class="alert"><div class="status-cell-container"><div class="status-cell-value">2.5</div><div class="status-cell-indicator"></div><div class="status-cell-percentage">%</div></div></td>'
                                        + '<td class="alert"><div class="status-cell-container"><div class="status-cell-value">2.7</div><div class="status-cell-indicator"></div><div class="status-cell-percentage">%</div></div></td>'
                                        + '<td class="alert"><div class="status-cell-container"><div class="status-cell-value">3.5</div><div class="status-cell-indicator"></div><div class="status-cell-percentage">%</div></div></td>'
                                    + '</tr>'
                                + '</table>'
                            + '</div>');
                    }
                }
            ]
        });

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        //inlineLoading.loading();
                        componentLayout.appendTo(container);
                        this.transitionToState('initialised');
                    }
                },
                initialised: {
                    _onEnter: function () {
                        dataStore.start(true);
                    },
                    stop: function() {
                        dataStore.stop();
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

