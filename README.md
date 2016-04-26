#BADGER.Dashboards

##Description
BADGER Dashboards are built to provide an easy way to create more advanced graphs than those available in the excellent kibana.  One of the specific aims is to be able to leverage elasticsearch aggregations - which are awesome.

## Unififed Monitoring 

A goal that has grown from BADGER Dashboard's usage is to unify logging/metrics/alerting into one unified view.  This is supported by alerting being powered by an external platform, such as Icinga2, and not holding the thresholds in the dashboard view.

## Installation

### Dev

Non-minified assets, make a change, see it live

1. Clone repo
2. npm install
4. grunt serve

### Production

Minified, combined, optimised. grunt build required to see changes made in /static

1. Clone repo
2. npm install
3. grunt build
4. npm start

## Tests

Those tests which exist can be executed via: grunt test
