(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.JiraOverview = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.jiraDashboardApiHost + '/overview/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });

        var summary = $('<ul class="jira-boards-summary"></ul>');

		var boards = [
			// { "name": "Core Engineering", "key": "UMCE", "icon-class": "fa fa-cogs" },
			{ "name": "Consumer Products", "key": "UMCPT", "icon-class": "fa fa-smile-o" },
			{ "name": "Hotel Management", "key": "UMHMT", "icon-class": "fa fa-hospital-o" },
			{ "name": "Reservations", "key": "UMRT", "icon-class": "fa fa-credit-card" }
		];

		var boardElements = {};

		for(var x = 0; x < boards.length;x++) {
			boardElements[boards[x].key] = $('<li class="jira-boards-summary-item">'
				+ '<h4>' + boards[x].name + '</h4>'
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
				container.append(summary);
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
					refresh: 5000,
					callbacks: {
						success: function (data) {
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
