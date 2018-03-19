var fs = require('fs');

var remote = require('electron').remote;
var SerialPort = require('serialport');

var jQuery = require('jquery');
var $ = jQuery;
var bootstrap = require('bootstrap');

var settings = JSON.parse(fs.readFileSync(__dirname + '/config/settings.json'));
