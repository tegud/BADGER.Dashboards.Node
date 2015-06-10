(function() {
	'use strict';

	describe('Dashboard Loader', function () {
		LOADING.show = function() { };
		LOADING.hide = function() { };
		
		var onComponentUnload;
		var onTrafficUnloadDeferred;
		var firstComponentRenderDeferred;

		new TLRGRP.BADGER.Dashboard.PageManager();

        $.get = function(url) {
            var splitUrl = url.split('/');
            var view = splitUrl[4].split('.')[0];

            return {
                then: function(callback) {
                    callback(ajaxyDataForDashboard[view]);
                }
            };
        };

        TLRGRP.BADGER.Dashboard.Components.One = function() {
            return {
                unload: function () {
                    var deferred = $.Deferred();

                    (onComponentUnload || $.noop)();

                    deferred.resolve();

                    return deferred;
                },
                render: function (container) {
                    firstComponentRenderDeferred = $.Deferred();

                    $('<div id="component-one"></div>').appendTo(container);

                    return firstComponentRenderDeferred;
                }
            };
        };

        TLRGRP.BADGER.Dashboard.Components.Two = function() {
            return {
                render: function (container) {
                    $('<div id="component-two"></div>').appendTo(container);
                }
            };
        };

        TLRGRP.BADGER.Dashboard.Components.Three = function() {
            return {
                unload: function() {
                    onTrafficUnloadDeferred = $.Deferred();

                    (onComponentUnload || $.noop)();

                    return onTrafficUnloadDeferred;
                },
                render: function() { }
            };
        };

        TLRGRP.BADGER.Dashboard.Components.Four = function() {
            return {
                render: function (container) {
                    $('<div id="component-four"></div>').appendTo(container);
                }
            };
        };

        TLRGRP.BADGER.Dashboard.ComponentFactories.TwoAndFourFactory = function() {
            return {
                load: function() {
                    var deferred = $.Deferred();

                    deferred.resolve([
                    	{ type: 'Two' },
                    	{ type: 'Four' }
                	]);

                    return deferred;
                }
            };
        };

        var ajaxyDataForDashboard = {
            'Summary': {
                name: 'Summary',
                components: [
                    { type: 'One' },
                    { type: 'Two' }
                ]
            },
            'Traffic': {
                name: 'Traffic',
                components: [
                    { type: 'Three' }
                ]
            },
            'Other': {
                name: 'Other',
                componentFactory: { type: 'TwoAndFourFactory' }
            }
        };

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
                }, {
                    id: 'Other',
                    name: 'Other'
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

			it('uses component factory if one is specified', function() {
				var expectedHtml = '<div id="component-two"></div><div id="component-four"></div>';
				var dashboardContainer = $('#dashboard-container');

				new TLRGRP.BADGER.Dashboard.Loader(dashboardContainer);

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'Overview',
					view: 'Other'
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