(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    var template = {
        'inprogress': function(release) {
            var stages = [];
            var currentStatus = 'Shipping';
            var releaseStatusIcon = '<span class="release-status-icon release-status-shipping mega-octicon octicon-squirrel"></span>';

            for(var x = 1; x <= release.totalStages; x++) {
                var stageClass = '';
                if(release.currentStage.number === x) {
                    if(release.currentStage.state === 'Passed') {
                        stageClass = ' stage-complete';
                        currentStatus = 'Waiting';
                        releaseStatusIcon = '<span class="release-status-icon release-status-waiting fa fa-pause"></span>';
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
                    + '<li class="stage {{stageClass}}"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '{{/stages}}<li class="release-progress-label">{{current}}/{{total}}</li></ul>', {
                stages: stages,
                total: release.totalStages,
                current: release.currentStage.number
            });

            return Mustache.render('<li class="release-item">' 
                + '<div class="team-icon"><span class="release-status-icon no-logo mega-octicon octicon-package"></span><div class="team-label">{{team}}</div></div>' 
                + '<div class="release-status">' 
                    + '{{{releaseStatusIcon}}}'
                    + '<div class="release-status-label">{{currentStatus}}</div>' 
                + '</div>' 
                + '<h3>{{name}}</h3>' 
                + '<div class="release-progress-header">Progress: </div>'
                + '{{{progress}}}' 
                + '<ul class="release-info">' 
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-git-commit"></span>Current Stage: {{currentStage}}</li>'
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-clock"></span>Started at: {{startedAt}}</li>'
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Triggered By: {{triggeredBy}}</li>'
                + '</ul>'
            + '</li>', {
                name: release.pipeline,
                team: release.team,
                progress: progress,
                startedAt: moment(release.startedAt).format('HH:mm:ss'),
                currentStage: release.currentStage.name,
                triggeredBy: release.triggeredBy,
                currentStatus: currentStatus,
                releaseStatusIcon: releaseStatusIcon
            });
        },
        'completed': function(release) {
            var statusClass = 'release-status-icon release-complete-ok fa fa-thumbs-up';

            if(release.currentStage.result === 'Failed') {
                statusClass = 'release-status-icon release-complete-failed mega-octicon octicon-flame';
            }

            return Mustache.render('<li class="release-item"><div class="release-status"><span class="{{statusClass}}"></span></div>' 
                    + '<div class="completed-releases-container">' 
                        + '<div class="completed-release-name">{{name}}</div>'
                        + '<ul class="release-info">' 
                            + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-clock"></span>{{startedAt}} - {{completedAt}}</li>'
                            + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-organization"></span>Team: {{team}}</li>'
                            + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Triggered By: {{triggeredBy}}</li>'
                        + '</ul>'
                    + '</div></li>', {
                name: release.pipeline,
                team: release.team,
                statusClass: statusClass,
                startedAt: moment(release.startedAt).format('HH:mm'),
                completedAt: moment(release.completedAt).format('HH:mm'),
                triggeredBy: release.triggeredBy
            });
        }
    };

    function render(releaseState, data) {
        this.html(_.map(data, function(release) {
            if(!template[releaseState]) { return; }

            return template[releaseState](release);
        }).join(''));
    }

    function releasePanelFactory(releaseState) {
        return function releasesPanel(configuration) {
            var lastData;
            var containerElement = $('<ul class="releases-list releases-' + releaseState + '"></ul>');
            var setUpRender = render.bind(containerElement, releaseState);

            var orderElement = $('<div class="release-order-selector' + (releaseState === 'completed' ? ' desc': '') + '">' 
                + '<span class="release-order-selector-icon-asc fa fa-sort-numeric-asc"></span>' 
                + '<span class="release-order-selector-icon-desc fa fa-sort-numeric-desc"></span>&nbsp;' 
                + '<span class="release-order-selector-label-asc">Order By Oldest First</span>' 
                + '<span class="release-order-selector-label-desc">Order By Latest First</span>' 
                + '</div>').on('click', function() { 
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
                    return moment(release.startedAt).valueOf();
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