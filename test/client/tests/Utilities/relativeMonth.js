(function() {
	'use strict';

	describe.only('relativeMonth', function () {
		it('returns first monday of previous month', function() {
			var startDate = '7 july 2014';
			var calculatedDate = TLRGRP.BADGER.Utilities.relativeMonth(moment(startDate), -1).format('DD MMMM YYYY');

			expect(calculatedDate).to.eql('02 June 2014');
		});

		it('returns second monday of previous month', function() {
			var startDate = '14 july 2014';
			var calculatedDate = TLRGRP.BADGER.Utilities.relativeMonth(moment(startDate), -1).format('DD MMMM YYYY');

			expect(calculatedDate).to.eql('09 June 2014');
		});

		it('returns last monday of previous month', function() {
			var startDate = '28 july 2014';
			var calculatedDate = TLRGRP.BADGER.Utilities.relativeMonth(moment(startDate), -1).format('DD MMMM YYYY');

			expect(calculatedDate).to.eql('30 June 2014');
		});

		it('returns second last monday of previous month', function() {
			var startDate = '21 july 2014';
			var calculatedDate = TLRGRP.BADGER.Utilities.relativeMonth(moment(startDate), -1).format('DD MMMM YYYY');

			expect(calculatedDate).to.eql('23 June 2014');
		});

		it('returns first tuesday of previous month', function() {
			var startDate = '1 july 2014';
			var calculatedDate = TLRGRP.BADGER.Utilities.relativeMonth(moment(startDate), -1).format('DD MMMM YYYY');

			expect(calculatedDate).to.eql('03 June 2014');
		});

		var tests = {
			'1 august 2014': '04 July 2014',
			'2 august 2014': '05 July 2014',
			'3 august 2014': '06 July 2014',
			'4 august 2014': '07 July 2014',
			'5 august 2014': '01 July 2014',
			'6 august 2014': '02 July 2014',
			'7 august 2014': '03 July 2014'
		};

		_.each(tests, function(expected, input) {
			it('correctly maps ' + input + ' to ' + expected, function() {
				var calculatedDate = TLRGRP.BADGER.Utilities.relativeMonth(moment(input), -1).format('DD MMMM YYYY');

				expect(calculatedDate).to.eql(expected);
			});
		});
	});
})();