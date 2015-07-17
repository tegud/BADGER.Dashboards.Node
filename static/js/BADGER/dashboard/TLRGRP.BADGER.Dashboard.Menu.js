(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    function setTickerWidth(ticker, clock) {
        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(dashboardAndView) {
            setTimeout(function() {
                ticker.css({ width: (clock.offset().left - ticker.offset().left - 20) }, 'fast');
            }, 50);
        });
    }

    TLRGRP.BADGER.Dashboard.Menu = function() {
        var clock = $('#clock');
        var ticker = $('#news-ticker');

        function setTime() {
            var currentTime = moment();
            $('.hours-and-minutes', clock).text(currentTime.format('HH:mm'));
            $('.seconds', clock).text(currentTime.format(':ss'));

            setTimeout(setTime, 1000);
        }

        function setTickerText(icon, text) {
            if(!ticker.length) { 
                return;
            }

            $('.ticket-icon span', ticker)[0].className = 'fa fa-check';
            $('.ticker-text').text('Nothing to report...');
        }

        setTime();
        setTickerWidth(ticker, clock);
        setTickerText()
    };
})();
