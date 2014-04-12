(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    TLRGRP.BADGER.Dashboard.Loader = function(dashboardContainer) {
        LOADING.show();

        var currentView;

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(dashboardAndView) {
            var dashboard = TLRGRP.BADGER.Dashboard.getById(dashboardAndView.dashboard);
            var view = dashboard.views[dashboardAndView.id];
            var unloadDeferreds = [];

            LOADING.show();

            if(currentView) {
                _(currentView.components).forEach(function(component) {
                    if(component.unload && $.isFunction(component.unload)) {
                        unloadDeferreds.push(component.unload());
                    }
                });
            }

            function loadingComplete() {
                LOADING.hide();
            }

            function showNextView() { 
                var renderDeferreds = [];

                currentView = view;

                dashboardContainer.empty();

                dashboardContainer.addClass('initialised');

                _(view.components).forEach(function(component) {
                    renderDeferreds.push(component.render(dashboardContainer));
                });
                
                $.when.apply(undefined, renderDeferreds).always(loadingComplete);
            }

            $.when.apply(this, unloadDeferreds).always(showNextView);
        });
    };
})();