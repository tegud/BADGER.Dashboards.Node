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

    TLRGRP.BADGER.Dashboard.Components.Filters = function (configuration) {
        function getParameterByName(querystring, name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");

            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
            var results = regex.exec(querystring);

            return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }

        var filters = _.map(configuration, function(filter) {
            return {
                id: filter.id,
                defaultOption: filter.defaultOption,
                allOptions: _.map(filter.options, function(option, key) {
                    return {
                        value: option,
                        id: key
                    };
                }),
                selectedOptions: []
            };
        });

        return {
            loadFromQuerystring: function(querystring) {
                _.each(filters, function(filter) {
                    filter.selectedOptions = _.filter(filter.allOptions, function(option) {
                        option = option.value;

                        if(typeof option === 'object') {
                            return _.every(option, function(value, property) {
                                return value === getParameterByName(querystring, property);
                            });
                        }
                        else {
                            var queryStringValue = getParameterByName(querystring, filter.id);

                            return option === queryStringValue;
                        }
                    });
                });
            },
            setFilterOption: function(filterId, option) {
                var filter = _.chain(filters).filter(function(filter) {
                    return filter.id = filterId;
                }).first().value();

                filter.selectedOptions = filter.allOptions.filter(function(filter) {
                    return filter.id === option;
                });
            },
            setAgainstDataStore: function(dataStore) {
                _.each(filters, function(filter) {
                    dataStore.setFilter(filter.id, filter.selectedOptions.length ? _.map(filter.selectedOptions, function(option) {
                        return option.value;
                    }) : undefined)
                });
            },
            getValueForFilter: function(filterId) {
                var filter = _.chain(filters).filter(function(filter) {
                    return filter.id = filterId;
                }).first().value();

                if(!filter.selectedOptions.length) {
                    return;
                }

                return filter.selectedOptions[0].value;
            },
            getSelectedOptionForFilter: function(filterId) {
                var filter = _.chain(filters).filter(function(filter) {
                    return filter.id = filterId;
                }).first().value();

                if(!filter.selectedOptions.length) {
                    return filter.defaultOption;
                }

                return filter.selectedOptions[0].id;
            }
        };
    };

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

        var filters = new TLRGRP.BADGER.Dashboard.Components.Filters(configuration.filters);
        var componentLayout;

        if(configuration.filters) {
            componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
                title: configuration.title,
                layout: configuration.layout,
                componentClass: 'graph-and-counter-component',
                modules: [
                    {
                        appendTo: function (container) {
                            filters.loadFromQuerystring(location.search);

                            var filtersViewModel = {
                                filters: _.map(configuration.filters, function(filter) {
                                    return {
                                        id: filter.id,
                                        title: filter.title,
                                        options: _.map(filter.options, function(value, label) {
                                            var isChecked = filters.getSelectedOptionForFilter(filter.id) === label;

                                            return {
                                                label: label,
                                                value: label,
                                                optionCheckedClass: isChecked ? 'selected' : ''
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

                                filters.setFilterOption(filterId, value);

                                filters.setAgainstDataStore(dataStore);
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
                    filters.setAgainstDataStore(dataStore);

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
