var http = require ('http'),
	filesystem = require ('fs'),
	io = require ('socket.io'), // for npm, otherwise use require ('./path/to/socket.io') 
	net = require ('net'),

server = http.createServer (function (req, res) {
	var file = req.url.toString ();
	if (file == "/")
		file = "index.html";
	else
		file = file.substr (1);
	filesystem.readFile (file, req.url.length - 1, function (err, data) {
		if (err) {
			res.writeHead (404,  {'Content-Type': 'text/html'});
			res.end ("file not found");
		} else {
			res.writeHead (200,  {'Content-Type': 'text/html'});
			res.end (data);
		}
	});
});
server.listen (8080);
  
// socket.io 
var wsService = io.listen (server); 
wsService.on ('connection', function (client) { 
	// new client is here! 
	client.on ('message', function () { log (server); }) 
	client.on ('disconnect', function () { log (server); }) 
}); 
wsService.on ('error', function (client) {
  process.stdout.write ('WebSocket connection error\n');
});

tcpService = net.createServer (function (socket)  {
	process.stdout.write ('new connection\n');
	socket.on ('data', function (data)  {
		process.stdout.write (data + '\n');
	});
	socket.on ('error', function (c) {
		process.stdout.write ('connection error: ' + c + '\n');
		tcpService.close ();
		tcpService.listen (9801);
	});
});
tcpService.listen (9801);
