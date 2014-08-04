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

		it('returns 1/8/2014 to 4/7/2014', function() {
			var startDate = '1 august 2014';
			var calculatedDate = TLRGRP.BADGER.Utilities.relativeMonth(moment(startDate), -1).format('DD MMMM YYYY');

			expect(calculatedDate).to.eql('04 July 2014');
		});

		it('returns 4/8/2014 to 4/7/2014', function() {
			var startDate = '4 august 2014';
			var calculatedDate = TLRGRP.BADGER.Utilities.relativeMonth(moment(startDate), -1).format('DD MMMM YYYY');

			expect(calculatedDate).to.eql('07 July 2014');
		});
	});
})();