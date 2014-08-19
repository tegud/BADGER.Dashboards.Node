(function() {
	'use strict';

	describe('DataStore Filter', function () {
		describe('loadFromQuerystring', function () {
			it('sets a filter with a simple value option', function () {
				var filters = new TLRGRP.BADGER.Dashboard.Components.Filters([{
					"id": "browser",
					"options": {
						"Internet Explorer": "ie"
					}
				}]);

				filters.loadFromQuerystring('?browser=ie');

				expect(filters.getValueForFilter('browser')).to.be('ie');
			});

			it('sets a filter with a complex values', function () {
				var filters = new TLRGRP.BADGER.Dashboard.Components.Filters([{
					"id": "device",
					"options": {
						"iPad": { browser: "safari", type: "ipad" },
					}
				}]);

				filters.loadFromQuerystring('?browser=safari&type=ipad');

				expect(filters.getValueForFilter('device')).to.eql({ browser: "safari", type: "ipad" });
			});

			it('does not set filter value when querystring does not match simple value', function() {
				var filters = new TLRGRP.BADGER.Dashboard.Components.Filters([{
					"id": "device",
					"options": {
						"iPhone": 'iphone',
					}
				}]);

				filters.loadFromQuerystring('?device=ipad');

				expect(filters.getValueForFilter('device')).to.eql(undefined);
			});

			it('does not set filter value when querystring does not match complex value', function() {
				var filters = new TLRGRP.BADGER.Dashboard.Components.Filters([{
					"id": "device",
					"options": {
						"iPhone": { browser: "safari", type: "iphone" },
					}
				}]);

				filters.loadFromQuerystring('?browser=safari&type=ipad');

				expect(filters.getValueForFilter('device')).to.eql(undefined);
			});
		});

		describe('get selected options', function () {
			it('returns selected option for specified filter', function() {
				var filters = new TLRGRP.BADGER.Dashboard.Components.Filters([{
					"id": "device",
					"options": {
						"iPad": { browser: "safari", type: "ipad" },
					}
				}]);

				filters.loadFromQuerystring('?browser=safari&type=ipad');

				expect(filters.getSelectedOptionForFilter('device')).to.eql('iPad');
			});

			it('returns default option when no value set for filter', function() {
				var filters = new TLRGRP.BADGER.Dashboard.Components.Filters([{
					"id": "device",
					"defaultOption": "All",
					"options": {
						"All": "",
						"iPad": { browser: "safari", type: "ipad" },
					}
				}]);

				expect(filters.getSelectedOptionForFilter('device')).to.eql('All');
			});
		});

		describe('setAgainstDataStore', function () {
			it('sets complex option value as an array of key value pairs', function() {
				var actualValue;
				var dataStore = (function() {
					return {
						setFilter: function(filterId, value) {
							actualValue = value;
						}
					};
				})();

				var filters = new TLRGRP.BADGER.Dashboard.Components.Filters([{
					"id": "device",
					"options": {
						"iPad": { browser: "safari", type: "ipad" },
					}
				}]);

				filters.loadFromQuerystring('?browser=safari&type=ipad');
				filters.setAgainstDataStore(dataStore);

				expect(actualValue).to.eql([{ browser: "safari", type: "ipad" }]);
			});
		});
	});
})();