var fs = require('fs');
var path = require('path');
var caFile = path.resolve(__dirname, 'ssl/ca.crt');
var request = require('request');
var config = require('./credentials.json');
var Promise = require('bluebird');

module.exports = function createIcingaClient() {

    function map(data) {
        var mappedResults = data.results.map(function (result) {
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
        case 3:
            return "unknown"
        default:
            return "ok"
        }
    }

    function icingaQuery(filter, attributes, joins) {
        return new Promise(function(resolve, reject) {
            var options = {
                url: 'https://pentlrgmonitor01.ad.laterooms.com:5665/v1/objects/services',
                ca: fs.readFileSync(caFile),
                auth: config.icingaAuth,
                body: JSON.stringify({
                    filter: filter,
                    attrs: attributes,
                    joins: joins
                })
            };

            request(options, function (err, response, body) {
                if (err) {
                    console.log(err);
                    return reject(err);
                }

                if(response.statusCode !== 200) {
                    return reject('Icinga API request failed did not return OK');
                }

                resolve(JSON.parse(body));
            });
        });
    }

    return {
        checkFilter: function(req, res) {
            var attrs;
            var joins;

            if(req.query.attrs) {
                attrs = req.query.attrs.split(',');
            }

            if(req.query.joins) {
                joins = req.query.joins.split(',');
            }

            return icingaQuery(req.query.filter, attrs, joins)
                .then(function(response) {
                    res.send(response);
                })
                .catch(function(err) {
                    res.send(err);
                });
        },
        checkHealth: function (req, res) {
            return icingaQuery("\"" + req.query.group + "\" in host.groups", ["last_check_result", "groups"])
                .then(function(response) {
                    res.send(map(response));
                })
                .catch(function(err) {
                    res.send(err);
                });
        }
    }
}