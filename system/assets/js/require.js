var fs = require('fs');

var remote = require('electron').remote;
var SerialPort = require('serialport');

var jQuery = require('jquery');
var $ = jQuery;
var bootstrap = require('bootstrap');

var socket = require('socket.io-client').connect('http://localhost:3000', { reconnect: true });

var settings = JSON.parse(fs.readFileSync(__dirname + '/config/settings.json'));
