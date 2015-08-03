(function() {

    var five = require('johnny-five');
    var nconf = require('nconf');
    var board = new five.Board();
    var arduinoControl = {};
    var volumeSensor;

    board.on("ready", function() {

      volumeSensor = new five.Sensor({
        pin: 'A0',
        freq: 250,
        threshold: 2
      });

      this.repl.inject({
        volumeSensor: volumeSensor
      });

    });

    module.exports = {
      volume: function(cb){
        board.on('ready', function(){
          var volMin = parseInt(nconf.get('volMin'));
          var volMax = nconf.get('volMin');
          var vol = nconf.get('volMax');
          volumeSensor.scale([volMin, 100]).on("data", function() {
            var prevVol = vol;
            vol = Math.round(this.value);
            if (vol != prevVol) {
              cb(vol);
            }
          });
        });
      }
    };

})();
