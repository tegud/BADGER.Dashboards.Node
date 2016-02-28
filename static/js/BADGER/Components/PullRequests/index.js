(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    var template = {
        'inprogress': function(pullRequest) {
            var startedAt = moment(pullRequest.created_at);
            var assignedTo = undefined;
            var assignedToAvatar = undefined;

            if (pullRequest.assignee) {
                assignedTo = pullRequest.assignee.login;
                assignedToAvatar = pullRequest.assignee.avatar_url;
            }

            return Mustache.render('<li class="release-item">' 
                + '<div class="team-icon"><span class="release-status-icon no-logo mega-octicon octicon-git-pull-request"></span><div class="team-label">{{team}}</div></div>' 
                + '<h3>{{name}} <span class="pipeline-name-counter">(#{{counter}})</span> <a href="{{prUrl}}"><span class="fa fa-external-link"></span></a></h3>'
                + '<ul class="release-info">' 
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-clock"></span>Opened at: {{startedAt}}</li>'
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Created By: <img src="{{triggeredByAvatar}}" height="28"> {{triggeredBy}}</li>'
                    + '{{#assignedTo}}<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Assigned To: <img src="{{assignedToAvatar}}" height="28"> {{assignedTo}}</li>{{/assignedTo}}'
                + '</ul>'
            + '</li>', {
                name: pullRequest.title,
                team: pullRequest.base.repo.name,
                prUrl: pullRequest.html_url,
                counter: pullRequest.number,
                startedAt: startedAt.format('HH:mm:ss') + ' (' + startedAt.fromNow(true) + ')',
                triggeredBy: pullRequest.user.login,
                triggeredByAvatar: pullRequest.user.avatar_url,
                assignedTo: assignedTo, 
                assignedToAvatar: assignedToAvatar
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
            this.html(_.map(data, function(pullRequest) {
                if(!template[releaseState]) { return; }

                return template[releaseState](pullRequest);
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

            var orderElement = $(Mustache.render('<div class="release-order-selector{{directionClass}}">' 
                + '<span class="release-order-selector-icon-asc fa fa-sort-numeric-asc"></span>' 
                + '<span class="release-order-selector-icon-desc fa fa-sort-numeric-desc"></span>&nbsp;' 
                + '<span class="release-order-selector-label-asc">Order By Oldest First</span>' 
                + '<span class="release-order-selector-label-desc">Order By Latest First</span>' 
                + '</div>', {
                    directionClass: (releaseState === 'completed' || configuration.defaultSortOrder === 'Descending') ? ' desc': ''
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
                var allPRs = _.flatten(_.values(data));
                var sortedPRs = _.sortBy(allPRs, function(release) {
                    return moment(release['created_at']).valueOf();
                });

                if(orderElement.hasClass('desc')) {
                    sortedPRs = sortedPRs.reverse();
                }

                lastData = sortedPRs;

                setUpRender(sortedPRs);
            }

            function calculateNextRefresh(nextServerSideRefresh) {
                var adjustedNextServerSideRefresh = moment(nextServerSideRefresh).add(500, 'ms');
                var refreshIn = moment(adjustedNextServerSideRefresh).diff(moment());
                var minRefreshInterval = 1000;

                if (refreshIn < minRefreshInterval) {
                    refreshIn = minRefreshInterval;
                }

                return refreshIn;
            }

            var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
            var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated();
            var inlineError = new TLRGRP.BADGER.Dashboard.ComponentModules.Error();
            var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
                query: {
                    url: configuration.sourceUrl,
                },
                refresh: 2500,
                callbacks: {
                    success: function (data) {
                        inlineError.hide();
                        refreshComplete(data);
                        dataStore.setNewRefresh(calculateNextRefresh(data.nextRefreshAt));
                    },
                    error: function (errorInfo) {
                        if (errorInfo && errorInfo.responseJSON && errorInfo.responseJSON.error) {
                            inlineError.show(errorInfo.responseJSON.error);
                        }
                        else {
                            inlineError.show('Cannot access pull request status server.');
                        }

                        dataStore.setNewRefresh(10000);
                    }
                },
                mappings: [
                    { "type": "pickValue", "value": "query", "field": "query" }
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

	TLRGRP.BADGER.Dashboard.Components.PullRequests = releasePanelFactory('inprogress');
})();