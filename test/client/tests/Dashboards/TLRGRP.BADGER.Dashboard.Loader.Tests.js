(function() {
	'use strict';

	describe('Dashboard Loader', function () {
		LOADING.show = function() { };
		LOADING.hide = function() { };
		
		var onComponentUnload;
		var onTrafficUnloadDeferred;
		var firstComponentRenderDeferred;

		new TLRGRP.BADGER.Dashboard.PageManager();

		beforeEach(function() {
			TLRGRP.BADGER.Dashboard.clear();
			TLRGRP.BADGER.Dashboard.register({
				id: 'Overview',
				views: [{
					id: 'Summary',
					name: 'Summary',
					components: [
						{
							unload: function() {
								var deferred = $.Deferred();

								(onComponentUnload || $.noop)();

								deferred.resolve();

								return deferred;
							},
							render: function(container) {
								firstComponentRenderDeferred = $.Deferred();

								$('<div id="component-one"></div>').appendTo(container);

								return firstComponentRenderDeferred;
							} 
						},
						{
							render: function(container) {
								$('<div id="component-two"></div>').appendTo(container);
							} 
						}
					]
				}, {
					id: 'Traffic',
					name: 'Traffic',
					components: [
						{
							unload: function() {
								onTrafficUnloadDeferred = $.Deferred();

								(onComponentUnload || $.noop)();

								return onTrafficUnloadDeferred;
							},
							render: function() {
							}
						}
					]
				}]
			});

			$('#dashboard-container').remove();
			$('body').append($('<div />', { id: 'dashboard-container' }));
		});

		it('is initially loading', function() {
			var loadingDisplayed = false;

			LOADING.show = function() {
				loadingDisplayed = true;
			};

			new TLRGRP.BADGER.Dashboard.Loader($('#dashboard-container'));

			expect(loadingDisplayed).to.be(true);
		});

		describe('when dashboard and view is selected', function () {
			it('Loading screen is shown', function () {
				var loadingDisplayed = false;

				LOADING.show = function() {
					loadingDisplayed = true;
				};

				new TLRGRP.BADGER.Dashboard.Loader($('#dashboard-container'));

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'Overview'
				});

				expect(loadingDisplayed).to.be(true);
			});

			it('sets dashboard container html to component generated html', function() {
				var expectedHtml = '<div id="component-one"></div><div id="component-two"></div>';
				var dashboardContainer = $('#dashboard-container');

				new TLRGRP.BADGER.Dashboard.Loader(dashboardContainer);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'Overview'
				});

				expect(dashboardContainer.html()).to.be(expectedHtml);
			});


			it('hides loading screen once html is set', function() {
				var loadingHidden = false;

				LOADING.hide = function() {
					loadingHidden = true;
				};
				new TLRGRP.BADGER.Dashboard.Loader($('#dashboard-container'));

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'Overview'
				});

				firstComponentRenderDeferred.resolve();

				expect(loadingHidden).to.be(true);
			});

			it('initialises dashboard container when html is set', function() {
				var dashboardContainer = $('#dashboard-container');

				new TLRGRP.BADGER.Dashboard.Loader(dashboardContainer);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'Overview'
				});

				expect(dashboardContainer.hasClass('initialised')).to.be(true);
			});

			describe('when another view is selected', function() {
				it('unloads all components of previous view', function() {
					var unloadCalled = false;

					onComponentUnload = function() { 
						unloadCalled = true; 
					};

					new TLRGRP.BADGER.Dashboard.Loader($('#dashboard-container'));

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'Overview'
					});

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'Overview',
						view: 'Traffic'
					});

					expect(unloadCalled).to.be(true);
				});

				it('sets the html to the last selected view', function() {
					var expectedHtml = '<div id="component-one"></div><div id="component-two"></div>';
					var dashboardContainer = $('#dashboard-container');

					new TLRGRP.BADGER.Dashboard.Loader(dashboardContainer);

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'Overview',
						view: 'Traffic'
					});

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'Overview'
					});

					onTrafficUnloadDeferred.resolve();

					expect(dashboardContainer.html()).to.be(expectedHtml);
				});

				it('it sets the html once async unload methods have completed', function() {
					var expectedHtml = '<div id="component-one"></div><div id="component-two"></div>';
					var dashboardContainer = $('#dashboard-container');

					new TLRGRP.BADGER.Dashboard.Loader(dashboardContainer);

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'Overview',
						view: 'Traffic'
					});

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'Overview'
					});

					expect(dashboardContainer.html()).to.be('');

					onTrafficUnloadDeferred.resolve();

					expect(dashboardContainer.html()).to.be(expectedHtml);
				});


				it('it hides the loading screen once all async rendering has completed', function() {
					var loadingHidden;

					LOADING.hide = function() {
						loadingHidden = true;
					};

					var dashboardContainer = $('#dashboard-container');

					new TLRGRP.BADGER.Dashboard.Loader(dashboardContainer);

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'Overview',
						view: 'Traffic'
					});

					loadingHidden = false;

					TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
						dashboard: 'Overview'
					});

					expect(loadingHidden).to.be(false);

					onTrafficUnloadDeferred.resolve();
					firstComponentRenderDeferred.resolve();

					expect(loadingHidden).to.be(true);
				});
			});
		});
	});
})();