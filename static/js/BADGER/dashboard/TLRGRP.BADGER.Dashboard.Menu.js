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

            $('.ticket-icon span', ticker)[0].className = icon;
            $('.ticker-text').text(text);
        }

        if(ticker.length) { 
            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.Ticker.Show', function(tickerItem) {
                    if(tickerItem.for) {
                        setTimeout(setTickerText.bind(undefined, 'fa fa-check', 'Nothing to report...'), tickerItem.for);
                    }

                    var levelIcons = {
                        info: 'mega-octicon octicon-info',
                        ok: 'fa fa-check'
                    };

                    setTickerText(levelIcons[tickerItem.level], tickerItem.message)
            });
        };

        setTime();
        setTickerWidth(ticker, clock);

        TLRGRP.messageBus.publish('TLRGRP.BADGER.Ticker.Show', {
            level: 'ok',
            message: 'Nothing to report...'
        });
    };
})();
