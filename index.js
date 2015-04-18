var browserify = require('browserify-middleware')
  , mpd = require('mpd')
  , cmd = mpd.cmd
  , cronJob = require('cron').CronJob
  , express = require('express')
  , bodyParser = require('body-parser')
  , fs = require('fs')
  , nconf = require('nconf');

// Config file
nconf.argv()
    .env()
    .file({ file: __dirname + '/config.json' });

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var client = mpd.connect({
    port: nconf.get('mpdPort'),
    host: nconf.get('mpdHost')
});

var alarms = [];


var volRise = function() {
    var vol = 0;
    var interval = nconf.get('volRiseTime') / nconf.get('volMax');
    console.log('Rasing volume to ' + nconf.get('volMax'));
    var volSetter = setInterval(function(){
        vol++;
        var volCommand = cmd('setvol', [vol]);
        client.sendCommand(volCommand, function(err, msg) {
            if (err) throw err;
        });
        if (vol >= nconf.get('volMax')) {
            clearInterval(volSetter);
        }
    }, interval);
};

var alarmOn = function(alarm) {
    console.log('Wakey Wakey!');
    console.log('Running alarm ' + alarm);
    client.sendCommand(cmd('stop', []), function(err, msg) {
        if (err) throw err;
        console.log(msg);
    });
    client.sendCommand(cmd('clear', []), function(err, msg) {
        if (err) throw err;
        console.log(msg);
    });
    console.log('Loading playlist ' + nconf.get('mpdPlaylist'));
    client.sendCommand(cmd('load', [nconf.get('mpdPlaylist')]), function(err, msg) {
        if (err) throw err;
        console.log(msg);
    });

    client.sendCommand(cmd('shuffle', []), function(err, msg) {
        if (err) throw err;
        console.log(msg);
    });
    client.sendCommand(cmd('play', []), function(err, msg) {
        if (err) throw err;
        console.log(msg);
    });
    volRise();
    io.emit('alarm', { alarm: alarm })
};

var loadAlarms = function() {
    for (var i = alarms.length - 1; i >=0; i--) {
        alarms[i].stop();
    }

    alarms = [];


    for (var i = nconf.get('alarms').length - 1; i >= 0; i--) {
        var alarm = nconf.get('alarms')[i];
        console.log('setting alarm ' + alarm);
        try {
            alarms[i] = new cronJob(
                alarm,
                function() {
                    alarmOn(alarm);
                },
                function(){
                    console.log( 'alarm run' );
                },
                true // Start the job now
            );
        } catch(ex) {
            console.log('invalid cron value: ' +  nconf.get('alarms')[i]);
        }
    };
}

client.on('ready', function() {
    loadAlarms();
});

client.on('error', function(err){
    console.log('mpd error');
    console.log(err);
});


app.use('/js', browserify(__dirname + '/client'))

app.use('/', express.static(__dirname + '/static'));


app.get('/alarms', function(req, res){
    res.send(nconf.get('alarms'));
});

app.use( bodyParser.json() );

app.post('/alarms', function(req, res){
    var alarm = req.body.alarm;
    var alarms = nconf.get('alarms');
    alarms.push(alarm);
    nconf.set('alarms', alarms);
    nconf.save(function(err){
        if(err){
            res.send(false);
        } else {
            loadAlarms();
            res.send(true);
        }
    });
});

app.delete('/alarms/:alarm_index', function(req, res){
    var i = req.params.alarm_index;
    console.log(i);
    var alarms = nconf.get('alarms');
    alarms.splice(i, 1);
    nconf.set('alarms', alarms);
    nconf.save(function(err){
        if(err){
            res.send(false);
        } else {
            loadAlarms();
            res.send(true);
        }
    });
});

app.post('/alarm/on', function(req, res){
    alarmOn('manual alarm')
    res.send(true);
});

app.post('/alarm/off', function(req, res){
    client.sendCommand(cmd('stop', []), function(err, msg) {
        if (err) throw err;
        console.log(msg);
    });
    res.send(true);
});

var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});