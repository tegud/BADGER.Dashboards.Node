(function() {
	'use strict';

	var currentUrl = '/';
	TLRGRP.BADGER.URL.current = function() {
		return currentUrl;
	};
	var originalUrl = TLRGRP.BADGER.URL;

	describe('Dashboard Page', function () {
		beforeEach(function() {
			TLRGRP.messageBus.setUpClearDown();

			TLRGRP.BADGER.Dashboard.clear();
			TLRGRP.BADGER.Dashboard.register({ 
				id: 'BigScreen',
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
			TLRGRP.BADGER.Dashboard.register({ id: 'Mobile' });
			TLRGRP.BADGER.Dashboard.register({ 
				id: 'Requests',
				views: {
					Executing: {
						id: 'Executing',
						name: 'Requests Executing'
					},
					PerSec: {
						id: 'PerSec',
						name: 'Requests /s'
					}
				} 
			});
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

			currentUrl = '/';
		});

		describe('url does not specify a dashboard or view', function() {
			it('the Bigscreen dashboard is selected', function() {
				var expectedDashboard = 'BigScreen';
				var actualDashboard;

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(newDashboardInfo) {
					actualDashboard = newDashboardInfo.dashboard;
				});

				currentUrl = '/';

				new TLRGRP.BADGER.Dashboard.PageManager();

				expect(actualDashboard).to.be(expectedDashboard);
			});
		});

		describe('url specifies a dashboard', function() {
			it('the specified dashboard is selected', function() {
				var expectedDashboard = 'ByPage';
				var actualDashboard;

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(newDashboardInfo) {
					actualDashboard = newDashboardInfo.dashboard;
				});

				currentUrl = '/ByPage';

				var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

				expect(actualDashboard).to.be(expectedDashboard);
			});
		});

		describe('root url is specified', function() {
			it('the specified dashboard is selected ignoring the base url', function() {
				var expectedDashboard = 'ByPage';
				var actualDashboard;

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(newDashboardInfo) {
					actualDashboard = newDashboardInfo.dashboard;
				});

				currentUrl = '/status/ByPage';

				new TLRGRP.BADGER.Dashboard.PageManager({ baseUrl: '/status' });

				expect(actualDashboard).to.be(expectedDashboard);
			});

			it('the specified dashboard is selected ignoring the base url ignoring case', function() {
				var expectedDashboard = 'ByPage';
				var actualDashboard;

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(newDashboardInfo) {
					actualDashboard = newDashboardInfo.dashboard;
				});

				currentUrl = '/Status/ByPage';

				new TLRGRP.BADGER.Dashboard.PageManager({ baseUrl: '/status' });

				expect(actualDashboard).to.be(expectedDashboard);
			});
		});

		describe('url specifies a dashboard and view', function() {
			it('the specified view is selected', function() {
				var expectedDashboard = 'PerSec';
				var actualDashboard;

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.DashboardAndView.Selected', function(newDashboardInfo) {
					actualDashboard = newDashboardInfo.view;
				});

				currentUrl = '/Requests/PerSec';

				new TLRGRP.BADGER.Dashboard.PageManager();

				expect(actualDashboard).to.be(expectedDashboard);
			});
		});

		describe('url specifies a dashboard, view and timeframe', function() {
			it('today timeFrame is set', function() {
				var expectedTimeframe = { timeFrame: 0, units: 'daysAgo', userSet: true };
				var actualTimeframe;

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.TimePeriod.Set', function(timeFrame) {
					actualTimeframe = timeFrame;
				});

				currentUrl = '/Requests/PerSec/Today';

				new TLRGRP.BADGER.Dashboard.PageManager();

				expect(actualTimeframe).to.eql(expectedTimeframe);
			});

			it('7 days ago timeFrame is set', function() {
				var expectedTimeframe = { timeFrame: 7, units: 'daysAgo', userSet: true };
				var actualTimeframe;

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.TimePeriod.Set', function(timeFrame) {
					actualTimeframe = timeFrame;
				});

				currentUrl = '/Requests/PerSec/7DaysAgo';

				new TLRGRP.BADGER.Dashboard.PageManager();

				expect(actualTimeframe).to.eql(expectedTimeframe);
			});

			it('7 hours relative timeFrame is set', function() {
				var expectedTimeframe = { timeFrame: 6, units: 'hours', userSet: true };
				var actualTimeframe;

				TLRGRP.messageBus.subscribe('TLRGRP.BADGER.TimePeriod.Set', function(timeFrame) {
					actualTimeframe = timeFrame;
				});

				currentUrl = '/Requests/PerSec/6hours';

				new TLRGRP.BADGER.Dashboard.PageManager();

				expect(actualTimeframe).to.eql(expectedTimeframe);
			});

			it('doesn\'t clear the dashboard and view', function() {
				currentUrl = '/Requests/PerSec/7DaysAgo';
				var expectedUrl = currentUrl;
				var actualUrl;

				TLRGRP.BADGER.URL.pushState = function(pageInfo) {
					currentUrl = pageInfo.url;
					actualUrl = pageInfo.url;
				};

				new TLRGRP.BADGER.Dashboard.PageManager();

				expect(actualUrl).to.eql(expectedUrl);
			});
		});

		describe('default dashboard', function() {
			describe('is selected', function() {
				it('sets the url to default', function() {
					var expectedNewUrl = '/';
					var actualNewUrl;
					new TLRGRP.BADGER.Dashboard.PageManager();

					TLRGRP.BADGER.URL.pushState = function(pageInfo) {
						actualNewUrl = pageInfo.url;
					};

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'BigScreen'
					});

					expect(actualNewUrl).to.be(expectedNewUrl);
				});
			});

			describe('a non default view is selected', function() {
				it('sets the url to dashboard/view', function() {
					var expectedNewUrl = '/BigScreen/Traffic';
					var actualNewUrl;
					var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

					TLRGRP.BADGER.URL.pushState = function(pageInfo) {
						actualNewUrl = pageInfo.url;
					};

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'BigScreen',
						view: 'Traffic'
					});

					expect(actualNewUrl).to.be(expectedNewUrl);
				});
			});

			describe('default view is selected', function() {
				it('sets the url to default', function() {
					var expectedNewUrl = '/';
					var actualNewUrl;
					new TLRGRP.BADGER.Dashboard.PageManager();

					TLRGRP.BADGER.URL.pushState = function(pageInfo) {
						actualNewUrl = pageInfo.url;
					};

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'BigScreen',
						view: 'Summary'
					});

					expect(actualNewUrl).to.be(expectedNewUrl);
				});
			});
		});

		describe('dashboard is selected', function() {
			it('pushes dashboard to url state', function() {
				var expectedNewUrl = '/ByPage';
				var actualNewUrl = '';
				var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

				TLRGRP.BADGER.URL.pushState = function(pageInfo) {
					actualNewUrl = pageInfo.url;
				};

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'ByPage'
				});

				expect(actualNewUrl).to.be(expectedNewUrl);
			});

			it('pushes timeFrame to url state for today', function() {
				var expectedNewUrl = '/ByPage/PerSec/Today';
				var actualNewUrl = '';
				var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

				TLRGRP.BADGER.URL.pushState = function(pageInfo) {
					actualNewUrl = pageInfo.url;
				};

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'ByPage',
					view: 'PerSec'
				});

	            TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', {
	            	units: 'daysAgo',
	            	timeFrame: 0,
	            	userSet: true
	            });

				expect(actualNewUrl).to.be(expectedNewUrl);
			});

			it('pushes timeFrame to url state for number of days ago', function() {
				var expectedNewUrl = '/ByPage/PerSec/7DaysAgo';
				var actualNewUrl = '';
				var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

				TLRGRP.BADGER.URL.pushState = function(pageInfo) {
					actualNewUrl = pageInfo.url;
				};

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'ByPage',
					view: 'PerSec'
				});

	            TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', {
	            	units: 'daysAgo',
	            	timeFrame: 7,
	            	userSet: true
	            });

				expect(actualNewUrl).to.be(expectedNewUrl);
			});

			it('pushes timeFrame to url state for relative timeFrame', function() {
				var expectedNewUrl = '/ByPage/PerSec/15mins';
				var actualNewUrl = '';
				var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

				TLRGRP.BADGER.URL.pushState = function(pageInfo) {
					actualNewUrl = pageInfo.url;
				};

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'ByPage',
					view: 'PerSec'
				});

	            TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', {
	            	units: 'mins',
	            	timeFrame: 15,
	            	userSet: true
	            });

				expect(actualNewUrl).to.be(expectedNewUrl);
			});

			it('doesn\'t push timeFrame to url state when timeFrame was not user set', function() {
				var expectedNewUrl = '/ByPage';
				var actualNewUrl = '';
				var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

				TLRGRP.BADGER.URL.pushState = function(pageInfo) {
					actualNewUrl = pageInfo.url;
				};

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'ByPage',
					view: 'PerSec'
				});

	            TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', {
	            	units: 'daysAgo',
	            	timeFrame: 7,
	            	userSet: false
	            });

				expect(actualNewUrl).to.be(expectedNewUrl);
			});

			describe('base url has been specified', function() {
				it('includes the base url', function() {
					var expectedNewUrl = '/status/ByPage';
					var actualNewUrl = '';
					var pageManager = new TLRGRP.BADGER.Dashboard.PageManager({ baseUrl: '/status' });

					TLRGRP.BADGER.URL.pushState = function(pageInfo) {
						actualNewUrl = pageInfo.url;
					};

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'ByPage'
					});

					expect(actualNewUrl).to.be(expectedNewUrl);
				});
			});
		});

		describe('user navigates back or forwards to a previously viewed dashboard', function() {
			describe('with a default view', function() {
				it('loads the specified dashboard', function() {
					var expectedDashboard = 'Requests';
					var actualDashboard;
					var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

					TLRGRP.messageBus.subscribe('TLRGRP.BADGER.Dashboard.Selected', function(newDashboardInfo) {
						actualDashboard = newDashboardInfo.id;				
					});

					TLRGRP.messageBus.publish('TLRGRP.BADGER.PAGE.HistoryPopState', {
						dashboard: 'Requests'
					});

					expect(actualDashboard).to.be(expectedDashboard);
				});

				it('loads the default view', function() {
					var expectedView = 'Executing';
					var actualView;
					var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

					TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(newViewInfo) {
						actualView = newViewInfo.id;				
					});

					TLRGRP.messageBus.publish('TLRGRP.BADGER.PAGE.HistoryPopState', {
						dashboard: 'Requests'
					});

					expect(actualView).to.be(expectedView);
				});
			});

			describe('with a specified view', function() {
				it('loads the specified dashboard', function() {
					var expectedDashboard = 'Requests';
					var actualDashboard;
					var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

					TLRGRP.messageBus.subscribe('TLRGRP.BADGER.Dashboard.Selected', function(newDashboardInfo) {
						actualDashboard = newDashboardInfo.id;				
					});

					TLRGRP.messageBus.publish('TLRGRP.BADGER.PAGE.HistoryPopState', {
						dashboard: 'Requests'
					});

					expect(actualDashboard).to.be(expectedDashboard);
				});

				it('loads the specified view', function() {
					var expectedView = 'PerSec';
					var actualView;
					var pageManager = new TLRGRP.BADGER.Dashboard.PageManager();

					TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(newViewInfo) {
						actualView = newViewInfo.id;				
					});

					TLRGRP.messageBus.publish('TLRGRP.BADGER.PAGE.HistoryPopState', {
						dashboard: 'Requests',
						view: 'PerSec'
					});

					expect(actualView).to.be(expectedView);
				});

				it('doesn\'t load the default view then the specified view', function() {
					var defaultViewLoaded = false;
					new TLRGRP.BADGER.Dashboard.PageManager();

					TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(newViewInfo) {
						if(newViewInfo.id === 'Executing') {
							defaultViewLoaded = true;
						}
					});

					TLRGRP.messageBus.publish('TLRGRP.BADGER.PAGE.HistoryPopState', {
						dashboard: 'Requests',
						view: 'PerSec'
					});

					expect(defaultViewLoaded).to.be(false);
				});
			});
		});
	});
})();