var alarms = require('./alarms.json')
  , config = require('./config.json')
  , mpd = require('mpd')
  , cmd = mpd.cmd;

var client = mpd.connect({
    port: config.mpdPort,
    host: config.mpdHost
});

console.log('hiya pal');

var volRise = function() {
    var vol = 0;
    var interval = config.volRiseTime / config.volMax;
    var volSetter = setInterval(function(){
        vol++;
        var volCommand = cmd('setvol', [vol]);
        console.log(volCommand);
        client.sendCommand(volCommand, function(err, msg) {
            if (err) throw err;
            console.log(msg);
        });
        if (vol >= config.volMax) {
            clearInterval(volSetter);
        }
    }, interval);
}

// volRise();
client.on('ready', function() {
    client.sendCommand(cmd('listplaylists', []), function(err, msg) {
        if (err) throw err;
        console.log(msg);
    });
});