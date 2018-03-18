var electron = require('electron');

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

    mainWindow.loadURL('file://' + __dirname + '/system/index.html');
    mainWindow.openDevTools();
    Menu.setApplicationMenu(null);

    mainWindow.on('ready-to-show', function() {
        mainWindow.show();
    });
});
