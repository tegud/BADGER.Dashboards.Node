(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    function buildViewModel(dashboards) {
        var viewModel = {
            dashboards: _(dashboards).map(function(dashboard){
                dashboard = _.extend({}, dashboard);

                if(!dashboard.name) {
                    dashboard.name = dashboard.id;
                }

                return dashboard;
            })
        };

        return viewModel;
    }

    var menuTemplate = '<li class="top-level-item"><div class="current-item"></div><select class="submenu-options available-dashboards">{{#dashboards}}<option value="{{id}}">{{name}}</option>{{/dashboards}}</select></li><li class="top-level-item view-options"><div class="current-item"></div><select class="submenu-options available-views"></select></li>';

    TLRGRP.BADGER.Dashboard.Menu = function(menuElement) {
        var dashboards = TLRGRP.BADGER.Dashboard.getAll();
        var dashboardSelectorElement;
        var viewSelectorElement;
        var currentDashboard;
        var viewSelector;

        function setUpMenuHtml() {
            var ul = $('ul', menuElement);
            var menuHtml =  Mustache.render(menuTemplate, 
                            buildViewModel(dashboards));
            $(menuHtml).appendTo(ul);

            dashboardSelectorElement = $('.top-level-item:eq(1)', menuElement);
            viewSelector = new TLRGRP.BADGER.Dashboard.ViewSelector($('.top-level-item:eq(2)', menuElement));
        }

        function attachMenuDomEvents() {
            menuElement
                .on('change', '.available-dashboards', function() {
                    TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
                        dashboard: $('option:selected', this)[0].value
                    });
                })
                .on('change', '.available-views', function() {
                    TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
                        dashboard: currentDashboard.id,
                        view: $('option:selected', this)[0].value
                    });  
                });
        }

        function setDashboardSelect(selectedDashboard) {
            $('.current-item', dashboardSelectorElement).text(selectedDashboard.name);
            $('select', dashboardSelectorElement).val(selectedDashboard.id);
        }

        function subscribeToMessageBusEvents() {
            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.Dashboard.Selected', function(newDashboardInfo) {
                currentDashboard = TLRGRP.BADGER.Dashboard.getById(newDashboardInfo.id);

                viewSelector.setViews(currentDashboard.views);
                setDashboardSelect(currentDashboard);
            });

            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(newViewInfo) {
                if(!currentDashboard.views[newViewInfo.id]) {
                    return;
                }

                viewSelector.setValue(currentDashboard.views[newViewInfo.id]);
            });
        }

        setUpMenuHtml();
        attachMenuDomEvents();
        subscribeToMessageBusEvents();
    };
})();