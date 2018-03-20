var siteUrl = null;
var csrfToken = null;
var comPort = null;
var arePortsLoaded = false;
var jobs = [];
var mode = 'SMS';
var smsInterval = null;

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
    $('#com-port-field').html('<option value="" selected disabled>Select an option...</option>');
    $('#test-com-port-field').html('<option value="" selected disabled>Select an option...</option>');

    SerialPort.list(function (err, ports) {
        if(ports.length > 0) {
            ports.forEach(function(port) {
                $('#com-port-field').append('<option value="' + port.comName + '">' + port.comName + ' - ' + port.manufacturer + '</option>');
                $('#test-com-port-field').append('<option value="' + port.comName + '">' + port.comName + ' - ' + port.manufacturer + '</option>');
            });

            arePortsLoaded = true;
        } else {
            arePortsLoaded = false;
        }
    });

    $('#url-field').html('<option value="" selected disabled>Select an option...</option>');
    // $('#url-field').append('<option value="' + settings.primary_url + '">' + settings.primary_url + '</option>');
    // $('#url-field').append('<option value="' + settings.secondary_url + '">' + settings.secondary_url + '</option>');
    $('#url-field').append('<option value="http://eingredientsspecialist.com">http://eingredientsspecialist.com</option>');
    $('#url-field').append('<option value="http://localhost:8080">http://localhost:8080</option>');
}

function loadMainPage() {
    closePage('main-page');
    openPage('loader-page');

    loadSerialPorts();

    setTimeout(function() {
        closePage('loader-page');
    }, 1000);
    setTimeout(function() {
        openPage('main-page');

        $('.app-switch-button').css({
            'display': 'inline-block'
        });
    }, 1250);
}

function startRun() {
    $('#run-button').text('Stop');
    $('.input-fieldset').attr('disabled', true);
    $('#job-logs .listing').html('');

    siteUrl = $('#url-field option:selected').val();
    comPort = $('#com-port-field option:selected').val();

    $.ajax({
        url: siteUrl + '/resources/requests/authorization',
        method: 'POST',
        data: {
            authorization_key: settings.authorization_key
        },
        dataType: 'json',
        success: function(response) {
            $('#job-logs .listing').prepend('<div class="listing-item">\
                    <h4 class="no-margin">' + response.message + '</h4>\
                </div>');

            if(response.status === 'Success') {
                csrfToken = response.token;

                sendSms();

                smsInterval = setInterval(function() {
                    sendSms();
                }, 3000);
            }
        },
        error: function(arg1, arg2, arg3) {
            stopRun();
        }
    });
}

function sendSms() {
    $.ajax({
        url: siteUrl + '/resources/requests/jobs',
        headers: {
            'X-CSRF-TOKEN': csrfToken
        },
        method: 'POST',
        data: {
            authorization_key: settings.authorization_key
        },
        dataType: 'json',
        success: function(response) {
            if(response.status === 'Success') {
                $('#job-logs .listing').prepend('<div class="listing-item">\
                        <h4 class="no-margin">1 job(s) retrieved.</h4>\
                    </div>');

                socket.emit('gsm_command', {
                    'id': response.data.id,
                    'contact_number': response.data.contact_number,
                    'message': response.data.message
                });
            } else {
                $('#job-logs .listing').prepend('<div class="listing-item">\
                    <h4 class="no-margin">' + response.message + '</h4>\
                </div>');
            }
        },
        error: function(arg1, arg2, arg3) {
            console.log(arg1.responseText);

            stopRun();
        }
    });
}

function updateJobStatus(id) {
    $.ajax({
        url: siteUrl + '/resources/requests/jobs/update_status',
        headers: {
            'X-CSRF-TOKEN': csrfToken
        },
        method: 'POST',
        data: {
            authorization_key: settings.authorization_key,
            id: id
        },
        dataType: 'json',
        success: function(response) {
            console.log(response);
        },
        error: function(arg1, arg2, arg3) {
            console.log(arg1.responseText);
        }
    });
}

function stopRun() {
    $('#run-button').text('Start');
    $('.input-fieldset').attr('disabled', false);

    socket.emit('gsm_disconnect', true);

    clearInterval(smsInterval);
    smsInterval = null;
}

