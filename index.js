var
    Mopidy = require('mopidy')
  , later = require('later')
  , express = require('express')
  , bodyParser = require('body-parser')
  , fs = require('fs')
  , nconf = require('nconf')
  , spark = require('spark');

// Config file
nconf.argv()
    .env()
    .file({ file: __dirname + '/config.json' });

nconf.defaults({
    'mpdPort': 6600,
    'mpdHost': 'localhost',
    'mpdPlaylist': 'Wakeup',
    'volMax': 100,
    'volMin': 0,
    'volRiseTime': 18000,
    'alarms': ['50 6 * * *']
});

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var mopidy = new Mopidy({
    webSocketUrl: "ws://localhost:6680/mopidy/ws/"
});

later.date.localTime();

var alarms = [];
var playlist = null;

// Log into particle
if (nconf.get('particleUsername') && nconf.get('particlePassword')) {
    spark.login({ username: nconf.get('particleUsername'), password: nconf.get('particlePassword')});
    
}

var loadPlaylist = function(cb) {
    // TODO: Only grab the playlist if it is not already stored
    var playlist_name = nconf.get('mpdPlaylist');
    mopidy.playlists.getPlaylists().then(function(playlists){
        for (var i = playlists.length - 1; i >= 0; i--) {
            if (playlists[i].name == playlist_name) {
                playlist = playlists[i];
                break;
            }
        }
    });
    cb(playlist);
};

var mopidyInit = function() {
    loadPlaylist(loadAlarms);
};



var volRise = function() {
    var vol = nconf.get('volMin');
    var interval = nconf.get('volRiseTime') / ( nconf.get('volMax') - vol );
    console.log('Rasing volume to ' + nconf.get('volMax'));
    var volSetter = setInterval(function(){
        vol++;
        mopidy.mixer.setVolume(vol);
        if (vol >= nconf.get('volMax')) {
            clearInterval(volSetter);
        }
    }, interval);
};

var alarmOn = function() {
    console.log('Wakey Wakey!');
    mopidy.playback.stop();
    mopidy.tracklist.clear();
    mopidy.tracklist.add(playlist.tracks);
    mopidy.tracklist.shuffle();
    mopidy.playback.play();
    volRise();
    io.emit('alarm');
    var event = spark.publishEvent('alarmOn', {});
};

spark.on('login', function() {
  spark.onEvent('alarmOff', function(data) {
    mopidy.playback.getState().then(function(state){
        if (state == 'playing') {
            mopidy.playback.pause();
        } else {
            mopidy.playback.resume();
        }
    });
  });
  spark.onEvent('alarmVol', function(data) {
    var vol = parseInt(data.data);
    mopidy.mixer.setVolume(vol);
  });
  spark.onEvent('alarmPrev', function(data) {
    mopidy.playback.previous();
  });
  spark.onEvent('alarmNext', function(data) {
    mopidy.playback.next();
  });
});


var loadAlarms = function() {
    for (var i = alarms.length - 1; i >=0; i--) {
        alarms[i].clear();
    }

    alarms = [];


    for (var i = nconf.get('alarms').length - 1; i >= 0; i--) {
        var alarm = nconf.get('alarms')[i];
        console.log('setting alarm ' + alarm.value);
        try {
            var schedule;
            if (alarm.type == 'cron'){
                schedule = later.parse.cron(alarm.value);
            } else if (alarm.type == 'text'){
                schedule = later.parse.text(alarm.value);
            }
            console.log(schedule.error);
            alarms[i] = later.setInterval(function(){
                loadPlaylist(alarmOn);
            }, schedule);
        } catch(ex) {
            console.log('invalid alarm value: ' +  alarm.value);
        }
    }
};

mopidy.on('state:online', mopidyInit);


app.use('/', express.static(__dirname + '/static'));
app.use('/vendor', express.static(__dirname + '/bower_components'));


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
    loadPlaylist(function(){
        alarmOn('manual alarm');
    });
    res.send(true);
});

app.post('/alarm/off', function(req, res){
    mopidy.playback.stop();
    var event = spark.publishEvent('alarmOff', {});
    res.send(true);
});

var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});


// Arduino stuff
var arduino = require('./arduino-control');

arduino.volume(function(vol){
    console.log(vol);
    mopidy.mixer.setVolume(vol);
});
