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

                var maxDateMoment = moment(maxDate).subtract('weeks', 1);
                maxDate = maxDateMoment.valueOf();

                var seconds = moment(maxDate).diff(currentDate, 's');
                var calendarWidth = rotas.width() - 600;
                var blockSize = calendarWidth / seconds;

                if(rotas.children().length) {
                    return;
                }

                var days = _.range(0, moment(maxDate).diff(currentDate, 'days') + 1);
                var months = [currentDate.format('MMM')];

                if (moment(maxDate).month() !== currentDate.month()) {
                    months.push(moment(maxDate).format('MMM'));
                };

                var calendarHeader = '<div class="calendar-header"><div class="calendar-header-months">' 
                        + _.map(months, function(month, i) {
                            var width = 'auto';

                            if(months.length === 2 && !i) {
                                var beginningOfNextMonth = moment(currentDate).add('month', 1).startOf('month');
                                width = 'width: ' + ((beginningOfNextMonth.unix() - moment(currentDate).unix()) * blockSize) + 'px';
                            }

                            return Mustache.render('<div class="calendar-header-month" style="{{width}}">{{month}}</div>', { 
                                month: month,
                                width: width
                            });
                        }).join('')
                        + '</div><div class="calendar-header-days">'
                        + _.map(days, function(day) {
                            var dayMoment = moment(currentDate).add('days', day);
                            var width = blockSize * 24 * 60 * 60;

                            console.log(moment(dayMoment).format());
                            console.log(moment(maxDate).format());
                            console.log(moment(dayMoment).startOf('day').isSame(moment(maxDate).startOf('day')));

                            if(dayMoment.isSame(currentDate)) {
                                width = ((24 * 60 * 60) - (dayMoment.unix() - moment(dayMoment).startOf('day').unix())) * blockSize;
                            }
                            else if (moment(dayMoment).startOf('day').isSame(moment(maxDate).startOf('day'))) {
                                width = (moment(maxDate).unix() - moment(maxDate).startOf('day').unix()) * blockSize;
                            }

                            return Mustache.render('<div class="calendar-header-day" style="width: {{width}}px">{{{day}}}</div>', { 
                                day: width > 16 ? dayMoment.format('DD') : '&nbsp;',
                                width: width
                            });
                        }).join('')
                    + '</div></div>';

                rotas.html('<li class="header"><div class="team-title">Team</div><div class="team-current-oncall">Current</div>' + calendarHeader + '</li>' + _.map(rota, function(detail, team) {
                    if(!detail.schedule.length) {
                        return;
                    }

                    var teamClass = team.replace(/ /ig, '-').toLowerCase();
                    var blocks = _.map(detail.schedule, function(scheduleItem, i) {
                        var scheduleItemStart = moment(scheduleItem.start);
                        var scheduleItemEnd = moment(scheduleItem.end);
                        var segmentStartDate;
                        var segmentEndDate;

                        if((scheduleItemStart.isBefore(currentDate) && scheduleItemEnd.isBefore(currentDate))
                            || ((scheduleItemStart.isAfter(maxDateMoment) || scheduleItemStart.isSame(maxDateMoment)) && scheduleItemEnd.isAfter(maxDateMoment))) {
                            return;
                        }
                        
                        if (scheduleItemStart.isBefore(currentDate)) {
                            segmentStartDate = moment();
                        }
                        else {
                            segmentStartDate = moment(scheduleItem.start);
                        }
                        
                        if (scheduleItemEnd.isAfter(maxDateMoment)) {
                            segmentEndDate = maxDateMoment;
                        }
                        else {
                            segmentEndDate = moment(scheduleItem.end);
                        }

                        var width = (segmentEndDate.diff(segmentStartDate, 's') * blockSize) - 12;

                        return Mustache.render('<div class="rotation-calendar-block" style="{{padding}}width: {{width}}px; margin-right: 2px; background-color: {{backgroundColor}}" title="{{start}} to {{end}} - {{oncall}}">{{oncall}}</div>', {
                            width: width > 10 ? width : (width + 10),
                            start: segmentStartDate.format(),
                            end: segmentEndDate.format(),
                            oncall: width > 10 ? scheduleItem.oncall : '',
                            padding: width > 10 ? '' : 'padding-left: 0; padding-right: 0;',
                            backgroundColor: teamColourMap[teamClass] || '#ddd'
                        });
                    }).join('');

                    return Mustache.render('<li>' 
                            + '<div class="team-title" style="color: {{teamColour}}">' 
                                + '<div class="team-icon" style="border-color: {{teamColour}}"><span class="{{teamIconClass}}"></span></div>' 
                                + '<div class="team-title-text">{{team}}</div>'
                            + '</div>' 
                            + '<div class="team-current-oncall" style="color: {{teamColour}}">' 
                                + '<div class="user-icon" style="border-color: {{teamColour}}"><span class="{{userIconClass}}"></span></div>'
                                + '<div class="user-title-text">{{current}}</div>'
                            + '</div>' 
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