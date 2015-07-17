(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    function setTickerWidth(ticker, clock) {
        if(!ticker.length) {
            return;
        }
        
        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(dashboardAndView) {
            setTimeout(function() {
                var clockLeftPosition = 0;
                if(clock.length) {
                    clockLeftPosition = clock.offset().left;
                } 

                ticker.css({ width: (clockLeftPosition - ticker.offset().left - 20) }, 'fast');
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

        if(!ticker.length) { 
            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.Ticker.Show', function(tickerItem) {
                    // level: 'info',
                    // message: sessionName ? sessionName + (sessionId ? ' (' + sessionId.substr(0, 8) + ')' : '') : sessionId,                    
                    // for: 5000


            });
        };

        setTime();
        setTickerWidth(ticker, clock);
        setTickerText()
    };
})();
