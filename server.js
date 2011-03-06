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
wsService.on ('clientConnect', function (client) { process.stdout.write ('new WebSocket client\n'); current_client = client; });
wsService.on ('clientDisconnect', function (client) { process.stdout.write ('WebSocket client disconnected\n'); });
wsService.on ('clientMessage', function (data, client) { process.stdout.write ('somehow received message from client: ' + data + '\n'); }); 
wsService.on ('error', function (client) { process.stdout.write ('WebSocket client error\n'); });

var current_client = null;

var last = new Date ();

tcpService = net.createServer (function (socket)  {
	process.stdout.write ('new connection\n');
	socket.on ('data', function (data)  {
		process.stdout.write ('new data' + data + '\n');
		try {
			JSON.parse (data);
		} catch (e) {
			return; // bogus input
		}
		//if (current_client != null && new Date () - last > 1000) // 1msg / 1sec.
		//	client.send (JSON.stringify (JSON.parse (data)));
		if (new Date () - last > 1000) // 1msg / 1sec.
			wsService.broadcast (JSON.stringify (JSON.parse (data)));
	});
	socket.on ('error', function (c) {
		process.stdout.write ('connection error: ' + c + '\n');
		tcpService.close ();
		tcpService.listen (9801);
	});
});
tcpService.listen (9801);
