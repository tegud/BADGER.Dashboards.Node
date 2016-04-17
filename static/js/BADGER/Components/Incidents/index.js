(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

	var monitoringToolMatchers = {
		'NewRelic': function(incident) {
			return matchNewRelicModel(incident).then(sanitizeNewRelicService);
		},
		'ICINGA': function(incident) {
			return new Promise(function(resolve) {
				resolve({
					host: incident.hostName,
					service: incident.serviceDesc,
					detail: incident.serviceOutput
				});
			});
		},
		'default': function(incident) {
			return new Promise(function(resolve) {
				resolve({
					host: incident.entityDisplayName,
					service: incident.stateMessage
				});
			});
		}
	};

	var newRelicMatchers = [
		function(incident) {
			if(incident.hostName && incident.hostName !== '""') {
				return {
					host: incident.hostName,
					service: incident.entityDisplayName
				};
			}
		},
		function(incident) {
			var newRelicEntityMatcher = /'([^']+)' (.+)/i;
			var entityMatches = incident.entityDisplayName.match(newRelicEntityMatcher);

			if(entityMatches) {
				return {
					host: entityMatches[1],
					service: entityMatches[2]
				};
			}
		},
		function(incident) {
			var newRelicStateMessageMatcher = /new alert for ([^\:]+): (.+)/i;
			var stateMessageMatches = incident.stateMessage.match(newRelicStateMessageMatcher);

			if(stateMessageMatches) {
				return {
					host: stateMessageMatches[1],
					service: stateMessageMatches[2]
				};
			}
		},
		function(incident) { return { host: incident.stateMessage }; }
	];

	function matchNewRelicModel(incident) {
		return new Promise(function(resolve) {
			for(var x = 0; x < newRelicMatchers.length; x++) {
				var model = newRelicMatchers[x](incident);

				if(model) {
					return resolve(model);
				}
			}
		})
	}

	function sanitizeNewRelicService(incident) {
		return new Promise(function(resolve) {
			if(incident.service.indexOf('&lt;') > -1) {
				incident.service = incident.service.replace(/\&lt\;/i, '<');
			}

			if(incident.service.indexOf('&gt;') > -1) {
				incident.service = incident.service.replace(/\&gt\;/i, '>');
			}

			resolve(incident);
		});
	}

	function baseAlertFromIncident(incident) {
		var receivedTime = moment(incident.voAlertReceivedTime);
		var now = moment();
		var today = moment(now).startOf('day');
		var raised = receivedTime.format('HH:mm');

		var acknowledgedText;
		var resolvedText;
		var raisedMinutesAgo;

		if(incident.acknowledged) {
			var acknowedgedAtTime = moment(incident.acknowledgedAt);
			var acknowledgedAt = acknowedgedAtTime.format('HH:mm');

			if(!today.isSame(moment(acknowedgedAtTime).startOf('day'))) {
				acknowledgedAt += receivedTime.format(' ddd');
			}

			acknowledgedAt += ' after ' + acknowedgedAtTime.from(receivedTime, true);

			acknowledgedText = 'Ack\'ed at ' + acknowledgedAt + (incident.acknowledgedBy ? (' by ' + incident.acknowledgedBy) : '');
		}

		if(incident.resolved) {
			var resolvedAtTime = moment(incident.resolvedAt);
			var resolvedAt = resolvedAtTime.format('HH:mm');

			if(!today.isSame(moment(acknowedgedAtTime).startOf('day'))) {
				resolvedAt += receivedTime.format(' ddd');
			}

			resolvedAt += ', after ' + resolvedAtTime.from(receivedTime, true);

			resolvedText = 'Resolved at ' + resolvedAt + (incident.resolvedBy ? (' by ' + incident.resolvedBy) : '');
		}
		else {
			raisedMinutesAgo = ', ' + receivedTime.from(now);
		}

		if(!today.isSame(moment(receivedTime).startOf('day'))) {
			raised += receivedTime.format(' ddd');
		}

		return {
			incidentNumber: incident.incidentName,
			raised: raised,
			raisedMinutesAgo: raisedMinutesAgo,
			acknowledgedText: acknowledgedText,
			resolvedText: resolvedText,
			team: incident.team
		};
	}

	function serviceInfoFromIncident(incident) {
		return (monitoringToolMatchers[incident.monitoringTool] || monitoringToolMatchers.default)(incident);
	}

    var template = {
        'inprogress': function(incident) {
			return Mustache.render('<li class="incidents-incident-item {{itemClass}}">'
				+ '<div class="incidents-incident-item-indicator"><div class="{{indicatorClass}}"></div></div>'
				+ '<div class="incidents-incident-item-title">'
					+ '<div><b>#{{incidentNumber}}, {{host}}</b> - {{service}}</div>'
				+ '</div>'
				+ '<ul class="incident-incident-item-details">'
					+ '<li><b><div class="mega-octicon octicon-organization"></div> {{team}}</b></li>'
					+ '<li><div class="fa fa-clock-o"></div> Started {{raised}}{{raisedMinutesAgo}}</li>'
					+ '{{#acknowledgedText}}<li><div class="fa fa-phone"></div> {{acknowledgedText}}</li>{{/acknowledgedText}}'
				+ '</ul>'
				+ '{{#detail}}<div class="incidents-incident-item-detail">{{detail}}</div>{{/detail}}'
			+ '</li>', _.defaults({
				itemClass: 'open',
				indicatorClass: incident.acknowledgedText ? 'fa fa-fire' : 'fa fa-bullhorn'
			}, incident));
        },
        'resolved':function(incident) {
			return Mustache.render('<li class="incidents-incident-item {{itemClass}}">'
				+ '<div class="incidents-incident-item-indicator"><div class="{{indicatorClass}}"></div></div>'
				+ '<div class="incidents-incident-item-title">'
					+ '<div><b>#{{incidentNumber}}, {{host}}</b><br />{{service}}</div>'
				+ '</div>'
				+ '<ul class="incident-incident-item-details">'
					+ '<li><b><div class="mega-octicon octicon-organization"></div> {{team}}</b></li>'
					+ '<li><div class="fa fa-clock-o"></div> Started {{raised}}{{raisedMinutesAgo}}</li>'
					+ '{{#resolvedText}}<li><div class="fa fa-check"></div> {{resolvedText}}</li>{{/resolvedText}}'
					+ '{{#acknowledgedText}}<li><div class="fa fa-phone"></div> {{acknowledgedText}}</li>{{/acknowledgedText}}'
				+ '</ul>'
			+ '</li>', _.defaults({
				itemClass: 'resolved',
				indicatorClass: 'fa fa-check'
			}, incident));
        }
    };

    function render(incidentState, data) {
        if(!data.length) {
            var nothingHtml = $(Mustache.render('<div class="no-incidents {{incidentState}}"><div class="incidents-no-incidents-indicator"><div class="fa fa-thumbs-o-up"></div></div><div class="incidents-no-incidents-header"> No {{text}}</div></div>', {
					incidentState: incidentState,
					text: (incidentState === 'resolved' ? 'Incidents Resolved Recently' : 'Open Incidents')
				}));

            this.html(nothingHtml);
        }
        else if(incidentState === 'resolved') {
			this.html(_.map(data, function(incident) {
                if(!template[incidentState]) { return; }

                return template[incidentState](incident);
            }).join(''));
		}
		else {
			var groupedByAck = _.groupBy(data, function(incident) {
				return incident.acknowledgedText ? 'Acknowledged' : 'Not Acknowledged';
			});

            this.html(_.map(['Not Acknowledged', 'Acknowledged'], function(key) {
				var incidents = groupedByAck[key];

				if(!incidents || !incidents.length) {
					return;
				}

				return '<li class="incidents-inprogress-headers">' + key+ '</li>'
				 + _.map(incidents, function(incident) {
	                 if(!template[incidentState]) { return; }

	                 return template[incidentState](incident);
	             }).join('');
			}).join(''));
        }

        if(incidentState === 'completed') {
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

    function incidentPanelFactory(incidentState) {
        return function releasesPanel(configuration) {
            var lastData;
            var containerElement = $('<ul class="releases-list releases-' + incidentState + '"></ul>');
            var setUpRender = render.bind(containerElement, incidentState);

            var orderElement = $(Mustache.render('<div class="release-order-selector{{directionClass}}">'
                + '<span class="release-order-selector-icon-asc fa fa-sort-numeric-asc"></span>'
                + '<span class="release-order-selector-icon-desc fa fa-sort-numeric-desc"></span>&nbsp;'
                + '<span class="release-order-selector-label-asc">Order By Oldest First</span>'
                + '<span class="release-order-selector-label-desc">Order By Latest First</span>'
                + '</div>', {
                    directionClass: (configuration.defaultSortOrder === 'Descending') ? ' desc': ''
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
                            if(incidentState !== 'scheduled') {
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
				var alertBuilders = [baseAlertFromIncident, serviceInfoFromIncident];
                var incidents = _.pluck(data.today.hits.hits, '_source');
                var relaventIncidents = _.filter(incidents, function(release) {
                    return (release.resolved || false) === (incidentState === 'resolved');
                });
				var sortedIncidents = _.sortBy(relaventIncidents, function(incident) {
					if(incident.resolved) {
						return moment(incident.resolvedAt).unix();
					}

					return moment(incident.voAlertReceivedTime).unix();
				});

				Promise.all(_.map(sortedIncidents, function(incident) {
					var alertBuilderPromises = _.map(alertBuilders, function(fn) {
						return fn(incident);
					});

					return Promise.all(alertBuilderPromises).then(function(results) {
						return new Promise(function (resolve) {
							resolve(_.defaults.apply(_, [{}].concat(results)));
						});
					});
				})).then(function(data) {
					lastData = data;
					setUpRender(data);
				});
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

	TLRGRP.BADGER.Dashboard.Components.ResolvedIncidents = incidentPanelFactory('resolved');
	TLRGRP.BADGER.Dashboard.Components.OpenIncidents = incidentPanelFactory('inprogress');
})();
