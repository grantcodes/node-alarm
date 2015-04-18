require('angular');

var app = angular.module('app', []);

// app.config(function($routeProvider, $locationProvider) {
//     $routeProvider
//         .when('/', {

//         })
//         .otherwise({
//             redirectTo: '/'
//         });
//     $locationProvider.html5Mode(true);
// });

app.controller('AlarmCtrl', function ($scope, $location, $http) {

    this.alarms = [];
    this.newAlarm = '';

    this.init = function() {
        var self = this;
        $http.get('/alarms')
        .success(function(data, status, headers){
            if (data){
                self.alarms = data;
            }
        });
    };
    this.init();

    this.new = function(){
        var self = this;
        var alarm = this.newAlarm;
        if (alarm){
            var data = {
                alarm: alarm
            }
            $http.post('/alarms', data)
            .success(function(data, status, headers){
                if(data){
                    self.alarms.push(alarm);
                    self.newAlarm = '';
                }
            });
        }
    };

    this.update = function(){
        console.log(this);
    };

    this.on = function(){
        $http.post('/alarm/on')
        .success(function(data, status, headers){
            if (data){
                console.log('alarm on');
            }
        });
    };

    this.off = function(){
        $http.post('/alarm/off')
        .success(function(data, status, headers){
            if (data){
                console.log('alarm off');
            }
        });
    };

    this.delete = function(i){
        var self = this;
        $http.delete('/alarms/' + i)
        .success(function(data, status, headers){
            if (data){
                self.alarms.splice(i, 1);
            }
        });
    };

});