(function() {
	'use strict';

	describe('Available Dashboards', function () {
		beforeEach(function() {
			TLRGRP.BADGER.Dashboard.clear();
			TLRGRP.BADGER.Dashboard.register({
				id: 'Overview',
				views: [{
					id: 'Summary',
					name: 'Summary'
				}, {
					id: 'Traffic',
					name: 'Traffic'
				}]
			});
			TLRGRP.BADGER.Dashboard.register({id: 'Mobile' });
			TLRGRP.BADGER.Dashboard.register({id: 'ByPage', name: 'By Page' });
		});

		describe('getAll', function () {
			it('returns first registered dashboard', function () {
				var allDashboards = TLRGRP.BADGER.Dashboard.getAll();
				expect(allDashboards[0].id).to.be('Overview');
			});

			it('returns second registered dashboard', function () {
				var allDashboards = TLRGRP.BADGER.Dashboard.getAll();
				expect(allDashboards[1].id).to.be('Mobile');
			});
		});

		describe('GetById', function(){
			it('defaults name to id', function () {
				var dashboard = TLRGRP.BADGER.Dashboard.getById('Overview');
				expect(dashboard.name).to.be('Overview');
			});		
		});

		describe('Register dashboard', function() {
			it('defaults name to id', function () {
				var allDashboards = TLRGRP.BADGER.Dashboard.getAll();
				expect(allDashboards[0].name).to.be('Overview');
			});

			it('sets name to name when set', function () {
				var dashboard = TLRGRP.BADGER.Dashboard.getById('ByPage');
				expect(dashboard.name).to.be('By Page');
			});

			it('sets available views', function() {
				var dashboard = TLRGRP.BADGER.Dashboard.getById('Overview');
				expect(dashboard.views.Summary).to.eql({
					id: 'Summary',
					name: 'Summary',
					isDefault: true
				});
			});

			it('sets first view to be default', function() {
				var dashboard = TLRGRP.BADGER.Dashboard.getById('Overview');
				expect(dashboard.views.Summary.isDefault).to.eql(true);
			});
			it('sets first view to be default', function() {
				var dashboard = TLRGRP.BADGER.Dashboard.getById('Overview');
				expect(dashboard.views.Traffic).to.eql({
					id: 'Traffic',
					name: 'Traffic',
					isDefault: false
				});
			});
		});
	});
})();