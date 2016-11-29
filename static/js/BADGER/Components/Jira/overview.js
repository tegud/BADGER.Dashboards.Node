(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.JiraOverview = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.jiraDashboardApiHost + '/overview/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });

		var summary = $('<ul class="jira-boards-summary"></ul>');
		var blocked = $('<div class="jira-boards-blocked"><h4>Blockers</h4></div>');
        var inProgress = $('<div class="jira-boards-inprogress"><h4>In Progress</h4></div>');

		var boards = [
			{ "name": "Core Engineering", "key": "UMCE", "boardId": "109", "icon-class": "fa fa-cogs", "hideOverview": true },
			{ "name": "Consumer Products", "key": "UMCPT", "boardId": "124", "icon-class": "fa fa-smile-o" },
			{ "name": "Hotel Management", "key": "UMHMT", "boardId": "123", "icon-class": "fa fa-hospital-o" },
			{ "name": "Reservations", "key": "UMRT", "boardId": "122", "icon-class": "fa fa-credit-card" }
		];

		var boardElements = {};

		function StatusLists(lists) {
			var dataCache = {};
			var boards = {};
			var updateTimeout;

			function update() {
				var mergedData = _.reduce(Object.keys(dataCache), function(allIssues, board) {
					var issues = dataCache[board];
					allIssues = allIssues.concat(issues);
					return allIssues;
				}, []);

				for(var x = 0; x < lists.length; x++) {
					var items = _.chain(mergedData)
						.reduce(function(filtered, issue) {
							if(lists[x].filter && !lists[x].filter(issue)) {
								return filtered;
							}

							filtered.push(issue);
							return filtered;
						},[])
						.map(function(issue) {
							return '<li class="jira-boards-overview-issue-list-item">'
									+ '<div class="jira-boards-overview-issue-list-item-icon-container"><span class="' + (boards[issue.project]['icon-class']) + '"></span></div>'
									+ '<div class="jira-boards-overview-issue-list-item-text"><h5><a href="' + configuration.jiraHost + '/secure/RapidBoard.jspa?rapidView=' + boards[issue.project].boardId + '&view=detail&selectedIssue=' + issue.key + '" target="_blank">' + issue.key + ' - ' + issue.summary + '</a></h5><h6>' + boards[issue.project].name + '</h6>' + (issue.assignee ? '<i>Assigned to: ' + issue.assignee.displayName + '</i>' : '') + '</div>'
								+ '</li>';
						})
						.value();

					if(!items.length && lists[x].noItems) {
						items.push(lists[x].noItems);
					}

					lists[x].element.html(items.join(''));
				}
			}

			return {
				update: function(board, issues) {
					dataCache[board.key] = issues;
					boards[board.key] = board;

					if(updateTimeout) {
						clearTimeout(updateTimeout);
						updateTimeout = undefined;
					}

					updateTimeout = setTimeout(update, 100);
				}
			}
		}

		var statusList = new StatusLists([
			{
				element: $('<ul class="jira-boards-overview-issue-list"></ul>').appendTo(blocked),
				filter: function(issue) { return issue.priority === 'Blocked'; },
				noItems: '<li class="jira-boards-overview-issue-list-item awesome">'
					+ '<div class="jira-boards-overview-issue-list-item-icon-container"><span class="fa fa-thumbs-up"></span></div>'
					+ '<div class="jira-boards-overview-issue-list-item-text"><h5>Everything is awesome!</h5>Nothing is blocked, go team!</div>'
				+ '</li>'
			},
			{
				element: $('<ul class="jira-boards-overview-issue-list"></ul>').appendTo(inProgress),
				filter: function(issue) { return issue.priority !== 'Blocked' && issue.status === 'In Progress'; },
				noItems: '<li class="jira-boards-overview-issue-list-item not-awesome">'
					+ '<div class="jira-boards-overview-issue-list-item-icon-container"><span class="fa fa-bomb"></span></div>'
					+ '<div class="jira-boards-overview-issue-list-item-text"><h5>Nothings happening</h5>Something should probably be happening, so...</div>'
				+ '</li>'
			}
		]);

		for(var x = 0; x < boards.length;x++) {
			if(boards[x].hideOverview) {
				continue;
			}

			boardElements[boards[x].key] = $('<li class="jira-boards-summary-item">'
				+ '<h4><a href="' + configuration.jiraHost + '/secure/RapidBoard.jspa?rapidView=' + boards[x].boardId + '" target="_blank">' + boards[x].name + '</a></h4>'
				+ '<div class="jira-boards-summary-item-container">'
					+ '<div class="jira-boards-summary-item-container-icon-container"><div class="jira-boards-summary-item-container-icon-outer"><span class="' + boards[x]['icon-class'] + '"></span></div></div>'
					+ '<div class="jira-boards-summary-item-container-graph-container"></div>'
					+ '<div class="jira-boards-summary-item-container-text-container">'
						+ '<div class="jira-boards-summary-item-container-text-percent"></div>'
						+ '<div class="jira-boards-summary-item-container-text-progress"></div>'
					+ '</div>'
				+ '</div>'
			+ '</li>').appendTo(summary);
		}

		var modules = [inlineLoading, {
			appendTo: function (container) {
				container
					.append(summary)
					.append(blocked)
					.append(inProgress);
			}
		}];

		var dataStores = [];
		var stateMetaData = {
			'backlog': { order: 0 },
			'to-do': { order: 1 },
			'in-progress': { order: 2, colour: 'orange' },
			'done': { order: 3, complete: true, colour: 'green' }
		};


		for(var x = 0; x < boards.length;x++) {
			(function(x) {
				dataStores.push(new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
					query: { url: refreshServerBaseUrl + boards[x].key },
					refresh: configuration.refresh || 5000,
					callbacks: {
						success: function (data) {
							statusList.update(boards[x], _.reduce(data.query.states, function(issues, state) {
								issues = issues.concat(_.map(state.issues, function(issue) {
									issue.project = boards[x].key;
									return issue;
								}));

								return issues;
							}, []));

							if(boards[x].hideOverview) {
								return;
							}

							var totalIssues = data.query.totalIssues;
							var states = _.sortBy(data.query.states, function(state) {
								return stateMetaData[state.name].order;
							});

							var totalComplete = _.reduce(states, function(total, state) {
								if(stateMetaData[state.name].complete) {
									total += state.issueCount;
								}

								return total;
							}, 0);

							var percentComplete = _.reduce(states, function(total, state) {
								if(stateMetaData[state.name].complete) {
									total += state.percentage;
								}

								return total;
							}, 0);

							$('.jira-boards-summary-item-container-text-percent', boardElements[boards[x].key]).text(Math.floor(percentComplete) + '%');
							$('.jira-boards-summary-item-container-text-progress', boardElements[boards[x].key]).text(totalComplete + '/' + totalIssues);
							$('.jira-boards-summary-item-container-graph-container', boardElements[boards[x].key]).html(_.reduce(states, function(graph, state) {
								if(stateMetaData[state.name].colour) {
									graph.push('<div class="jira-boards-summary-item-container-graph-segment" style="width: '+ ((state.percentage / 100) * 250) +'px; background-color: ' + stateMetaData[state.name].colour + '"></div>');
								}

								return graph;
							}, []).join(''));
						}
					},
					components: {
						loading: inlineLoading
					}
				}));
			})(x);
		}

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'jira-summary',
			modules: modules
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
						for(var x = 0;x < dataStores.length; x++) {
							dataStores[x].start(true);
						}
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
