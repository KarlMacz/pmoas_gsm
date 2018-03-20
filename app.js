var electron = require('electron');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SerialPort = require('serialport');

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var Menu = electron.Menu;

app.on('window-all-closed', function() {
    if(process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    var mainWindow = new BrowserWindow({
        show: false,
        backgroundColor: '#eee',
        height: 600,
        width: 800,
        resizable: false,
        frame: false,
        autoHideMenuBar: true,
        fullscreen: false,
        icon: __dirname + '/system/assets/img/logo.png'
    });
    var gsmModule = null;

    mainWindow.loadURL('file://' + __dirname + '/system/index.html');
    mainWindow.openDevTools();
    Menu.setApplicationMenu(null);

    mainWindow.on('ready-to-show', function() {
        mainWindow.show();
    });

    io.on('connection', function(socket) {
        socket.on('test_gsm_connect', function(data) {
            if(gsmModule == null) {
                gsmModule = new SerialPort(data, {
                    baudRate: 115200,
                    parity: 'none',
                    dataBits: 8,
                    stopBits: 1
                }, function(err) {
                    if(err) {
                        io.emit('test_gsm_connect_response', 'Error');
                    } else {
                        io.emit('test_gsm_connect_response', 'Ok');
                    }
                });

                gsmModule.on('data', function(data) {
                    io.emit('test_gsm_data', data);
                });
            }
        });

        socket.on('test_gsm_command', function(data) {
            gsmModule.write(data);
        });

        socket.on('gsm_connect', function(data) {
            if(gsmModule == null) {
                gsmModule = new SerialPort(data, {
                    baudRate: 115200,
                    parity: 'none',
                    dataBits: 8,
                    stopBits: 1
                }, function(err) {
                    if(err) {
                        io.emit('gsm_connect_response', 'Error');
                    } else {
                        io.emit('gsm_connect_response', 'Ok');
                    }
                });

                gsmModule.on('data', function(data) {
                    io.emit('gsm_data', data);
                });
            }
        });

        socket.on('gsm_command', function(data) {
            data = JSON.parse(data);
            // gsmModule.write('AT\r\n', function() {
                // gsmModule.write('AT+CREG=1\r\n', function() {
                    // gsmModule.write('AT+CMGF=1\r\n', function() {
                        // gsmModule.write('AT+CMGS="' + data.contact_number + '"\r\n', function() {
                            // gsmModule.write(data.message + String.fromCharCode(26) + '\r\n', function() {
                                io.emit('gsm_sms_sent', true);
                            // });
                        // });
                    // });
                // });
            // });
        });

        socket.on('gsm_disconnect', function(data) {
            gsmModule.close(function(err) {
                gsmModule = null;
            });
        });

        socket.on('disconnect', function() {
            gsmModule.close(function(err) {
                gsmModule = null;
            });
        });
    });

    http.listen(3000, function() {
        console.log('Listening on port 3000');
    });
});
