angular.module('myApp', [
  'ngRoute',
  'ngResource',
  'ngAnimate',
  'ngSanitize',
  'ui.bootstrap',
  'wmMakeApiAngular',
  'ngWebmakerLogin',
  'localization',
  'begriffs.paginate-anything',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers',
  'rad.spiiin'
]).
config(['$routeProvider', '$locationProvider',
  function ($routeProvider, $locationProvider) {
    // Prevent Angular from losing its mind
    if (window.location.href !== decodeURI(window.location.href)) {
      window.location.href = decodeURI(window.location.href);
    }

    $locationProvider.html5Mode(true).hashPrefix('!');

    $routeProvider.when('/add', {
      templateUrl: '/views/add-update.html',
      controller: 'addUpdateController'
    });

    $routeProvider.when('/events', {
      templateUrl: '/views/list.html',
      controller: 'eventListController'
    });

    $routeProvider.when('/events/tag/:id', {
      templateUrl: '/views/tag-list.html',
      controller: 'tagListController'
    });

    $routeProvider.when('/events/:id', {
      templateUrl: '/views/detail.html',
      controller: 'eventDetailController'
    });

    $routeProvider.when('/edit/:id', {
      templateUrl: '/views/add-update.html',
      controller: 'addUpdateController'
    });

    $routeProvider.when('/event-guides', {
      templateUrl: '/views/event-guides.html'
    });

    $routeProvider.when('/user/:id', {
      templateUrl: '/views/user.html',
      controller: 'userController'
    });

    $routeProvider.when('/confirm/:type/:token', {
      templateUrl: '/views/confirm.html',
      controller: 'confirmController'
    });

    $routeProvider.when('/error/:code', {
      templateUrl: '/views/error.html',
      controller: 'errorController'
    });

    $routeProvider.when('/check-in/:id', {
      templateUrl: '/views/check-in.html',
      controller: 'checkInController'
    });

    $routeProvider.when('/', {
      templateUrl: '/views/home.html',
      controller: 'homeController'
    });

    $routeProvider.otherwise({
      redirectTo: '/error/404'
    });
  }
]).
run(['$http', '$rootScope', 'config',
  function ($http, $rootScope, config) {
    // Jump to top of viewport when new views load
    $rootScope.$on('$locationChangeSuccess', function (event) {
      window.scrollTo(0, 0);
    });

    // Set up user data
    $rootScope._user = {};

    // Set locale information
    if (config.supported_languages.indexOf(config.lang) > 0) {
      $rootScope.lang = config.lang;
    } else {
      $rootScope.lang = config.defaultLang;
    }
    $rootScope.direction = config.direction;
    $rootScope.arrowDir = config.direction === 'rtl' ? 'left' : 'right';

    $rootScope.ga_account = config.ga_account;
    $rootScope.ga_domain = config.ga_domain;

    $rootScope.eventsLocation = config.eventsLocation;

    // Forward old non-hash-bang URLS to hash-bang equivalents
    // eg:
    //  #/events -> #!/events
    //  #events -> #!/events
    if (window.location.hash.match(/^#[\/a-zA-Z]/)) {
      window.location.hash = window.location.hash.replace('#', '#!');
    }
  }
]);
