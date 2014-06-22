(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    TLRGRP.BADGER.PageVisibility = (function() {
        var stateMachine = nano.Machine({
            states: {
                visible: {
                    hidden: function() {
                        TLRGRP.messageBus.publish('TLRGRP.BADGER.PAGE.Hidden');
                        this.transitionToState('hidden');
                    }
                },
                hidden: {
                    visible: function() {
                        TLRGRP.messageBus.publish('TLRGRP.BADGER.PAGE.Visible');
                        this.transitionToState('visible');
                    }
                }
            },
            initialState: 'visible'
        });
        
        $(document).on('webkitvisibilitychange msvisibilitychange mozvisibilitychange visibilitychange', function () {
            var isHidden = document.hidden || document.mozHidden || document.msHidden || document.webkitHidden;

            stateMachine.handle(isHidden ? 'hidden' : 'visible');
        });
    })();

    TLRGRP.BADGER.URL = (function() {
        window.onpopstate = function(event) {
            if(!event.state) {
                return;
            }

            TLRGRP.messageBus.publish('TLRGRP.BADGER.PAGE.HistoryPopState', event.state);
        };

        return {
            current: function() {
                return window.location.pathname;
            },
            pushState: function(pageInfo) {
                if(pageInfo.url.toLowerCase() !== window.location.pathname.toLowerCase()) {
                    window.history.pushState(pageInfo, "Live Status", pageInfo.url);
                }
            }
        };
    })();

    TLRGRP.BADGER.Dashboard.PageManager = function(options) {
        options = $.extend({}, options);

        var dashboards = TLRGRP.BADGER.Dashboard.getAll();
        var defaultDashboard = 'BigScreen';
        var currentDashboard = getDashboardFromUrl();

        function getCurrentUrlWithoutBase() {
            var url = TLRGRP.BADGER.URL.current();

            if(options.baseUrl) {
                url = url.replace(new RegExp(options.baseUrl, 'i'), '');
            }

            return url;
        }

        function getDashboardFromUrl() {
            var currentUrl = getCurrentUrlWithoutBase();
            var splitUrl = currentUrl.split('/');

            if(splitUrl.length > 1 && splitUrl[1]) {
                return splitUrl[1];
            }

            return defaultDashboard;
        }

        function getViewFromUrl() {
            var currentUrl = getCurrentUrlWithoutBase();
            var splitUrl = currentUrl.split('/');

            if(splitUrl.length > 2) {
                return splitUrl[2];
            }

            return;
        }

        function buildUrl(dashboardId, viewId) {
            var url = (options.baseUrl || '');
            var dashboard = TLRGRP.BADGER.Dashboard.getById(dashboardId);

            if(viewId && !dashboard.views[viewId].isDefault) {
                return url + '/' + dashboardId + '/' + viewId;
            }

            if(dashboardId === defaultDashboard) {
                return url + '/';
            }

            return url + '/' + dashboardId;
        }

        function subscribeToMessageBusEvents() {
            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(dashboardAndView) {
                var dashboard = dashboardAndView.dashboard;
                var view = dashboardAndView.view;
                var selectedDashboard = TLRGRP.BADGER.Dashboard.getById(dashboard);

                currentDashboard = dashboard;

                if(!view) {
                    view = _(selectedDashboard.views).map(function(view) {
                        if(view.isDefault) {
                            return view.id;
                        }
                    })[0];
                }

                TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
                    id: dashboard
                });

                TLRGRP.messageBus.publish('TLRGRP.BADGER.View.Selected', {
                    dashboard: dashboard,
                    id: view
                });

                TLRGRP.BADGER.URL.pushState({ 
                    url: buildUrl(dashboard, view),
                    dashboard: dashboard,
                    view: view
                });
            });

            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.PAGE.HistoryPopState', function(state) {
                TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
                    dashboard: state.dashboard,
                    view: state.view
                });
            });
        }

        subscribeToMessageBusEvents();

        TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
            dashboard: currentDashboard,
            view: getViewFromUrl()
        });
    };
})();