$(document).ready(function() {
    $(function() {
        $('[data-toggle="tooltip"]').tooltip();
    });

    loadMainPage();

    $('.app-close-button').click(function() {
        remote.getCurrentWindow().close();
    });

    $('.app-minimize-button').click(function() {
        remote.getCurrentWindow().minimize();
    });

    $('.app-switch-button').click(function() {
        loadSerialPorts();

        if(mode === 'SMS') {
            mode = 'Test';

            $(this).attr('title', 'Switch to SMS Mode');
            $(this).attr('data-original-title', 'Switch to SMS Mode');
            $('[data-toggle="tooltip"]').tooltip();

            setTimeout(function() {
                closePage('main-page');
            }, 250);
            setTimeout(function() {
                openPage('testing-page');
            }, 500);
        } else {
            mode = 'SMS';

            $(this).attr('title', 'Switch to Test Mode');
            $(this).attr('data-original-title', 'Switch to Test Mode');
            $('[data-toggle="tooltip"]').tooltip();

            setTimeout(function() {
                closePage('testing-page');
            }, 250);
            setTimeout(function() {
                openPage('main-page');
            }, 500);
        }

        socket.emit('gsm_disconnect', true);
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
            socket.emit('gsm_connect', $('#com-port-field option:selected').val());
        } else {
            stopRun();
        }
    });

    $('body').on('click', '#set-button', function() {
        if($(this).text() === 'Connect') {
            if($('#test-com-port-field option:selected').val() !== '') {
                $(this).text('Disconnect');
                $('#testing-logs').html('');

                socket.emit('test_gsm_connect', $('#test-com-port-field option:selected').val());
            } else {
                $('#test-com-port-field option:selected').focus();
            }
        } else {
            $(this).text('Connect');

            socket.emit('gsm_disconnect', true);

            $('#run-button').text('Start');
            $('.input-fieldset').attr('disabled', false);
        }
    });

    $('body').on('click', '#send-button', function() {
        if($('#command-field').val() !== '') {
            var additionalData = "";

            if($('#crlf-checkbox').is(':checked')) {
                additionalData = "\r\n";
            }

            socket.emit('test_gsm_command', $('#command-field').val() + additionalData);

            $('#testing-logs').append('<strong>:: ' + $('#command-field').val() + '</strong><br>');
            $('#command-field').val('');
        }

        $('#command-field').focus();
    });

    $('body').on('keyup', '#command-field', function(e) {
        if(e.keyCode === 13) {
            if($('#command-field').val() !== '') {
                var additionalData = "";

                if($('#crlf-checkbox').is(':checked')) {
                    additionalData = "\r\n";
                }

                socket.emit('test_gsm_command', $('#command-field').val() + additionalData);

                $('#testing-logs').append('<strong>:: ' + $('#command-field').val() + '</strong><br>');
                $('#command-field').val('');
            }

            $('#command-field').focus();
        }
    });

    socket.on('test_gsm_connect_response', function(data) {
        if(data === 'Ok') {
            $('#testing-logs').append('Connection with ' + $('#test-com-port-field option:selected').val() + ' has been established.<br>');
            $('#command-fieldset').attr('disabled', false);
        } else {
            $('#testing-logs').append('Unable to established connection with the selected COM port.<br>');
            $('#command-fieldset').attr('disabled', true);
            $('#set-button').text('Connect');
        }
    });

    socket.on('test_gsm_data', function(data) {
        $('#testing-logs').append(data + '<br>');
    });

    socket.on('gsm_connect_response', function(data) {
        if(data === 'Ok') {
            $('#job-logs .listing').prepend('<div class="listing-item">\
                <h4 class="no-margin">Connection with ' + $('#com-port-field option:selected').val() + ' has been established.</h4>\
            </div>');
            $('#input-fieldset').attr('disabled', false);

            startRun();
        } else {
            $('#job-logs .listing').prepend('<div class="listing-item">\
                <h4 class="no-margin">Unable to established connection with the selected COM port..</h4>\
            </div>');
            $('#input-fieldset').attr('disabled', true);
            $('#set-button').text('Connect');

            stopRun();
        }
    });

    socket.on('gsm_data', function(data) {
        $('#job-logs .listing').prepend('<div class="listing-item">\
                <h4 class="no-margin">' + data + '</h4>\
            </div>');
    });

    socket.on('gsm_sms_sent', function(data) {
        if(data.status === 'Success') {
            $('#job-logs .listing').prepend('<div class="listing-item">\
                    <h4 class="no-margin">Message sent.</h4>\
                </div>');

            updateJobStatus(data.id);
        } else {
            $('#job-logs .listing').prepend('<div class="listing-item">\
                    <h4 class="no-margin">Message sending failed.</h4>\
                </div>');
        }
    });
});
