(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    var template = {
        'inprogress': function(release) {
            var stages = [];
            var currentStatus = 'Shipping';
            var startedAt = moment(release.startedAt);
            var releaseStatusIconClass = 'release-status-icon-shipping';

            for(var x = 1; x <= release.totalStages; x++) {
                var stageClass = '';
                if(release.currentStage.number === x) {
                    if(release.currentStage.state === 'Passed') {
                        stageClass = ' stage-complete';
                        currentStatus = 'Waiting';
                        releaseStatusIconClass = 'release-status-icon-waiting';
                    }
                    else if(release.currentStage.state === 'Failed') {
                        stageClass = ' stage-failed';
                        currentStatus = 'Failed';
                        releaseStatusIconClass = 'release-status-icon-failed';
                    }
                    else if(release.currentStage.state === 'Cancelled') {
                        stageClass = ' stage-cancelled';
                        currentStatus = 'Cancelled';
                        releaseStatusIconClass = 'release-status-icon-cancelled';
                    }
                    else {
                        stageClass = ' stage-inprogress';
                    }
                }
                else if (release.currentStage.number > x) {
                    stageClass = ' stage-complete';
                }

                stages.push({
                    stageClass: stageClass
                });
            }

            var progress = Mustache.render('<ul class="release-progress">{{#stages}}' 
                    + '<li class="stage {{stageClass}}"><span class="stage-pointer mega-octicon octicon-arrow-up"></span><span class="stage-cancelled mega-octicon octicon-x"></span></li>' 
                + '{{/stages}}<li class="release-progress-label">{{current}}/{{total}}</li></ul>', {
                stages: stages,
                total: release.totalStages,
                current: release.currentStage.number
            });
            return Mustache.render('<li class="release-item">' 
                + '<div class="team-icon"><span class="release-status-icon no-logo mega-octicon octicon-package"></span><div class="team-label">{{team}}</div></div>' 
                + '<div class="release-status {{releaseStatusIconClass}}">' 
                    + '<span class="release-status-icon release-status-waiting fa fa-pause"></span>'
                    + '<span class="release-status-icon release-status-failed fa fa-exclamation-triangle"></span>'
                    + '<span class="release-status-icon release-status-cancelled mega-octicon octicon-x"></span>'
                    + '<span class="release-status-icon release-status-shipping mega-octicon octicon-squirrel"></span>'
                    + '<div class="release-status-label">{{currentStatus}}</div>' 
                + '</div>' 
                + '<h3>{{name}} <span class="pipeline-name-counter">(#{{counter}})</span></h3>' 
                + '<div class="release-progress-header">Progress: </div>'
                + '{{{progress}}}' 
                + '<ul class="release-info">' 
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-git-commit"></span>{{currentStage}}{{currentStageFor}}</li>'
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-clock"></span>Started at: {{startedAt}}</li>'
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Triggered By: {{triggeredBy}}</li>'
                + '</ul>'
            + '</li>', {
                name: release.pipeline,
                team: release.team,
                counter: release.counter,
                progress: progress,
                startedAt: startedAt.format('HH:mm:ss') + ' (' + startedAt.fromNow(true) + ')',
                currentStage: (currentStatus === 'Shipping' ? 'Current Stage: ' + release.currentStage.name : 'Last Stage: ' + release.currentStage.name),
                currentStageFor: ' (' + moment(release['@timestamp']).fromNow(currentStatus === 'Shipping') + ')',
                triggeredBy: release.triggeredBy,
                currentStatus: currentStatus,
                releaseStatusIconClass: releaseStatusIconClass
            });
        },
        'completed': function(release) {
            var statusClass = 'release-status-icon release-complete-ok fa fa-thumbs-up';
            var startedAt = moment(release.startedAt);
            var completedAt = moment(release.completedAt);

            if(release.currentStage.result === 'Failed') {
                statusClass = 'release-status-icon release-complete-failed mega-octicon octicon-flame';
            }
            if(release.currentStage.result === 'Cancelled') {
                statusClass = 'release-status-icon release-complete-cancelled mega-octicon octicon-x';
            }

            return Mustache.render('<li class="release-item"><div class="release-status"><span class="{{statusClass}}"></span></div>' 
                    + '<div class="completed-releases-container">' 
                        + '<div class="completed-release-name">{{name}} <span class="pipeline-name-counter">(#{{counter}})</span></div>'
                        + '<ul class="release-info">' 
                            + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-clock"></span>{{startedAt}} - {{completedAt}} ({{duration}})</li>'
                            + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-organization"></span>Team: {{team}}</li>'
                            + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Triggered By: {{triggeredBy}}</li>'
                            + '{{{failedOn}}}'
                        + '</ul>'
                    + '</div></li>', {
                name: release.pipeline,
                counter: release.counter,
                team: release.team,
                statusClass: statusClass,
                startedAt: startedAt.format('HH:mm'),
                completedAt: completedAt.format('HH:mm'),
                duration: startedAt.from(completedAt, true),
                triggeredBy: release.triggeredBy,
                failedOn: release.currentStage.result === 'Failed' || release.currentStage.result === 'Cancelled' ? '<li class="release-info-item"><span class="release-info-icon fa fa-exclamation-triangle"></span>' + (release.currentStage.result === 'Failed' ? 'Failed' : 'Cancelled') + ' On: ' + release.currentStage.name + '</li>' : ''
            });
        }
    };

    function render(releaseState, data) {
        if(!data.length) {
            var nothingHtml = $('<div class="no-releases"><div class="fa fa-frown-o"></div> Nothing ' 
                + (releaseState === 'completed' ? 'Shipped' : '<span class="nothing-shipped-counter">Shipping</span>') + '</div>');

            this.html(nothingHtml);
        }
        else {
            this.html(_.map(data, function(release) {
                if(!template[releaseState]) { return; }

                return template[releaseState](release);
            }).join(''));
        }

        if(releaseState === 'completed') {
            if(!data.length) {
                $('.nothing-shipped-counter').text('Shipped Today!');
            }
            else {
                $('.nothing-shipped-counter').text('Shipped for ' + _.chain(data)
                    .map(function(item) { return moment(item.completedAt); })
                    .sortBy(function(item) { return item.valueOf(); })
                    .reverse()
                    .first()
                    .value()
                    .fromNow(true));
            }
        }
    }

    function releasePanelFactory(releaseState) {
        return function releasesPanel(configuration) {
            var lastData;
            var containerElement = $('<ul class="releases-list releases-' + releaseState + '"></ul>');
            var setUpRender = render.bind(containerElement, releaseState);

            if(releaseState === 'scheduled') {
                containerElement.append('<div class="hubot-info-icon mega-octicon octicon-hubot"></div>' 
                    + '<div class="hubot-info">' 
                    + '<h3>Coming Soon</h3>'
                    + 'But hubot in <span class="fa fa-slack"></span> slack would be happy to help:'
                    + '<ul>'
                        + '<li>hubot releases for <day> (today, tomorrow, date format: YYYY-MM-DD)</li>'
                        + '<li>hubot changes for <day> (today, tomorrow, date format: YYYY-MM-DD)</li>'
                        + '<li>hubot approvals for &lt;id&gt;</li>'
                    + '</ul>' 
                    + '</div>')
            }

            var orderElement = $(Mustache.render('<div class="release-order-selector{{directionClass}}">' 
                + '<span class="release-order-selector-icon-asc fa fa-sort-numeric-asc"></span>' 
                + '<span class="release-order-selector-icon-desc fa fa-sort-numeric-desc"></span>&nbsp;' 
                + '<span class="release-order-selector-label-asc">Order By Oldest First</span>' 
                + '<span class="release-order-selector-label-desc">Order By Latest First</span>' 
                + '</div>', {
                    directionClass: releaseState === 'completed' ? ' desc': ''
                })).on('click', function() { 
                    orderElement.toggleClass('desc'); 
                    lastData = lastData.reverse();
                    setUpRender(lastData);
                });

            var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
            var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
                title: configuration.title,
                componentClass: 'release-list',
                layout: configuration.layout,
                modules: [
                    inlineLoading,
                    {
                        appendTo: function(componentElement) {
                            if(releaseState !== 'scheduled') {
                                componentElement.append(orderElement);
                            }
                            componentElement.append(containerElement);
                        },
                        appendToLocation: function() {
                            return 'content';
                        }
                    }
                ]
            });

            function refreshComplete(data) {
                var todaysReleases = _.pluck(data.today.hits.hits, '_source');
                var relaventReleases = _.filter(todaysReleases, function(release) {
                    return release.isComplete === (releaseState === 'completed');
                });
                var sortedReleases = _.sortBy(relaventReleases, function(release) {
                    var orderBy = releaseState === 'completed' ? 'completedAt' : 'startedAt';
                    return moment(release[orderBy]).valueOf();
                });

                if(orderElement.hasClass('desc')) {
                    sortedReleases = sortedReleases.reverse();
                }

                lastData = sortedReleases;

                setUpRender(sortedReleases);
            }

            var dataStoreId = 'LineGraph-' + idIncrementor++;

            var dataStore = {
                start: function () {
                    TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Subscribe.' + configuration.storeId, {
                        id: dataStoreId,
                        refreshComplete: refreshComplete,
                        loading: inlineLoading
                    });
                },
                stop: function () {
                    TLRGRP.messageBus.publish(dataStoreId);
                }
            };

            var stateMachine = nano.Machine({
                states: {
                    uninitialised: {
                        initialise: function (container) {
                            componentLayout.appendTo(container);

                            return this.transitionToState('initialised');
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
        }
    }

	TLRGRP.BADGER.Dashboard.Components.InProgressReleases = releasePanelFactory('inprogress');
	TLRGRP.BADGER.Dashboard.Components.CompletedReleases = releasePanelFactory('completed');
	TLRGRP.BADGER.Dashboard.Components.ScheduledReleases = releasePanelFactory('scheduled');
})();