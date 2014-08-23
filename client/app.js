require('angular');
var config = require('../config.json');

console.log(config);
console.log(angular);

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

    this.alarms = config.alarms;
    this.newAlarm = '';

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
                    config.alarms.push(alarm);
                    self.newAlarm = '';
                }
            });
        }
    };

    this.update = function(){
        console.log(this);
    }

    this.delete = function(i){
        var self = this;
        $http.delete('/alarms/' + i)
        .success(function(data, status, headers){
            if (data){
                self.alarms.splice(i, 1);
            }
        });
    }

});