var config = require('./config.json')
  , browserify = require('browserify-middleware')
  , mpd = require('mpd')
  , cmd = mpd.cmd
  , cronJob = require('cron').CronJob
  , express = require('express')
  , bodyParser = require('body-parser')
  , fs = require('fs');

var app = express();

var client = mpd.connect({
    port: config.mpdPort,
    host: config.mpdHost
});

var alarms = [];


var volRise = function() {
    var vol = 0;
    var interval = config.volRiseTime / config.volMax;
    console.log('Rasing volume to ' + config.volMax);
    var volSetter = setInterval(function(){
        vol++;
        var volCommand = cmd('setvol', [vol]);
        client.sendCommand(volCommand, function(err, msg) {
            if (err) throw err;
        });
        if (vol >= config.volMax) {
            clearInterval(volSetter);
        }
    }, interval);
}

var loadAlarms = function() {
    alarms = [];
    for (var i = config.alarms.length - 1; i >= 0; i--) {
        var alarm = config.alarms[i];
        console.log('setting alarm ' + alarm);
        try {
            alarms[i] = new cronJob(
                config.alarms[i],
                function() {
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
                    console.log('Loading playlist ' + config.mpdPlaylist);
                    client.sendCommand(cmd('load', [config.mpdPlaylist]), function(err, msg) {
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
                },
                function(){
                    console.log( 'alarm run' );
                },
                true // Start the job now
            );
        } catch(ex) {
            console.log('invalid cron value: ' +  config.alarms[i]);
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


app.use('/js', browserify('./client'))

app.use('/', express.static(__dirname + '/static'));


app.get('/alarms', function(req, res){
    res.send(config.alarms);
});

app.use( bodyParser.json() );

app.post('/alarms', function(req, res){
    var alarm = req.body.alarm;
    config.alarms.push(alarm);
    fs.writeFile('./config.json', JSON.stringify(config, null, 4), function(err){
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
    config.alarms.splice(i, 1);
    fs.writeFile('./config.json', JSON.stringify(config, null, 4), function(err){
        if(err){
            res.send(false);
        } else {
            loadAlarms();
            res.send(true);
        }
    });

});

var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});