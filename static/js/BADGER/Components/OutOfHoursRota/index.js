(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    var teamIconMap = {
        "application-support": "mega-octicon octicon-terminal",
        "system-support": "mega-octicon octicon-server",
        "database-support": "mega-octicon octicon-database",
        "duty-management": "mega-octicon octicon-megaphone"
    };

    var teamColourMap = {
        'database-support': '#B1A0C7',
        'application-support': '#00B1F1',
        'system-support': '#00B050',
        'duty-management': '#FF0000',
    };

    var userColourMap = {

    };

    TLRGRP.BADGER.Dashboard.Components.OutOfHoursRota = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + ':' + configuration.port + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });
        var rotas = $('<ul class="ooh-rota"/>');

        var modules = [
            lastUpdated,
            inlineLoading,
            {
                appendTo: function (container) {
                    rotas.appendTo(container);
                }
            }
        ];

        var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
            title: configuration.title,
            layout: configuration.layout,
            componentClass: 'conversion-status',
            modules: modules
        });

        var callbacks = {
            success: function (data) {
                var rota = JSON.parse(data.query);

                var currentDate = moment();
                var maxDate = _.chain(rota).map(function(detail) {
                    if(!detail.schedule.length) {
                        return;
                    }

                    return moment(detail.schedule[detail.schedule.length - 1].end).valueOf();
                }).max().value();

                var seconds = moment(maxDate).diff(currentDate, 's');
                var calendarWidth = rotas.width() - 570;
                var blockSize = calendarWidth / seconds;

                if(rotas.children().length) {
                    return;
                }

                rotas.html('<li class="header"><div class="team-title">Team</div><div class="team-current-oncall">Current</div><div class=""></div></li>' + _.map(rota, function(detail, team) {
                    if(!detail.schedule.length) {
                        return;
                    }

                    var teamClass = team.replace(/ /ig, '-').toLowerCase();
                    var blocks = _.map(detail.schedule, function(scheduleItem, i) {
                        var scheduleItemStart = moment(scheduleItem.start);
                        var scheduleItemEnd = moment(scheduleItem.end);
                        var segmentStartDate;

                        if(scheduleItemStart.isBefore(currentDate) && scheduleItemEnd.isBefore(currentDate)) {
                            return;
                        }
                        else if (scheduleItemStart.isBefore(currentDate)) {
                            segmentStartDate = moment();
                        }
                        else {
                            segmentStartDate = moment(scheduleItem.start);
                        }

                        var segmentEndDate = moment(scheduleItem.end);
                        var width = (segmentEndDate.diff(segmentStartDate, 's') * blockSize) - 12;

                        return Mustache.render('<div class="rotation-calendar-block" style="width: {{width}}px; margin-right: 2px; background-color: {{backgroundColor}}" title="{{start}} - {{oncall}}">{{oncall}}</div>', {
                            width: width,
                            start: segmentStartDate.format(),
                            end: segmentEndDate.format(),
                            oncall: scheduleItem.oncall,
                            backgroundColor: teamColourMap[teamClass] || '#ddd'
                        });
                    }).join('');

                    return Mustache.render('<li>' 
                            + '<div class="team-title" style="color: {{teamColour}}"><div class="team-icon" style="border-color: {{teamColour}}"><span class="{{teamIconClass}}"></span></div>{{team}}</div>' 
                            + '<div class="team-current-oncall" style="color: {{teamColour}}"><div class="user-icon" style="border-color: {{teamColour}}"><span class="{{userIconClass}}"></span></div>{{current}}</div>' 
                            + '<div class="rotation-calendar-row" style="width: {{calendarWidth}}px">{{{blocks}}}</div>'
                            + '</li>', { 
                        team: team, 
                        current: detail.current,
                        teamColour: teamColourMap[teamClass] || '#000',
                        teamIconClass: teamIconMap[teamClass] || 'fa fa-question',
                        userIconClass: 'fa fa-user',
                        calendarWidth: calendarWidth,
                        blocks: blocks
                    });
                }).join(''));

            },
            error: function (errorInfo) {
                if (errorInfo && errorInfo.responseJSON && errorInfo.responseJSON.error) {
                    inlineError.show(errorInfo.responseJSON.error);
                }
                else {
                    inlineError.show('Cannot access health check server.');
                }
            }
        };

        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
                query: {
                    url: '/redis/hash/oncallSchedule'
                },
                refresh: 5000,
                callbacks: callbacks,
                mappings: [
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
                        dataStore.start(true);
                    }
                }
            },
            initialState: 'uninitialised'
        });

        return {
            render: function (container) {
                inlineLoading.loading();
                return stateMachine.handle('initialise', container);
            },
            unload: function () {
                stateMachine.handle('stop');
                stateMachine.handle('remove');
            }
        };
    }
})();