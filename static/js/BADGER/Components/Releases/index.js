(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

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
                + '<li>Current Stage: </li>'
                + '<li>Started at: </li>'
                + '<li>Triggered By: </li>'
            + '</ul>'
        + '</li>'
    };

	function releasesPanel(releaseState, configuration) {
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

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        componentLayout.appendTo(container);

                        return this.transitionToState('initialising');
                    }
                },
                initialising: {
                    _onEnter: function () { }
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


	TLRGRP.BADGER.Dashboard.Components.InProgressReleases = releasesPanel.bind(undefined, 'inprogress');
	TLRGRP.BADGER.Dashboard.Components.CompletedReleases = releasesPanel.bind(undefined, 'completed');
	TLRGRP.BADGER.Dashboard.Components.ScheduledReleases = releasesPanel.bind(undefined, 'scheduled');
})();