(function() {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

	var ROW_MAX = 12;

	function setRowLayout(row, totalWidth) {
		if(!row.length) {
			return;
		}

		var availableWidth = totalWidth - (row.length - 1) - 15;
		var spanUnitWidth = (availableWidth / ROW_MAX);

		if(row.length === 1) {
			row[0].layout = {
				position: 1,
				width: spanUnitWidth * (row[row.length - 1].span || ROW_MAX)
			};
			return;
		}

		_.forEach(row.slice(0, row.length -1), function(component, i) {
			component.layout = {
				position: i + 1,
				width: spanUnitWidth * component.span
			};
		});

		row[row.length - 1].layout = { 
			position: row.length,
			width: spanUnitWidth * row[row.length - 1].span
		};
	}

	TLRGRP.BADGER.Dashboard.Layout = function() {
		return {
			set: function(components, layoutHolderWidth) {
				var currentRow = [];
				var spanTotal = 0;

				_.forEach(components, function(component) {
					var completeRow;
					var componentSpan = parseInt(component.span || '0', 10);

					if(!componentSpan || spanTotal + componentSpan > ROW_MAX) {
						completeRow = true;
					} 

					if(completeRow) {
						setRowLayout(currentRow, layoutHolderWidth);
						currentRow = [component];
						spanTotal = componentSpan || ROW_MAX;
					}
					else {
						currentRow.push(component);
						spanTotal += componentSpan;
					}
				});

				setRowLayout(currentRow, layoutHolderWidth);
			}
		};
	};
})();
