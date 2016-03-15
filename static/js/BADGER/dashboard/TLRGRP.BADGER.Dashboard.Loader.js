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
                var layoutManager = new TLRGRP.BADGER.Dashboard.Layout();

                currentView = view;
                currentComponents = [];

                dashboardContainer.empty();

                dashboardContainer.addClass('initialised');

                $.get('/static/dashboards/' + dashboardAndView.dashboard + '/' + view.id + '.json').then(function(data) {
                    var renderDeferreds = [];
                    var windowOffset = $(window).height() < $(document).height() ? 25 : 5;
                    windowOffset = 25;

                    document.title = data.name || "Live Status";

                    var componentFactoryDeferred = $.Deferred();
                    componentFactoryDeferred.resolve(data.components);

                    if (data.componentFactory) {
                        var componentFactory = new TLRGRP.BADGER.Dashboard.ComponentFactories[data.componentFactory.type](data.componentFactory);
                        componentFactoryDeferred = componentFactory.load();
                    }

                    componentFactoryDeferred.then(function(newComponents) {

                        layoutManager.set(newComponents, dashboardContainer.innerWidth() - windowOffset);

                        _(newComponents).forEach(function(component) {
                            var dashboardComponent = new TLRGRP.BADGER.Dashboard.Components[component.type](component);

                            currentComponents.push(dashboardComponent);
                            renderDeferreds.push(dashboardComponent.render(dashboardContainer));
                        });

                        $.when.apply(undefined, renderDeferreds).always(loadingComplete);
                    });
                });
            }

            $.when.apply(this, unloadDeferreds).always(showNextView);
        });
    };
})();