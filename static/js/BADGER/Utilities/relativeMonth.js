(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Utilities');

	TLRGRP.BADGER.Utilities.relativeMonth = function(start, offset) {
		var currentMonthStart = moment('1' + start.format('MMM YYYY'));
		var currentMonthEnd = moment(currentMonthStart) .add('months', 1).add('days', -1);
		var numberOfWeeksInMonth = Math.ceil(currentMonthEnd.date() / 7);
		var currentWeekOfMonth = ((start.date() - 1) / 7);
		var targetDate = moment(currentMonthStart).add('months', offset);
		var endOfTargetMonth = moment(targetDate).add('months', 1).add('days', -1);
		var numberOfWeeksInTargetMonth = Math.ceil(endOfTargetMonth.date() / 7);
		var closestToEndOfMonth = currentWeekOfMonth > (numberOfWeeksInMonth / 2);
		var weeksToAdd;

		var dayIndex = Math.floor((start.date() - 1) / 7);
		var remainingDays = Math.floor((currentMonthEnd.date() - start.date()) / 7);
		var currentMonthDayLength = dayIndex + remainingDays;
		var targetMonthDayLength = Math.floor((endOfTargetMonth.date() - moment(targetDate).add(start.day()).date()) / 7);

		if(!remainingDays) {
			weeksToAdd = targetMonthDayLength;
		}
		else if (remainingDays === 1) {
			weeksToAdd = targetMonthDayLength - 1;
		}
		else {
			weeksToAdd = Math.floor((start.date() - 1) / 7);
		}

		if(!weeksToAdd && start.day() < start.date() && start.date() < 7) {
			weeksToAdd++;
		}

		if(false) {
			console.log('----------------------------');
			console.log('Start: ' + start.format());
			console.log('Target Month Start: ' + targetDate.format());
			console.log('Days to add: ' + start.day());
			console.log('Weeks to add: ' + weeksToAdd);
			console.log('Day Index: ' + dayIndex);
			console.log('Start Day/Date: ' + start.day() + '/' + start.date())
		}

		targetDate.day(start.day() + (weeksToAdd * 7));

		return targetDate;
	};
})();