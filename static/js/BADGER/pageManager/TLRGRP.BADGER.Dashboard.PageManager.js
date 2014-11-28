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

        function getTimeFrameFromUrl() {
            var currentUrl = getCurrentUrlWithoutBase();
            var splitUrl = currentUrl.split('/');

            if(splitUrl.length > 3) {
                var timeFrameUrlSegment = splitUrl[3];
                var timeFrame;

                var days = {
                    'Today': 0,
                    'Yesterday': 1
                };

                if(typeof days[timeFrameUrlSegment] !== 'undefined') {
                    return {
                        timeFrame: days[timeFrameUrlSegment],
                        units: 'daysAgo',
                        userSet: true
                    };
                }

                var daysAgoRegex = /([0-9]+)DaysAgo/;
                var matches = daysAgoRegex.exec(timeFrameUrlSegment);

                if(matches) {
                    return {
                        timeFrame: parseInt(matches[1], 10),
                        units: 'daysAgo',
                        userSet: true
                    };
                }

                var relativeRegex = /([0-9]+)((hour|min|minute|day)(s)?)/;
                matches = relativeRegex.exec(timeFrameUrlSegment);

                if(matches) {
                    return {
                        timeFrame: parseInt(matches[1], 10),
                        units: matches[2],
                        userSet: true
                    };
                }
            }
        }

        function buildUrl(dashboardId, viewId, timeFrame, queryParameters) {
            var url = (options.baseUrl || '');
            var dashboard = TLRGRP.BADGER.Dashboard.getById(dashboardId);
            var queryString = '';

            if(queryParameters) {
                queryString = '?' + _.map(queryParameters, function(value, parameter) {
                    return parameter + '=' + value;
                }).join('&');
            }

            if(timeFrame && timeFrame.userSet) {
                var timeFrameUrl;

                if(timeFrame.units === 'daysAgo') {
                    var daysAgo = {
                        '0': 'Today',
                        '1': 'Yesterday'
                    };

                    timeFrameUrl = (daysAgo[timeFrame.timeFrame] || (timeFrame.timeFrame + 'DaysAgo'));
                }
                else {
                    timeFrameUrl = timeFrame.timeFrame + timeFrame.units;
                }

                return url + '/' + dashboardId + '/' + viewId + '/' + timeFrameUrl + queryString;
            }

            if(viewId && dashboard.views[viewId] && !dashboard.views[viewId].isDefault) {
                return url + '/' + dashboardId + '/' + viewId + queryString;
            }

            if(dashboardId === defaultDashboard) {
                return url + '/' + queryString;
            }

            return url + '/' + dashboardId + queryString;
        }

        var currentTimeFrame;
        var dashboard;
        var view;

        function subscribeToMessageBusEvents() {
            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.TimePeriod.Set', function(timeFrame) {
                currentTimeFrame = timeFrame;

                TLRGRP.BADGER.URL.pushState({ 
                    url: buildUrl(dashboard, view, currentTimeFrame),
                    dashboard: dashboard,
                    view: view
                });
            });

            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(dashboardAndView) {
                dashboard = dashboardAndView.dashboard;
                view = dashboardAndView.view;
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

                var newUrl = buildUrl(dashboard, view, currentTimeFrame, dashboardAndView.queryParameters);

                TLRGRP.messageBus.publish('TLRGRP.BADGER.View.Selected', {
                    dashboard: dashboard,
                    id: view,
                    url: newUrl
                });

                TLRGRP.BADGER.URL.pushState({ 
                    url: newUrl,
                    dashboard: dashboard,
                    view: view,
                    queryParameters: dashboardAndView.queryParameters
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

        var urlTimeFrame = getTimeFrameFromUrl();
        dashboard = currentDashboard;
        view = getViewFromUrl();

        if(urlTimeFrame) {
            currentTimeFrame = urlTimeFrame;
            TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', urlTimeFrame);
        }

        TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
            dashboard: currentDashboard,
            view: view
        });
    };
})();