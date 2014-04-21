(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    TLRGRP.BADGER.Dashboard.Loader = function(dashboardContainer) {
        LOADING.show();

        var currentView;
        var currentComponents = [];

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(dashboardAndView) {
            var dashboard = TLRGRP.BADGER.Dashboard.getById(dashboardAndView.dashboard);
            var view = dashboard.views[dashboardAndView.id];
            var unloadDeferreds = [];

            LOADING.show();

            if(currentComponents.length) {
                _(currentComponents).forEach(function(component) {
                    if(component.unload && $.isFunction(component.unload)) {
                        unloadDeferreds.push(component.unload());
                    }
                });
            }

            function loadingComplete() {
                LOADING.hide();
            }

            function showNextView() { 

                currentView = view;
                currentComponents = [];

                dashboardContainer.empty();

                dashboardContainer.addClass('initialised');

                $.get('/static/dashboards/' + dashboardAndView.dashboard + '/' + view.id + '.json').then(function(data) {
                    var renderDeferreds = [];

                    _(data.components).forEach(function(component) {
                        var dashboardComponent = new TLRGRP.BADGER.Dashboard.Components[component.type](component);

                        currentComponents.push(dashboardComponent);
                        renderDeferreds.push(dashboardComponent.render(dashboardContainer));
                    });

                    $.when.apply(undefined, renderDeferreds).always(loadingComplete);
                });
            }

            $.when.apply(this, unloadDeferreds).always(showNextView);
        });
    };
})();