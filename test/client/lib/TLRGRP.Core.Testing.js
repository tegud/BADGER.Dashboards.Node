(function() {
    'use strict';
    TLRGRP.messageBus.setUpClearDown = (function() {
        return function() {
            beforeEach(function() {
                TLRGRP.messageBus.reset();
            });
        };
    })();
})();