(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    var template = {
        'inprogress': function(release) {
            console.log(release);

            var stages = [];

            for(var x = 0; x < release.totalStages; x++) {
                var stageClass = '';
                if(release.currentStage.number === x) {
                    stageClass = ' stage-inprogress'
                }
                else if (release.currentStage.number > x) {
                    stageClass = ' stage-complete'
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
                + '<div class="team-icon"><span class="no-logo mega-octicon octicon-package"></span><div class="team-label">{{team}}</div></div>' 
                + '<div class="release-status"><span class="mega-octicon octicon-squirrel"></span><div class="release-status-label">Shipping</div></div>' 
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
                triggeredBy: release.triggeredBy
            });
        }
    };

    function releasePanelFactory(releaseState) {
        return function releasesPanel(configuration) {
            var containerElement = $('<ul class="releases-list releases-' + releaseState + '"></ul>');

            var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
            var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
                title: configuration.title,
                componentClass: 'release-list',
                layout: configuration.layout,
                modules: [
                    inlineLoading,
                    {
                        appendTo: function(componentElement) {
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

                containerElement.html(_.map(sortedReleases, function(release) {
                    if(!template[releaseState]) { return; }

                    return template[releaseState](release);
                }).join(''));
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