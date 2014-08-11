(function() {
	'use strict';

	describe('objectHelpers', function () {
		describe('getValueFromSubProperty', function(){
			it('returns value from top level property', function() {
				var object = {
					'a': 1
				};
				var actual = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(object, 'a');

				expect(actual).to.eql(1);
			});

			it('returns value from sub property', function() {
				var object = {
					'a': {
						'b': 2
					}
				};
				var actual = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(object, 'a.b');

				expect(actual).to.eql(2);
			});

			it('returns value from sub property with escaped "."', function() {
				var object = {
					'a': {
						'50.0': 2
					}
				};
				var actual = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(object, 'a.50|0');

				expect(actual).to.eql(2);
			});

			it('finds specified key withinm array of objects', function() {
				var object = {
					'a': [
						{ id: 'a', 'a': 1 },
						{ id: 'b', 'a': 2 },
						{ id: 'c', 'a': 3 }
					]
				};
				var actual = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(object, 'a.:find(id=b).a');

				expect(actual).to.eql(2);
			});

			it('returns undefined when specified key not found within array of objects', function() {
				var object = {
					'a': [
						{ id: 'a', 'a': 1 },
						{ id: 'b', 'a': 2 },
						{ id: 'c', 'a': 3 }
					]
				};
				var actual = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(object, 'a.:find(id=f).a');

				expect(actual).to.eql(undefined);
			});
		});
	});
})();