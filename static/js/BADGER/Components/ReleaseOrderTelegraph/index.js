(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var signalPriority = {
        'green': 2,
        'amber': 1,
        'red': 0
    };

    var bigIndicatorStates = {
        'green': { text: 'Board is green<br/>Clear to release', icon: '<span class="fa fa-thumbs-up"></span>' },
        'amber': { text: 'Proceed with caution, check before starting', icon: '<span class="release-signal-indicator-icon">!</span>' },
        'red': { text: 'Do not start new releases', icon: '<span class="release-signal-indicator-icon">X</span>' },
    };

    var checkTypeExtendedInfoTemplates = {
        manualSignal: function(check) {
            var signalReleasesAt;

            if(check.setUntil) {
                signalReleasesAt = moment(check.setUntil);

                if(signalReleasesAt.isAfter(moment().add(1, 'days').startOf('day'))) {
                    signalReleasesAt = 'Midnight';
                }
                else {
                    signalReleasesAt = signalReleasesAt.format('HH:mm') + ' (' + signalReleasesAt.from(moment()) + ')';
                }
            }

            return Mustache.render('<div class="release-signal-check-list-item-reason">{{#reason}}<b>{{reason}}</b>{{/reason}}'
             + '{{#showReleaseTime}}<div class="release-signal-check-list-item-can-release-at">Signal Released at: {{releasedAt}}</div>{{/showReleaseTime}}</div>', {
                 reason: check.reason,
                 showReleaseTime: check.setUntil ? true : false,
                 releasedAt: signalReleasesAt
             });
        },
        schedule: function(check) {
            var nextReleaseChangeText;

            if(check.nextChange) {
                var changesAt = moment(check.nextChange.changeAt);
                var daysDifference = moment(check.nextChange.changeAt).startOf('day').diff(moment().startOf('day'), 'days');

                var changeText = {
                    'green': 'Releases allowed from',
                    'amber': 'Releases restricted from',
                    'red': 'Releases stop at'
                };

                nextReleaseChangeText = changeText[check.nextChange.toSignal] + ' ';

                if(daysDifference < 2) {
                    nextReleaseChangeText += changesAt.format('HH:mm') + ' ' + (daysDifference ? 'tomorrow' : 'today');
                }
                else if (daysDifference < 7) {
                    nextReleaseChangeText += changesAt.format('HH:mm dddd');
                }
                else {
                    nextReleaseChangeText += changesAt.format('DD/MM/YYYY HH:mm');
                }
            }

            return Mustache.render('<div class="release-signal-check-list-item-reason">{{#reason}}{{reason}}{{/reason}}'
            + '{{#showReleaseTime}}<div class="release-signal-check-list-item-can-release-at">{{nextReleaseChangeText}}</div>{{/showReleaseTime}}</div>', {
                reason: check.reason,
                showReleaseTime: check.nextChange ? true : false,
                nextReleaseChangeText: nextReleaseChangeText
            });
        },
        concurrentReleases: function(check) {
            var signalThresholdTemplates = {
                'amber': {
                    'under': '{{remaining}} more allowed until caution required',
                    'equal': 'At caution limit',
                    'over': '{{remaining}} over caution limit'
                },
                'red': {
                    'under': '{{remaining}} more allowed until pause',
                    'equal': 'At pause limit',
                    'over': '{{remaining}} over pause limit'
                }
            };

            return Mustache.render('<div class="release-signal-check-list-item-releases-ongoing">{{concurrentReleases}} Ongoing Releases</div>'
                + '{{#allowedText}}<div class="release-signal-check-list-item-releases-limits">{{text}}</div>{{/allowedText}}', {
                concurrentReleases: check.concurrentReleases,
                allowedText: _.map(check.thresholds, function(threshold) {
                    var underOver = check.concurrentReleases === threshold.limit ? 'equal' : check.concurrentReleases >= threshold.limit ? 'over': 'under';

                    return { text:  Mustache.render(signalThresholdTemplates[threshold.signal][underOver], {
                        remaining: Math.abs(threshold.limit - check.concurrentReleases)
                    }) }
                })
            });
        }
    };

    var defaultExtendedInfoTemplate = function(check) {
        return Mustache.render('{{#reason}}<div class="release-signal-check-list-item-reason">{{reason}}</div>{{/reason}}', check);
    }

    TLRGRP.BADGER.Dashboard.Components.ReleaseOrderTelegraph = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });

        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            query: { url: configuration.url },
            refresh: 2500,
            callbacks: {
                success: function (data) {
                    var rotData = JSON.parse(data.query);
                    var signalState = rotData.signal;

                    var checkList = Mustache.render('<ul class="release-signal-check-list">{{#checks}}'
                            + '<li class="release-signal-check-list-item">'
                                + '<div class="release-signal-check-list-item-indicator {{signal}}">{{{icon}}}</div>'
                                + '<div class="release-signal-check-list-item-text {{signal}}">{{name}}</div>'
                                + '{{{extended}}}'
                            +'</li>'
                        +'{{/checks}}</ul>', {
                        checks: _.chain(rotData.checks).sortBy(function(check) { return signalPriority[check.signal]; }).map(function(check) {
                            return {
                                signal: check.signal,
                                icon: bigIndicatorStates[check.signal].icon,
                                name: check.name || check.type,
                                extended: (checkTypeExtendedInfoTemplates[check.type] || defaultExtendedInfoTemplate)(check)
                            };
                        }).value()
                    });

                    signalContainer.html(Mustache.render('<div class="release-signal-indicator {{signalState}}">{{{icon}}}</div><div class="release-signal-text {{signalState}}">{{{text}}}</div>{{{checkList}}}', {
                        signalState: signalState,
                        text: bigIndicatorStates[signalState].text,
                        icon: bigIndicatorStates[signalState].icon,
                        checkList: checkList
                    }));
                }
            },
            components: {
                loading: inlineLoading
            }
        });

        var plannedReleasesDataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            query: { url: configuration.zendeskApiUrl + '/releases/' + moment().format('YYYY-MM-DD') },
            refresh: 2500,
            callbacks: {
                success: function (data) {
                    var releaseGroupOrder = {
                        'requested': 0,
                        'pending': 1,
                        'in-progress': 2,
                        'approved': 3,
                        'successful': 4,
                        'failed': 5
                    };
                    var releases = _.reduce(data.query.releases,function(filteredReleases, release) {
                        if(release.status === 'successful' || release.status === 'failed' || release.status === 'in-progress') {
                            return filteredReleases;
                        }

                        filteredReleases.push(release);

                        return filteredReleases;
                    }, []);
                    var groupedReleases = _.groupBy(releases, function(release) {
                        return release.status;
                    });
                    var groups = _.chain(Object.keys(groupedReleases)).reduce(function(all, key) {
                        all.push(key);

                        return all;
                    }, []).sortBy(function(groupName) {
                        return releaseGroupOrder[groupName];
                    }).value();

                    if(groups.length) {
                        plannedList.html(_.map(groups, function(group) {
                            var groupName = group[0].toUpperCase() + group.substring(1);

                            return '<li class="planned-releases-list-header">' + groupName + '</li>' + _.map(groupedReleases[group], function(release) {
                                var start;


                                if(release.isScheduled) {
                                    start = moment(release.start).format('HH:mm');
                                }
                                else {
                                    start = '--';
                                }

                                var productTeam;
                                var raisedSince = moment().diff(moment(release.created_at));
                                var minutesSinceRaised = raisedSince / 1000 / 60;
                                var timeSinceRaisedTextColour = 'green';

                                if(release.status !== 'approved') {
                                    if(minutesSinceRaised >= 10 && minutesSinceRaised < 20) {
                                        timeSinceRaisedTextColour = 'amber';
                                    }
                                    else if (minutesSinceRaised >= 20) {
                                        timeSinceRaisedTextColour = 'red';
                                    }
                                }

                                var riskStyles = {
                                    'unknown': { icon:'mega-octicon octicon-question', colour: '#000' },
                                    'low': { icon: 'mega-octicon octicon-squirrel', colour: 'green' },
                                    'moderate': { icon: 'mega-octicon octicon-thumbsdown', colour: 'amber' },
                                    'high': { icon: 'mega-octicon octicon-alert', colour: '#red' },
                                    'very-high': { icon: 'mega-octicon octicon-flame', colour: '#red' }
                                };

                                if(release.productTeam) {
                                    productTeam = release.productTeam[0].toUpperCase() + release.productTeam.substring(1);
                                }


                                return '<li class="planned-releases-list-item">'
                                    + '<div class="planned-releases-list-item-subject"><a class="planned-releases-list-item-link" href="https://tlrg-servicehub.zendesk.com/agent/tickets/' + release.id + '" target="_blank">' + release.id + '</a> - ' + release.subject + '</div>'
                                    + '<div class="planned-releases-list-item-team">'
                                        + '<span class="planned-releases-list-item-team-icon mega-octicon octicon-organization"></span>&nbsp;' + productTeam
                                        + '&nbsp;<span class="planned-releases-list-item-team-icon mega-octicon octicon-person"></span>&nbsp;' + release.submitter.name
                                        + '&nbsp;<span style="color: ' + timeSinceRaisedTextColour + '"><span class="planned-releases-list-item-team-icon mega-octicon octicon-clock"></span>&nbsp;raised ' + moment.duration(raisedSince).humanize() + ' ago</span>'
                                        + '&nbsp;<span style="color: ' + riskStyles[(release.risk || 'unknown')].colour + '"><span class="planned-releases-list-item-team-icon ' + riskStyles[(release.risk || 'unknown')].icon + '"></span>&nbsp;' + (release.risk || 'unknown') + ' risk</span>'
                                    + '</div>'
                                + '</li>';
                            }).join('')
                        }));
                    }
                    else {
                        plannedList.html('<li class="planned-releases-list-none">No Pending Releases</li>');
                    }

                }
            },
            components: {
                loading: inlineLoading
            }
        });

        var signal = $('<div></div>');
        var signalContainer = $('<div></div>').appendTo(signal);
        var plannedContainer = $('<div class="planned-releases">'
            + '<div><div class="planned-releases-title-icon"><span class="fa fa-pied-piper-alt"></span></div><div class="planned-releases-title-text">Pending Releases</div></div>'
        + '</div>').appendTo(signal);

        var plannedList = $('<ul class="planned-releases-list"></ul>').appendTo(plannedContainer);

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'conversion-status',
			modules: [
                inlineLoading,
                {
                    appendTo: function (container) {
                        signal.appendTo(container);
                    }
                }
            ]
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
                        plannedReleasesDataStore.start(true);
                    },
                    stop: function() {
                        dataStore.stop();
                        plannedReleasesDataStore.stop();
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
