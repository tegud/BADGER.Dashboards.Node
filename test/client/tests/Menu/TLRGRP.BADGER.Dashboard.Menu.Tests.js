(function() {
	'use strict';

	function setupDOMFixture() {
		$('body').append('<nav id="dashboard-menu"><ul class="status-menu"><li class="top-level-item text">V2</li></ul></nav>');
	}

	describe('Dashboard Menu', function () {
		beforeEach(function() {
			TLRGRP.messageBus.setUpClearDown();

			TLRGRP.BADGER.Dashboard.clear();
			TLRGRP.BADGER.Dashboard.register({ 
				id: 'Overview',
				views: {
					Summary: {
						id: 'Summary',
						name: 'Summary'
					},
					Traffic: {
						id: 'Traffic',
						name: 'Traffic'
					}
				}
			});
			TLRGRP.BADGER.Dashboard.register({ 
				id: 'Mobile',
				views: {
					id: 'Summary',
					name: 'Summary'
				}
			});
			TLRGRP.BADGER.Dashboard.register({ id: 'Requests' });
			TLRGRP.BADGER.Dashboard.register({ id: 'Performance' });
			TLRGRP.BADGER.Dashboard.register({ id: 'Disk' });
			TLRGRP.BADGER.Dashboard.register({ 
				id: 'ByServer', 
				name: 'By Server' 
			});
			TLRGRP.BADGER.Dashboard.register({ 
				id: 'ByPage', 
				name: 'By Page' 
			});

			TLRGRP.messageBus.reset();

			setupDOMFixture();
		});

		afterEach(function() {
			$('#dashboard-menu').remove();
		});

		describe('sets available dashboards', function () {
			it('sets first dashboard name to overview', function () {
				var expectedTitle = 'Overview';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				expect($('.top-level-item:eq(1) option:first', menuElement).text()).to.be(expectedTitle);
			});

			it('sets second dashboard name to mobile', function() {
				var expectedTitle = 'Mobile';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				expect($('.top-level-item:eq(1) option:eq(1)', menuElement).text()).to.be(expectedTitle);
			});

			it('sets second dashboard name to requests', function() {
				var expectedTitle = 'Requests';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				expect($('.top-level-item:eq(1) option:eq(2)', menuElement).text()).to.be(expectedTitle);
			});

			it('sets second dashboard name to performance', function() {
				var expectedTitle = 'Performance';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				expect($('.top-level-item:eq(1) option:eq(3)', menuElement).text()).to.be(expectedTitle);
			});

			it('sets second dashboard name to disk', function() {
				var expectedTitle = 'Disk';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				expect($('.top-level-item:eq(1) option:eq(4)', menuElement).text()).to.be(expectedTitle);
			});

			it('sets second dashboard name to by server', function() {
				var expectedTitle = 'By Server';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				expect($('.top-level-item:eq(1) option:eq(5)', menuElement).text()).to.be(expectedTitle);
			});

			it('sets second dashboard name to by page', function() {
				var expectedTitle = 'By Page';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				expect($('.top-level-item:eq(1) option:eq(6)', menuElement).text()).to.be(expectedTitle);
			});
		});

		describe('dashboard is selected', function() {
			it('publishes TLRGRP.BADGER.DashboardAndView.Selected event with specified dashboard id', function() {
				var expectedDashboardId = 'ByPage';
				var actualDashboardId;
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);
				var select = $('.top-level-item:eq(1) select', menuElement);

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(selectedDashboard) {
					actualDashboardId = selectedDashboard.dashboard;
				});

				select[0].selectedIndex = 6;
				select.change();

				expect(actualDashboardId).to.be(expectedDashboardId);
			});
		});

		describe('dashboard is selected', function() {
			it('sets current dashboard text', function() {
				var expectedTitle = 'By Page';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
					id: 'ByPage'
				});

				expect($('.top-level-item:eq(1) .current-item', menuElement).text()).to.be(expectedTitle);
			});

			it('sets current dashboard select option', function() {
				var expectedTitle = 'By Page';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
					id: 'Mobile'
				});

				expect($('.top-level-item:eq(1) select', menuElement)[0].selectedIndex).to.be(1);
			});

			it('sets the first view name', function() {
				var expectedView = 'Summary';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
					id: 'Overview'
				});

				expect($('.top-level-item:eq(2) option:first', menuElement).text()).to.be(expectedView);
			});

			it('sets the second view name', function() {
				var expectedView = 'Traffic';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
					id: 'Overview'
				});

				expect($('.top-level-item:eq(2) option:eq(1)', menuElement).text()).to.be(expectedView);
			});

			describe('toggles view selector depending on if dashboard has views', function() {
				it('hides the views selector when no views', function() {
					var menuElement = $('#dashboard-menu');
					var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);
					var viewHolder = $('.top-level-item:eq(2)', menuElement);

					viewHolder.removeClass('hidden');

					TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
						id: 'ByServer'
					});

					expect(viewHolder.hasClass('hidden')).to.be(true);
				});

				it('shows the views selector when dashboard has views', function() {
					var menuElement = $('#dashboard-menu');
					var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);
					var viewHolder = $('.top-level-item:eq(2)', menuElement);

					viewHolder.addClass('hidden');

					TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
						id: 'Overview'
					});

					expect(viewHolder.hasClass('hidden')).to.be(false);
				});

				it('makes the view selector text-only when dashboard has only one view', function() {
					var menuElement = $('#dashboard-menu');
					var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);
					var viewHolder = $('.top-level-item:eq(2)', menuElement);

					viewHolder.addClass('hidden');

					TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
						id: 'Mobile'
					});

					expect(viewHolder.hasClass('text-only')).to.be(true);
				});

				it('makes the view selector interactable when dashboard has more than one view', function() {
					var menuElement = $('#dashboard-menu');
					var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);
					var viewHolder = $('.top-level-item:eq(2)', menuElement);

					viewHolder.addClass('text-only');

					TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
						id: 'Overview'
					});

					expect(viewHolder.hasClass('text-only')).to.be(false);
				});
			});
		});

		describe('different view is selected', function() {
			it('publishes TLRGRP.BADGER.DashboardAndView.Selected event with the current dashboard id', function() {
				var expectedDashboardId = 'Overview';
				var actualDashboardId;
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);
				var select = $('.top-level-item:eq(2) select', menuElement);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
					id: 'Overview'
				});

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(dashboardAndView) {
					actualDashboardId = dashboardAndView.dashboard;
				});

				select[0].selectedIndex = 1;
				select.change();

				expect(actualDashboardId).to.be(expectedDashboardId);
			});

			it('publishes TLRGRP.BADGER.DashboardAndView.Selected event with specified view id', function() {
				var expectedViewId = 'Traffic';
				var actualViewId;
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);
				var select = $('.top-level-item:eq(2) select', menuElement);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
					id: 'Overview'
				});

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(dashboardAndView) {
					actualViewId = dashboardAndView.view;
				});

				select[0].selectedIndex = 1;
				select.change();

				expect(actualViewId).to.be(expectedViewId);
			});
		});

		describe('view is selected', function() {
			it('sets current view text', function() {
				var expectedTitle = 'Traffic';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
					id: 'Overview'
				});

				TLRGRP.messageBus.publish('TLRGRP.BADGER.View.Selected', {
					id: 'Traffic'
				});

				expect($('.top-level-item:eq(2) .current-item', menuElement).text()).to.be(expectedTitle);
			});

			it('sets current view select option', function() {
				var expectedTitle = 'By Page';
				var menuElement = $('#dashboard-menu');
				var menu = new TLRGRP.BADGER.Dashboard.Menu(menuElement);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.Dashboard.Selected', {
					id: 'Overview'
				});

				TLRGRP.messageBus.publish('TLRGRP.BADGER.View.Selected', {
					id: 'Traffic'
				});

				expect($('.top-level-item:eq(2) select', menuElement)[0].selectedIndex).to.be(1);
			});
		});
	});
})();