#!/usr/bin/env node

var fs       = require('fs');
var Path     = require('path');
var mkpath   = require('yow/fs').mkpath;
var random   = require('yow/random');
var sprintf  = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isString = require('yow/is').isString;
var logs     = require('yow/logs');
var Queue    = require('yow/queue');
var Matrix   = require('hzeller-matrix');




var App = function(argv) {

	var _this    = this;
	var _queue   = new Queue(50);
	var _matrix  = undefined;
	var _socket  = undefined;

	var argv = parseArgs();

	function parseArgs() {

		var args = require('yargs');

		args.usage('Usage: $0 [options]');
		args.help('help').alias('help', 'h');

		args.option('height', {alias:'H',        describe:'Height of RGB matrix', default:32});
		args.option('width',  {alias:'W',        describe:'Width of RGB matrix', default:32});
		args.option('service',  {alias:'s',      describe:'Name of service', default:'hzeller-matrix-32x32'});

		args.wrap(null);

		args.check(function(argv) {
			return true;
		});

		return args.argv;
	}



	function enqueue(options, fn) {

		if (options == undefined)
			options = {};

		if (options.priority == 'low' && _matrix.isRunning())
			return;

		function enqueue() {
			if (options.priority == '!') {
				_queue.queue([fn]);
				_matrix.stop();
			}
			else if (options.priority == 'high') {
				_queue.prequeue(fn);
			}
			else {
				_queue.enqueue(fn);
			}
		}

		function dequeue() {
			_queue.dequeue().then(function() {
				console.log('Entering idle mode');
				_socket.emit('idle', {});

			})
			.catch(function(error) {
				console.log(error.stack);
				_socket.emit('idle', {});
			});

		}

		if (_queue.isEmpty()) {
			enqueue();
			dequeue();
		}
		else {
			enqueue();
		}

	}


	function displayIP() {

		return new Promise(function(resolve, reject) {
			function getIP(name) {

				try {
					var os = require('os');
					var ifaces = os.networkInterfaces();

					var iface = ifaces[name];

					for (var i = 0; i < iface.length; i++)
						if (iface[i].family == 'IPv4')
							return iface[i].address;

				}
				catch(error) {
					return undefined;

				}
			}

			var ip = getIP('wlan0');

			if (ip == undefined)
				ip = 'Ready';

			_matrix.runText(ip, {}, resolve);
		});

	}


	function run() {

		logs.prefix();


		_matrix = new Matrix({width:argv.width, height:argv.height});


		displayIP().then(function() {


			console.log('Started', new Date());

			_socket = require('socket.io-client')('http://app-o.se/' + argv.service);

			_socket.on('connect', function() {
				console.log('Connected to socket server!');

				var options = {
					id:704
				};

				enqueue(options, function() {
					return new Promise(function(resolve, reject) {

						if (!options.id || options.id < 1 || options.id > 846)
							options.id = 704;

						options.image = sprintf('%s/images/%dx%d/emojis/%d.png', __dirname, argv.height, argv.height, options.id);

						console.log('runImage:', JSON.stringify(options));
						_matrix.runImage(options.image, options, resolve);
					});
				});

				_socket.emit('i-am-the-provider');
			});

			_socket.on('disconnect', function() {
				console.log('Disconnected from socket server');
			});

			_socket.on('cancel', function(options, fn) {
				_queue.clear();
				_matrix.stop();
				fn({status:'OK'});
			});

			_socket.on('stop', function(options, fn) {
				_queue.clear();
				_matrix.stop();
				fn({status:'OK'});
			});

			_socket.on('text', function(options, fn) {
				options = options || {};

				enqueue(options, function() {
					return new Promise(function(resolve, reject) {

						if (options.fontName)
							options.fontName = sprintf('%s/fonts/%s.ttf', __dirname, options.fontName);

						console.log('runText:', JSON.stringify(options));
						_matrix.runText(options.text, options, resolve);
					});
				})

				fn({status:'OK'});
			});

			_socket.on('animation', function(options, fn) {
				options = options || {};

				enqueue(options, function() {
					return new Promise(function(resolve, reject) {

						try {
							options = options || {};

							options.fileName = options.name;

							// Generate a random one if not specified
							if (options.fileName == undefined) {
								var files = fs.readdirSync(sprintf('%s/animations/%dx%d', __dirname, argv.width, argv.height));
								options.fileName = random(files);
							}
							else {
								options.fileName = sprintf('%s.gif', options.fileName);
							}

							// Add path
							options.fileName = sprintf('%s/animations/%dx%d/%s', __dirname, argv.width, argv.height, options.fileName);

							console.log('runImage:', JSON.stringify(options));
							_matrix.runAnimation(options.fileName, options, resolve);

						}
						catch(error) {
							reject(error);

						}
					});
				});

				fn({status:'OK'});
			});

			_socket.on('clock', function(options, fn) {
				options = options || {};

				enqueue(options, function() {
					return new Promise(function(resolve, reject) {

						options.fileName = options.name;

						// Generate a random one if not specified
						if (options.fileName == undefined) {
							var files = fs.readdirSync(sprintf('%s/images/%dx%d/clocks', __dirname, argv.width, argv.height));
							options.fileName = random(files);
						}
						else {
							options.fileName = sprintf('%s.png', options.fileName);
						}

						// Add path
						options.fileName = sprintf('%s/images/%dx%d/clocks/%s', __dirname, argv.width, argv.height, options.fileName);

						console.log('runClock:', JSON.stringify(options));
						_matrix.runClock(options.fileName, options, resolve);
					});
				});

				fn({status:'OK'});
			});

			_socket.on('emoji', function(options, fn) {
				options = options || {};

				enqueue(options, function() {
					return new Promise(function(resolve, reject) {

						if (!options.id || options.id < 1 || options.id > 846)
							options.id = 704;

						options.image = sprintf('%s/images/%dx%d/emojis/%d.png', __dirname, argv.height, argv.height, options.id);

						console.log('runImage:', JSON.stringify(options));
						_matrix.runImage(options.image, options, resolve);
					});
				});

				fn({status:'OK'});
			});

			_socket.on('rain', function(options, fn) {
				options = options || {};

				enqueue(options, function() {
					return new Promise(function(resolve, reject) {
						console.log('runRain:', JSON.stringify(options));
						_matrix.runRain(options, resolve);
					});

				});

				fn({status:'OK'});
			});

			_socket.on('perlin', function(options, fn) {
				options = options || {};

				enqueue(options, function() {
					return new Promise(function(resolve, reject) {
						console.log('runPerlin:', JSON.stringify(options));
						_matrix.runPerlin(options, resolve);
					});

				});

				fn({status:'OK'});
			});


			_socket.on('hello', function(options, fn) {
				console.log('hello');
				fn({status:'OK'});
			})




		});


	}

	run();

};

new App();
