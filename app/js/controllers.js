// Controllers ----------------------------------------------------------------

angular.module('myApp.controllers', [])
  .controller('homeController', ['$scope', '$timeout', 'eventService',
    function ($scope, $timeout, eventService) {
      eventService.query({
        after: (new Date()).toISOString(),
        limit: 20,
        dedupe: true
      }, function (data) {
        $scope.events = data;
      });
    }
  ])
  .controller('userController', ['$scope', '$routeParams', 'eventService',
    function ($scope, $routeParams, eventService) {
      $scope.username = $routeParams.id;

      eventService.query({
        organizerId: $scope.username
      }, function (data) {
        $scope.events = data;
      });
    }
  ])
  .controller('addUpdateController', ['$scope', '$location', '$rootScope', '$routeParams', 'moment', 'chrono', 'eventService', 'eventFormatter', 'usernameService', 'analytics',
    function ($scope, $location, $rootScope, $routeParams, moment, chrono, eventService, eventFormatter, usernameService, analytics) {

      $scope.event = {};

      // Update or add?
      if ($routeParams.id) {
        $scope.isUpdate = true;
      } else {
        $scope.isAdd = true;
      }

      if ($scope.isUpdate) {
        eventService.get({
          id: $routeParams.id
        }, function (data) {
          // Update all the values in the form with values from DB:
          $scope.event.title = data.title;
          $scope.event.description = data.description;
          $scope.event.attendees = data.attendees || 5;
          $scope.event.organizer = data.organizer;
          $scope.event.organizerId = data.organizerId;
          $scope.event.ageGroup = data.ageGroup || '';
          $scope.event.skillLevel = data.skillLevel || '';
          $scope.event.tags = data.tags;
          $scope.event.mentorRequests = data.mentorRequests || [];
          $scope.event.mentors = data.mentors || [];
          $scope.event.coorganizers = data.coorganizers || [];

          // TEMP : Need to convert back from city/country/lat/long/whatever
          $scope.event.address = data.address;

          if (data.registerLink) {
            $scope.event.registerLink = data.registerLink;
          }

          $scope.event.beginDate = moment(data.beginDate).format('MMMM Do YYYY [at] h:mma');
          $scope.event.duration = 'unknown'; // default to unknown

          // Parse out duration from end date if it exists
          if (data.endDate) {
            var endDate = moment(data.endDate);
            var duration = endDate.diff(data.beginDate, 'minutes') / 60;

            if (duration < 3 && duration > 0) {
              $scope.event.duration = duration;
            }
          }

        }, function (err) {
          console.error(err);
        });
      } else {
        // Add event

        $scope.event.organizer = $rootScope._user.email;
        $scope.event.organizerId = $rootScope._user.username;

        $scope.event.coorganizers = [];
        $scope.event.mentorRequests = [];
        $scope.event.mentors = [];

        // Set default values for form
        $scope.event.attendees = 5; // Under 10 by default
        $scope.event.duration = 1; // 1 hour default

        $scope.event.parsedNaturalStartDate = undefined;
        // $scope.attemptedToSubmit = false;
      }

      $scope.addUser = function (input, type) {
        var user = {};
        if (type === 'coorganizer') {
          usernameService.post({
            username: input
          }, function (data) {
            if ( data.exists ) {
              user.username = input;
              $scope.event.coorganizers.push(user);
              $scope.coorganizerInput = '';
              console.log( $scope );
              $scope.addEventForm.coorganizer_email_input.$error.invalidUsername = false;
            } else {
              $scope.addEventForm.coorganizer_email_input.$error.invalidUsername = true;
            }
          });
        } else {
          user.email = input;
          $scope.event.mentors.push(user);
          $scope.mentorInput = '';
        }
      };

      $scope.removeUser = function (user, type) {
        var index = $scope.event[type + 's'].indexOf(user);
        if (index > -1) {
          $scope.event[type + 's'].splice(index, 1);
        }
      };

      // Keep email and login status up to date
      $scope.$watch('_user.email', function () {
        $scope.event.organizer = $scope._user.email;
      });

      // Continuously translate natural language date to JS Date
      $scope.$watch('event.beginDate', function (newValue) {
        if (newValue) {
          $scope.event.parsedNaturalStartDate = chrono.parseDate(newValue);
          $scope.event.isValidStartDate = moment($scope.event.parsedNaturalStartDate).isValid();
          $scope.event.humanParsedDate = moment($scope.event.parsedNaturalStartDate).format('MMMM Do YYYY [at] h:mma');
        }
      });

      $scope.$on('locationAutocompleted', function (event, data) {
        $scope.event.latitude = data.latitude;
        $scope.event.longitude = data.longitude;
        $scope.event.city = data.city;
        $scope.event.country = data.country;
      });

      $scope.addEvent = function () {
        $scope.attemptedToSubmit = true;

        var eventData = eventFormatter($scope.addEventForm, $scope.event);

        // Only admins can change the primary organizer on behalf of other people
        if (!$rootScope._user.isAdmin) {
          $scope.event.organizer = $rootScope._user.email;
          $scope.event.organizerId = $rootScope._user.username;
        }

        if (eventData) {
          eventService.save(eventData, function (data) {
            // Switch to detail view on successful creation
            $location.path('/events/' + data.id);

            analytics.event('Add Event');
          }, function (err) {
            // TODO : Show error to user
            console.error('addEvent save error: ' + err.data);
          });
        } else {
          console.warn('Form is invalid.');
        }
      };

      $scope.saveChanges = function () {

        $scope.attemptedToSubmit = true;

        var eventData = eventFormatter($scope.addEventForm, $scope.event);

        if (eventData) {
          eventService.update({
            id: $routeParams.id
          }, eventData, function (data) {
            $location.path('/events/' + $routeParams.id);
          }, function (err) {
            console.error(err.data);
          });
        }

      };

      $scope.deleteEvent = function () {
        if (window.confirm('Are you sure you want to delete your event?')) {
          eventService.delete({
            id: $routeParams.id
          }, $scope.event, function () {
            $location.path('/events');
          }, function (err) {
            console.error(err.data);
          });
        }
      };
    }
  ])
  .controller('eventListController', ['$scope', 'eventService',
    function ($scope, eventService) {
      eventService.query({
        after: (new Date()).toISOString()
      }, function (data) {
        $scope.events = data;
      });
    }
  ])
  .controller('eventDetailController', ['$scope', '$rootScope', '$http', '$routeParams', '$sanitize', 'eventService', 'moment', 'config',
    function ($scope, $rootScope, $http, $routeParams, $sanitize, eventService, moment, config) {
      eventService.get({
        id: $routeParams.id,
      }, function (data) {

        $scope.webmakerUrl = config.webmakerUrl;

        data.description = $sanitize(data.description);

        $scope.eventData = data;
        $scope.eventData.friendlyStartDate = moment(data.beginDate).format('dddd, MMMM Do, h:mma');
        $scope.eventID = $routeParams.id;

        // TODO: Eventually competency IDs will be added during event creation.
        // Right now random IDs are created as a hook for varying detail view header colors.
        $scope.eventData.competencyID = Math.floor(Math.random() * 16);

        $scope.isCoorganizer = function() {
          return $scope.eventData.coorganizers.some(function(c) {
            c.userId === $rootScope._user.id;
          });
        };

      }, function (err) {
        console.error(err);

        if (err.status === 404) {
          document.location.hash = '#!/errors/404';
        }
      });
    }
  ])
  .controller('navController', ['$scope', '$location', 'config',
    function ($scope, $location, config) {

      $scope.isActive = function (location) {
        return location === $location.path();
      };

      $scope.webmakerUrl = config.webmakerUrl;
      $scope.accountSettingsUrl = config.accountSettingsUrl;
      $scope.myMakesUrl = config.myMakesUrl;

    }
  ])
  .controller('errorController', ['$scope', '$routeParams',
    function ($scope, $routeParams) {
      $scope.errorCode = $routeParams.code;
    }
  ])
  .controller('createUserController', ['$scope', '$http', '$modal', 'authService',
    function ($scope, $http, $modal, authService) {

      authService.on('newuser', function (assertion) {
        $modal.open({
          templateUrl: 'views/partials/create-user-form.html',
          controller: createUserCtrl,
          resolve: {
            assertion: function () {
              return assertion;
            }
          }
        });
      });

      var createUserCtrl = function ($scope, $modalInstance, authService, assertion, config) {

        $scope.form = {};
        $scope.user = {};
        $scope.supported_languages = config.supported_languages;
        $scope.currentLang = config.lang;
        $scope.langmap = config.langmap;

        $scope.checkUsername = function () {
          if (!$scope.form.user.username) {
            return;
          }
          $http
            .post(authService.urls.checkUsername, {
              username: $scope.form.user.username.$viewValue
            })
            .success(function (username) {
              $scope.form.user.username.$setValidity('taken', !username.exists);
            })
            .error(function (err) {
              console.log(err);
              $scope.form.user.username.$setValidity('taken', true);
            });
        };

        $scope.createUser = function () {
          $scope.submit = true;
          if ($scope.form.user.$valid && $scope.form.agree) {
            authService.createUser({
              assertion: assertion,
              user: $scope.user
            });
            $modalInstance.close();
          }
        };

        $scope.cancel = function () {
          authService.analytics.webmakerNewUserCancelled();
          $modalInstance.dismiss('cancel');
        };
      };

      authService.verify();
    }
  ])
  .controller('confirmController', ['$scope', '$routeParams', '$http', 'eventService', 'config',
    function ($scope, $routeParams, $http, eventService, config) {
      var token = $routeParams.token;
      var eventId = $routeParams.eventId;
      var confirmNo = $routeParams.confirmation === 'no';

      $scope.event = {};
      $scope.isValid = false;
      $scope.confirmNo = confirmNo;

      $scope.sendConfirmation = function (confirmation) {
        $http({
          method: 'POST',
          url: config.eventsLocation + '/confirm/mentor/' + token,
          data: {
            confirmation: confirmation
          },
          withCredentials: true
        })
          .success(function (mentor) {
            $scope.isConfirmSuccessfull = 'confirm-' + confirmation;
          })
          .error(function (err) {
            console.log(err);
          });
      };

      $scope.reset = function () {
        delete $scope.isConfirmSuccessfull;
      };

      // Get event
      eventService.get({
        id: eventId
      }, function (event) {
        event.mentorRequests.forEach(function (request) {
          if (request.token === token) {
            $scope.isValid = true;
            $scope.event = event;
          }
        });
      }, function (err) {
        console.log(err);
      });

    }
  ]);
