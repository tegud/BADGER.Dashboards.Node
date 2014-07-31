(function() {
	'use strict';

	describe('Elasticsearch indexBuilder', function () {
		var originalMoment = moment;
		var currentDate;

		beforeEach(function() {
			currentDate = '2014-01-01 00:00:00Z';

			moment = function() {
				if(arguments.length) {
					return originalMoment.apply(undefined, Array.prototype.slice.call(arguments, 0));
				}

				return originalMoment(currentDate).zone(currentDate);
			};
		});

		afterEach(function() {
			moment = originalMoment;
		});

		describe('buildFromTimeFrame', function () {
			describe('for relative Time Frame', function () {
				it('returns index with specified prefix and the current date.', function () {
					currentDate = '2014-04-05 11:00:00Z';

					var menu = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({
						prefix: 'logstash-'
					});

					expect(menu.buildFromTimeFrame({ timeFrame: 15, units: 'm' })[0]).to.be('logstash-2014.04.05');
				});

				it('returns index with specified prefix and the yesterdays date and todays date when time period extends outside current date.', function () {
					currentDate = '2014-04-05 00:10:00+00:00';

					var menu = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({
						prefix: 'logstash-'
					});

					var indicies = menu.buildFromTimeFrame({ timeFrame: 1, units: 'hours' });

					expect(indicies[0]).to.be('logstash-2014.04.04');
					expect(indicies[1]).to.be('logstash-2014.04.05');
				});

				it('returns index with specified prefix and the yesterdays date and todays date when time period extends outside current date.', function () {
					currentDate = '2014-04-05 00:10:00+00:00';

					var menu = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({
						prefix: 'logstash-'
					});

					var indicies = menu.buildFromTimeFrame({ timeFrame: 1, units: 'hours' });

					expect(indicies[0]).to.be('logstash-2014.04.04');
					expect(indicies[1]).to.be('logstash-2014.04.05');
				});
			});

			describe('for daysAgo Time Frame', function () {
				it('returns index with specified prefix and the specified date.', function () {
					currentDate = '2014-04-05 11:00:00Z';

					var menu = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({
						prefix: 'logstash-'
					});

					expect(menu.buildFromTimeFrame({ timeFrame: 1, units: 'daysAgo' })[0]).to.be('logstash-2014.04.04');
				});

				it('returns index with only specified prefix and the specified date.', function () {
					currentDate = '2014-04-05 11:00:00+00:00';

					var menu = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({
						prefix: 'logstash-'
					});

					var indicies = menu.buildFromTimeFrame({ timeFrame: 1, units: 'daysAgo' });
					expect(indicies.length).to.be(1);
					expect(indicies[0]).to.be('logstash-2014.04.04');
				});

				describe('and queryItem specifies off set as well', function() {
					it('returns index with specified prefix and the specified date.', function () {
						currentDate = '2014-04-05 11:00:00Z';

						var menu = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({
							prefix: 'logstash-'
						});

						expect(menu.buildFromTimeFrame({ timeFrame: 1, units: 'daysAgo' }, { timeOffset: { "days": -1 } })[0]).to.be('logstash-2014.04.03');
					});
				});

				describe('and user is in a timezone which is ahead of UTC', function() {
					it('returns index with previous date.', function () {
						currentDate = '2014-04-05 11:00:00+01:00';

						var menu = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({
							prefix: 'logstash-'
						});

						expect(menu.buildFromTimeFrame({ timeFrame: 0, units: 'daysAgo' })[0]).to.be('logstash-2014.04.04');
					});
				});

				describe('and user is in a timezone which is behind UTC', function() {
					it('returns index with next date.', function () {
						currentDate = '2014-04-05 11:00:00-01:00';

						var menu = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({
							prefix: 'logstash-'
						});

						expect(menu.buildFromTimeFrame({ timeFrame: 0, units: 'daysAgo' })[1]).to.be('logstash-2014.04.06');
					});
				});
			});
		});
	});
})();