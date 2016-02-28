(function() {
    'use strict';

    var viewSelectorTemplate = '{{#views}}<option value="{{id}}">{{name}}</option>{{/views}}';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    TLRGRP.BADGER.Dashboard.ViewSelector = function(selectorElement) {
        var viewSelect = $('select', selectorElement);
        var viewCurrentItem = $('.current-item', selectorElement);
        var stateMachine;

        function setViewsHandler(views, machine) {
            var viewsViewModel = buildViewModel(views);

            setViewSelectorHtml(viewsViewModel);

            machine.transitionToState(determineNextState(viewsViewModel.length));
        }

        function setViewSelectorHtml(viewsViewModel) {
            viewSelect.html(Mustache.render(viewSelectorTemplate, {
                views: viewsViewModel
            }));
        }

        function determineNextState(numberOfViews) {
            if(!numberOfViews) {
                return 'hidden';
            } else if(numberOfViews === 1) {
                return 'textOnly';
            } else {
                return 'selectable';
            }
        }

        function buildViewModel(views) {
            return _.chain(views)
                .filter(function(view) {
                    return typeof view.menu === 'undefined' || view.menu;
                })
                .map(function(view) {
                    return view;
                })
                .value();
        }

        function hideSelector() {
            selectorElement.addClass('hidden');
        }

        function showSelector() {
            selectorElement.removeClass('hidden');
        }

        function makeSelectable() {
            selectorElement.removeClass('text-only');
        }

        function makeTextOnly() {
            selectorElement.addClass('text-only');
        }

        function setSelectorText(text) {
            viewCurrentItem.text(text);
        }

        function setSelectorSelectedItem(value) {
            viewSelect[0].value = value;
        }

        stateMachine = new nano.Machine({
            states: {
                hidden: {
                    _onEnter: function() {
                        hideSelector();
                    },
                    setViews: function(views) {
                        setViewsHandler(views, this);
                    }
                },
                textOnly: {
                    _onEnter: function(views) {
                        makeTextOnly();
                        showSelector();
                    },
                    setValue: function(newValue) {
                        setSelectorText(newValue.name);
                    },
                    setViews: function(views) {
                        setViewsHandler(views, this);
                    }
                },
                selectable: {
                    _onEnter: function() {
                        makeSelectable();
                        showSelector();
                    },
                    setValue: function(newValue) {
                        setSelectorText(newValue.name);
                        setSelectorSelectedItem(newValue.id);
                    },
                    setViews: function(views) {
                        setViewsHandler(views, this);
                    }
                }
            },
            initialState: 'hidden'
        });

        return {
            setViews: function(views) {
                stateMachine.handle('setViews', views);
            },
            setValue: function(newValue) {
                stateMachine.handle('setValue', newValue);
            }
        };
    };
})();