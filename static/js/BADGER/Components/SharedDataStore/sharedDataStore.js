(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    function setFiltersFromQueryString(filters) {
        _.each(filters, function(filter) {
            var value = getParameterByName(filter.id);

            if(value) {
                filter.value = value;
            }
        });
    }

    TLRGRP.BADGER.Dashboard.Components.SharedDataStore = function (configuration) {
        var subscribedComponents = {};

        setFiltersFromQueryString(configuration.filters);

        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            request:  new TLRGRP.BADGER.Dashboard.DataSource[(configuration.dataSource)](configuration),
            refresh: 5000,
            mappings: configuration.mappings,
            callbacks: {
                success: function (data) {
                    _.each(subscribedComponents, function(subscribedComponent) {
                        if(subscribedComponent.refreshComplete) {
                            subscribedComponent.refreshComplete(data);
                        }

                        if(subscribedComponent.loading) {
                            subscribedComponent.loading.finished();
                        }
                    });
                }
            },
            filters: _.map(configuration.filters, function(filter) {
                return {
                    id: filter.id,
                    allowMultiple: filter.allowMultiple,
                    setOnProperties: filter.setOnProperties
                };
            }),
            components: {
                loading: {
                    loading: function() {
                        _.each(subscribedComponents, function(subscribedComponent) {
                            if(subscribedComponent.loading) {
                                subscribedComponent.loading.loading();
                            }
                        });
                    },
                    finished: function() {
                        _.each(subscribedComponents, function(subscribedComponent) {
                            if(subscribedComponent.loading) {
                                subscribedComponent.loading.finished();
                            }
                        });
                    }
                }
            }
        });

        var componentLayout;

        if(configuration.filters) {
            componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
                title: configuration.title,
                layout: configuration.layout,
                componentClass: 'graph-and-counter-component',
                modules: [
                    {
                        appendTo: function (container) {
                            var filtersViewModel = {
                                filters: _.map(configuration.filters, function(filter) {
                                    return {
                                        id: filter.id,
                                        title: filter.title,
                                        options: _.map(filter.options, function(value, label) {
                                            return {
                                                label: label,
                                                value: value,
                                                optionCheckedClass: (!filter.value && label === 'All') || filter.value === value ? 'selected' : ''
                                            };
                                        })
                                    };
                                })
                            };

                            $(Mustache.render('<div>'
                                + '{{#filters}}<div class="filter-item" data-filter-id="{{id}}"><label>{{title}}</label>'
                                    + '{{#options}}<div class="filter-option {{optionCheckedClass}}" data-filter-value="{{value}}"><div class="filter-option-checkbox radio"><div class="filter-option-checkbox-inner {{optionCheckedClass}}"></div></div>{{label}}</div>{{/options}}'
                                + '</div>{{/filters}}'
                                + '</div>', filtersViewModel)).appendTo(container);

                            container.on('click', '.filter-option', function() {
                                var filterId = $(this).closest('.filter-item').data('filterId');
                                var value = $(this).data('filterValue');

                                if($(this).hasClass('selected')) { 
                                    return; 
                                }

                                $(this)
                                    .addClass('selected')
                                    .siblings()
                                        .removeClass('selected');

                                dataStore.setFilter(filterId, value);
                            });
                        }
                    }
                ]
            });
        }

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.SharedDataStore.Subscribe', function(storeSubscription) {
            if(subscribedComponents[storeSubscription.id]) {
                return;
            }

            subscribedComponents[storeSubscription.id] = storeSubscription;
        });

        TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Unsubscribe', function(id) {
            delete subscribedComponents[id];
        });

        return {
            render: function (container) {
                if(configuration.filters) {
                    componentLayout.appendTo(container);
                }
                dataStore.start();
            },
            unload: function () {
                dataStore.stop();
            }
        };
    };
})();
