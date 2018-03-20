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
    var gsmModuleError = null;

    mainWindow.loadURL('file://' + __dirname + '/system/index.html');
    mainWindow.openDevTools();
    Menu.setApplicationMenu(null);

    mainWindow.on('ready-to-show', function() {
        mainWindow.show();
    });

    io.on('connection', function(socket) {
        socket.on('test_gsm_connect', function(data) {
            if(gsmModule != null) {
                gsmModule.close(function(err) {
                    gsmModule = null;
                });
            }

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
        });

        socket.on('test_gsm_command', function(data) {
            gsmModule.write(data);
        });

        socket.on('gsm_connect', function(data) {
            if(gsmModule != null) {
                gsmModule.close(function(err) {
                    gsmModule = null;
                });
            }
            
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

            gsmModule.on('error', function() {
                gsmModuleError = true;
            });
        });

        socket.on('gsm_command', function(data) {
            console.log(data);

            gsmModule.write('AT\r\n');

            setTimeout(function() {
                gsmModule.write('AT+CREG=1\r\n');
            }, 250);

            setTimeout(function() {
                if(gsmModuleError == null && gsmModuleError != true) {
                    gsmModule.write('AT+CMGF=1\r\n');
                }
            }, 500);

            setTimeout(function() {
                if(gsmModuleError == null && gsmModuleError != true) {
                    gsmModule.write('AT+CMGS="' + data.contact_number + '"\r\n');
                }
            }, 750);

            setTimeout(function() {
                if(gsmModuleError == null && gsmModuleError != true) {
                    gsmModule.write(data.message);
                }
            }, 1000);

            setTimeout(function() {
                if(gsmModuleError == null && gsmModuleError != true) {
                    gsmModule.write(Buffer([0x1A]));
                }
            }, 1250);

            setTimeout(function() {
                if(gsmModuleError == null && gsmModuleError != true) {
                    gsmModule.write('\r\n');
                }
            }, 1500);

            if(gsmModuleError === true) {
                gsmModuleError = null;

                io.emit('gsm_sms_sent', {
                    status: 'Error'
                });
            } else {
                gsmModuleError = null;

                io.emit('gsm_sms_sent', {
                    'status': 'Success',
                    'id': data.id
                });
            }
        });

        socket.on('gsm_disconnect', function(data) {
            if(gsmModule != null) {
                gsmModule.close(function(err) {
                    gsmModule = null;
                });
            }
        });

        socket.on('disconnect', function() {
            if(gsmModule != null) {
                gsmModule.close(function(err) {
                    gsmModule = null;
                });
            }
        });
    });

    http.listen(3000, function() {
        console.log('Listening on port 3000');
    });
});
