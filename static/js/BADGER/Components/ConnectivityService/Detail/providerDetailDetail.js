(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

    var mappings = {
        "bookingErrors": "bookingErrors",
        "providerErrors": "errors",
        "bookings": "bookings"
    };

	var channelMap = {
		1: { text: 'iOS App' },
		2: { text: 'Android App' },
		9: { text: 'Desktop Web' },
		25: { text: 'Call Centre' },
		27: { text: 'XML Booking' },
	};

    var renderers = {
		'bookings': function(data) {
			return Mustache.render('<li>'
				+ '<table class="provider-detail-detail-booking-table">' 
					+ '<tr>'
						+ '<th class="provider-detail-detail-booking-table-bookingid">Booking ID</th>'
						+ '<th class="provider-detail-detail-booking-table-booked">Booked</th>'
						+ '<th class="provider-detail-detail-booking-table-channel">Channel</th>'
						+ '<th class="provider-detail-detail-booking-table-country">Country</th>'
						+ '<th class="provider-detail-detail-booking-table-hoteldetails">Hotel ID</th>'
						+ '<th class="provider-detail-detail-booking-table-roomnights">Rooms/Nights</th>'
						+ '<th class="provider-detail-detail-booking-table-ttv">TTV (£)</th>'
						+ '<th class="provider-detail-detail-booking-table-commission">Commission Value (%)</th>'
						+ '<th class="provider-detail-detail-booking-table-affiliate">Affiliate</th>'
						+ '<th class="provider-detail-detail-booking-table-viewsession">View Session</th>'
					+ '</tr>'
					+ '{{#rows}}'
						+ '<tr>'
							+ '<td class="provider-detail-detail-booking-table-bookingid">{{bookingId}}</td>'
							+ '<td class="provider-detail-detail-booking-table-booked">{{bookedDate}}</td>'
							+ '<td class="provider-detail-detail-booking-table-channel">{{channel}}</td>'
							+ '<td class="provider-detail-detail-booking-table-country">{{country}}</td>'
							+ '<td class="provider-detail-detail-booking-table-hoteldetails"><a href="http://www.laterooms.com/en/hotel-reservations/{{hotelId}}.aspx" target="_blank">{{hotelId}}</a></td>'
							+ '<td class="provider-detail-detail-booking-table-roomnights">{{rooms}}/{{nights}}</td>'
							+ '<td class="provider-detail-detail-booking-table-ttv">£{{ttv}}</td>'
							+ '<td class="provider-detail-detail-booking-table-commission">£{{commission}} ({{commissionPercent}}%)</td>'
							+ '<td class="provider-detail-detail-booking-table-affiliate">{{affiliate}}</td>'
							+ '<td class="provider-detail-detail-booking-table-viewsession"></td>'
						+ '</tr>'
					+ '{{/rows}}'
				+ '</table>'
				+ '</li>', {
					rows: _.map(data.bookings.hits.hits, function(booking) {
						return {
							bookingId: booking._source.bookingId,
							bookedDate: moment(booking._source['@timestamp']).format('HH:mm:ss, DD MMMM YYYY'),
							country: booking._source.bookerCountry,
							channel: channelMap[booking._source.channelId] ? channelMap[booking._source.channelId].text : 'Unknown (' + booking._source.channelId + ')',
							hotelId: booking._source.hotelId,
							hotelProvider: booking._source.hotelProvider,
							ttv: booking._source.totalAmountGbp.toFixed(2),
							commissionPercent: booking._source.commission,
							commission: booking._source.commissionValue.toFixed(2),
							affiliate: booking._source.affiliateName
						};
					})
				});
		},
		'connectivity_errors': function(data) {
			var messages  = _.map(data.top_error_messages.buckets, function(bucket) {
				var cleanedUpMessageMatch = /\[[^\]]+\](.+)/.exec(bucket.key);
				var message = bucket.key;

				if(cleanedUpMessageMatch && cleanedUpMessageMatch.length) {
					message = cleanedUpMessageMatch[1];
				}

				return { 
					message: message,
					count: bucket.doc_count
				};
			});

			var totalMessages = _.reduce(messages, function(total, message) { total+= message.count; return total; }, 0);
			var totalErrors = data.doc_count;

			return Mustache.render('<li class="provider-detail-error-messages">' 
					+ '<h3>Top Error Messages</h3>'
					+ '<table class="provider-detail-error-messages-table">'
						+ '<tr>'
							+ '<th>Message</th><th>Count</th>'
						+ '</tr>'
						+ '{{#messages}}'
						+ '<tr>'
							+ '<td>{{message}}</td><td>{{count}}</td>'
						+ '</tr>'
						+ '{{/messages}}'
					+ '</table>'
					+ '{{{unknownMessages}}}'
				+ '</li>'
				+ '<li class="provider-detail-errors">' 
					+ '<h3>Top Errors</h3>'
					+ '<table class="provider-detail-error-messages-table">'
						+ '<tr>'
							+ '<th>Time</th>'
							+ '<th>Message</th>'
						+ '</tr>'
						+ '{{#errors}}'
						+ '<tr>'
							+ '<td>{{time}}</td>'
							+ '<td>{{message}}</td>'
						+ '</tr>'
						+ '{{/errors}}'
					+ '</table>'
				+ '</li>', {
					messages: messages,
					unknownMessages: totalMessages < totalErrors ? ('<i>Note: ' + (totalErrors - totalMessages) + ' error messages were too long and so are not displayed above.</i>') : '',
					errors: _.map(data.top_errors.hits.hits, function(error) {
						var message = error._source.Exception.Message;
						var time = new moment(error._source['@timestamp']).format('HH:mm:ss');
						var soapStart = message.indexOf('&lt;soap:');

						if(soapStart > -1) {
							message = message.substring(0, soapStart - 1);
						}
						else {
							soapStart = message.indexOf('<soap:');

							if(soapStart > -1) {
								message = message.substring(0, soapStart - 1);
							}
						}

						return {
							time: time,
							message: message
						};
					})
				});
		},
		'booking_errors': function() {
			return Mustache.render('<li></li><li></li>', {});
		}
	};

	TLRGRP.BADGER.Dashboard.Components.ProviderDetailDetail = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });
        var gridContainer = $('<ul class="provider-detail-detail-grid-container"></ul>');

		var modules = [lastUpdated, inlineLoading, {
			appendTo: function (container) {
				container.append(gridContainer);				
			}
		}];

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'provider-detail-detail',
			modules: modules
		});

		var lastData;

		function checkSelect(data) {
        	var checkToLogProperties = {
        		'Provider Errors': 'connectivity_errors',
        		'Provider Bookings': 'bookings',
        		'Provider Booking Errors': 'booking_errors'
        	};

			if(!lastData) {
				return;
			}

        	var logField = checkToLogProperties[data.check];
        	var logData = lastData[logField];

        	gridContainer.html(renderers[logField](logData));
		}

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderDetailSummary.LogData', function(data) {
        	lastData = data.data;
			checkSelect(data);
        });
        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderSummary.CheckSelected', checkSelect);

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        componentLayout.appendTo(container);

                        return this.transitionToState('initialising');
                    }
                },
                initialising: {
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

        		TLRGRP.messageBus.unsubscribeAll('TLRGRP.BADGER.ProviderDetailSummary.LogData');
        		TLRGRP.messageBus.unsubscribeAll('TLRGRP.BADGER.ProviderDetailSummary.CheckSelected');
			}
		};
	}
})();