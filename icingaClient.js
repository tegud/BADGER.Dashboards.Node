var fs = require('fs');
var path = require('path');
var caFile = path.resolve(__dirname, 'ssl/ca.crt');
var request = require('request');
var config = require('./credentials.json');

module.exports = function createIcingaClient() {

    function map(data) {
        var mappedResults = JSON.parse(data).results.map(function (result) {
            var name = result.name.split("!")[0]
            var checkState = mapCheckState(result.attrs.last_check_result.state)
            return {
                last_check_state: checkState,
                name: name,
                id: name.substring(6, 9)
            }
        });
        return mappedResults;
    }

    function mapCheckState(state) {
        switch (state) {
        case 1:
            return "warning"
        case 2:
            return "error"
        default:
            return "ok"
        }
    }

    return {
        checkHealth: function (req, res) {
            var options = {
                url: 'https://pentlrgmonitor01.ad.laterooms.com:5665/v1/objects/services',
                ca: fs.readFileSync(caFile),
                auth: config.icingaAuth,
                body: JSON.stringify({
                    filter: "\"" + req.query.group + "\" in host.groups",
                    attrs: ["last_check_result", "groups"]
                })
            }

            request(options, function (err, response, body) {
                if (err) return res.send(err)
                res.send(map(body))
            })

        }
    }
}