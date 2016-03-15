(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    var template = {
        'inprogress': function(pullRequest) {
            var createdAt = moment(pullRequest.created_at);
            var assignedTo = undefined;
            var assignedToAvatar = undefined;

            if (pullRequest.assignee) {
                assignedTo = pullRequest.assignee.login;
                assignedToAvatar = pullRequest.assignee.avatar_url;
            }

            return Mustache.render('<li class="release-item">' 
                + '<div class="team-icon"><span class="release-status-icon no-logo mega-octicon octicon-git-pull-request"></span><div class="team-label">{{team}}</div></div>' 
                + '<h3>{{name}} <span class="pipeline-name-counter">(#{{counter}})</span> <a href="{{prUrl}}" target="_blank"><span class="fa fa-external-link"></span></a></h3>'
                + '<ul class="release-info">' 
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-clock"></span>Opened at: {{createdAt}}</li>'
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Created By: <img class="github-user-avatar" src="{{triggeredByAvatar}}" height="25"> {{triggeredBy}}</li>'
                    + '{{#assignedTo}}<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-person"></span>Assigned To: <img class="github-user-avatar" src="{{assignedToAvatar}}" height="25"> {{assignedTo}}</li>{{/assignedTo}}'
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-git-merge pullrequest-mergestate-{{mergeState}}"></span>Merge state: {{mergeState}}</li>'
                    + '<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-git-commit"></span>{{commits}} commits <span class="pullrequest-additions-text">+{{additions}}</span> <span class="pullrequest-changes-text">~{{changes}}</span> <span class="pullrequest-deletions-text">-{{deletions}}</span></li>'
                    + '{{#comments}}<li class="release-info-item"><span class="release-info-icon mega-octicon octicon-comment"></span>{{comments}} comments</li>{{/comments}}'
                + '</ul>'
            + '</li>', {
                name: pullRequest.title,
                team: pullRequest.base.repo.name,
                prUrl: pullRequest.html_url,
                counter: pullRequest.number,
                createdAt: createdAt.format('HH:mm:ss') + ' (' + createdAt.fromNow(true) + ')',
                triggeredBy: pullRequest.user.login,
                triggeredByAvatar: pullRequest.user.avatar_url,
                assignedTo: assignedTo, 
                assignedToAvatar: assignedToAvatar,
                mergeState: pullRequest.mergeable_state,
                comments: pullRequest.comments + pullRequest.review_comments,
                commits: pullRequest.commits,
                additions: pullRequest.additions,
                changes: pullRequest.changed_files,
                deletions: pullRequest.deletions
            });
        }
    };

    function render(prState, data) {
        if(!data.length) {
            var nothingHtml = $('<div class="no-releases"><div class="fa fa-smile-o"></div> Nothing Pending </div>');

            this.html(nothingHtml);
        }
        else {
            this.html(_.map(data, function(pullRequest) {
                if(!template[prState]) { return; }

                return template[prState](pullRequest);
            }).join(''));
        }
    }

    function prPanelFactory(prState) {
        return function prPanel(configuration) {
            var lastData;
            var containerElement = $('<ul class="releases-list releases-' + prState + '"></ul>');
            var setUpRender = render.bind(containerElement, prState);

            var orderElement = $(Mustache.render('<div class="release-order-selector{{directionClass}}">' 
                + '<span class="release-order-selector-icon-asc fa fa-sort-numeric-asc"></span>' 
                + '<span class="release-order-selector-icon-desc fa fa-sort-numeric-desc"></span>&nbsp;' 
                + '<span class="release-order-selector-label-asc">Order By Oldest First</span>' 
                + '<span class="release-order-selector-label-desc">Order By Latest First</span>' 
                + '</div>', {
                    directionClass: (prState === 'completed' || configuration.defaultSortOrder === 'Descending') ? ' desc' : ''
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
                            componentElement.append(orderElement);
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

	TLRGRP.BADGER.Dashboard.Components.PullRequests = prPanelFactory('inprogress');
})();