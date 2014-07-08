(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    var validAppendLocations = ['component', 'content'];

    TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout = function (configuration) {
        configuration.layout.width -= 20;

        var componentElement = $(Mustache.render('<div class="dashboard-component {{componentClass}}" style="width: {{layout.width}}px; margin-right: {{layout.marginRight}}"><h3>{{title}}</h3></div>', configuration));
        var contentElement;

        _(configuration.modules).forEach(function (module) {
            var appendTo;
            
            if (module.appendToLocation) {
                appendTo = module.appendToLocation();
            }

            if (!appendTo || !_(validAppendLocations).contains(appendTo)) {
                appendTo = 'component';
            }

            if (appendTo === 'content') {
                if (!contentElement) {
                    contentElement = $('<div class="component-content"></div>').appendTo(componentElement);
                }

                module.appendTo(contentElement);
            } else {
                module.appendTo(componentElement);
            }
            
        });

        return {
            appendTo: function (container) {
                componentElement.appendTo(container);
            },
            append: function(element) {
                componentElement.append(element);
            }
        };
    };
})();