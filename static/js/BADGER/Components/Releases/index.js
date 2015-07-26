(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    var testData = {
        'inprogress': '<li class="release-item">' 
            + '<div class="team-icon"><span class="no-logo mega-octicon octicon-package"></span><div class="team-label">Moonstick</div></div>' 
            + '<div class="release-status"><span class="mega-octicon octicon-squirrel"></span><div class="release-status-label">Shipping</div></div>' 
            + '<h3>Moonstick.JS</h3>' 
            + '<div class="release-progress-header">Progress: </div>'
            + '<ul class="release-progress">' 
                + '<li class="stage stage-complete"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage stage-complete"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage stage-complete"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage stage-complete"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage stage-inprogress"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="stage"><span class="stage-pointer mega-octicon octicon-arrow-up"></span></li>' 
                + '<li class="release-progress-label">3/19</li>'
            + '</ul>' 
            + '<ul class="release-info">' 
                + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-git-commit"></span>Current Stage: </li>'
                + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-clock"></span>Started at: </li>'
                + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Triggered By: </li>'
            + '</ul>'
        + '</li>'
    };

    function releasePanelFactory(releaseState) {
        return function releasesPanel(configuration) {
            var containerElement = $('<ul class="releases-list releases-' + releaseState + '">' + (testData[releaseState] || '') + '</ul>');

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

                console.log(relaventReleases);
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