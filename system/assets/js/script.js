var siteUrl = null;
var csrfToken = null;
var comPort = null;
var currentComPort = null;
var arePortsLoaded = false;
var jobs = [];

function closePage(id) {
    $('#' + id + '.page').fadeOut(250);
}

function setPageContent(id, content) {
    $('#' + id + '.page').html(content);
}

function openPage(id) {
    $('#' + id + '.page').fadeIn(250);
}

function sendCommand(command, callback) {
    if(callback != undefined && callback != null) {
        SerialPort.write(command + "\r\n", 'utf8', callback);
    } else {
        SerialPort.write(command + "\r\n");
    }
}

function loadSerialPorts() {
    closePage('main-page');
    openPage('loader-page');

    SerialPort.list(function (err, ports) {
        if(ports.length > 0) {
            ports.forEach(function(port) {
                $('#com-port-field').append('<option value="' + port.comName + '">' + port.comName + ' - ' + port.manufacturer + '</option>');

                console.log(port.pnpId);
                console.log(port.manufacturer);
            });

            arePortsLoaded = true;
        } else {
            arePortsLoaded = false;
        }
    });

    $('#url-field').append('<option value="' + settings.primary_url + '">' + settings.primary_url + '</option>');
    $('#url-field').append('<option value="' + settings.secondary_url + '">' + settings.secondary_url + '</option>');

    setTimeout(function() {
        closePage('loader-page');
    }, 1000);

    setTimeout(function() {
        openPage('main-page');
    }, 1250);
}

function startRun() {
    $('#run-button').text('Stop');
    $('.input-fieldset').attr('disabled', true);
    $('#job-logs .listing').html('');

    siteUrl = $('#url-field').val();
    comPort = $('#com-port-field').val();

    $.ajax({
        url: siteUrl + '/resources/requests/authorization',
        method: 'POST',
        data: {
            authorization_key: settings.authorization_key
        },
        dataType: 'json',
        success: function(response1) {
            csrfToken = response1;

            currentComPort = new SerialPort(comPort, {
                baudRate: 115200,
                parity: 'none',
                dataBits: 8,
                stopBits: 1
            }, function(err) {
                if(err) {
                    stopRun();

                    $('#job-logs .listing').append('<div class="listing-item">\
                        <h4 class="no-margin">10 jobs found.</h4>\
                    </div>');
                }
            });

            $.ajax({
                url: siteUrl + '/resources/requests/jobs',
                method: 'POST',
                data: {
                    _token: csrfToken,
                    authorization_key: settings.authorization_key
                },
                dataType: 'json',
                success: function(response2) {
                    if(response2.data.length > 0) {
                        $('#job-logs .listing').append('<div class="listing-item">\
                            <h4 class="no-margin">' + response2.data.length + ' job(s) retrieved.</h4>\
                        </div>');

                        sendCommand('AT', function() {
                            sendCommand('AT+CREG=1', function() {
                                for(var ctr = 0; ctr < response2.data.length; ctr++) {
                                    sendCommand('AT+CMGF=1', function() {
                                        sendCommand('AT+CMGS="' + response2.data[ctr].contact_number + '"', function() {
                                            sendCommand(response2.data[ctr].message + String.fromCharCode(26), function() {
                                                $('#job-logs .listing').append('<div class="listing-item">\
                                                    <h4 class="no-margin">Sent a message to ' + response2.data[ctr].contact_number + '.</h4>\
                                                </div>');
                                            });
                                        });
                                    });
                                }

                                $('#job-logs .listing').append('<div class="listing-item">\
                                    <h4 class="no-margin">' + response2.data.length + ' job(s) retrieved.</h4>\
                                </div>');
                            });
                        });
                    }
                },
                error: function(arg1, arg2, arg3) {
                    stopRun();
                }
            });

            currentComPort.on('data', function(data) {
                console.log(data);
            });
        },
        error: function(arg1, arg2, arg3) {
            stopRun();
        }
    });
}

function stopRun() {
    $('#run-button').text('Start');
    $('.input-fieldset').attr('disabled', false);

    if(currentComPort != null) {
        currentComPort.close(function(err) {});
    }

    currentComPort = null;
}

$(document).ready(function() {
    loadSerialPorts();

    $('.app-close-button').click(function() {
        remote.getCurrentWindow().close();
    });

    $('.app-minimize-button').click(function() {
        remote.getCurrentWindow().minimize();
    });

    $('body').on('change', '#url-field', function() {
        if($('#url-field option:selected').val() !== '' && $('#com-port-field option:selected').val() !== '') {
            $('#run-button').attr('disabled', false);
        } else {
            $('#run-button').attr('disabled', true);
        }
    });

    $('body').on('change', '#com-port-field', function() {
        if($('#url-field option:selected').val() !== '' && $('#com-port-field option:selected').val() !== '') {
            $('#run-button').attr('disabled', false);
        } else {
            $('#run-button').attr('disabled', true);
        }
    });

    $('body').on('click', '#run-button', function() {
        if($(this).text() === 'Start') {
            startRun();
        } else {
            stopRun();
        }
    });
});
