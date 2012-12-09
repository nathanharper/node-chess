// First read the ARGS to determine the ports we're running on
// (or just use defaults)
var chess_port = process.argv[2] || 1234, // chess server port
    http_port = process.argv[3] || 8090, // webserver port

    // Load standard Node libraries
    http = require('http'),
    net = require('net'),
    fs = require('fs'),

    // Dependencies!!! use npm to get these.
    io = require('socket.io'), // websockets
    mustache = require('mustache'), // templates

    // Set up other globals we'll need
    socket = net.createConnection(chess_port), // connect to chess server
    users = [], // array to store all connected clients
    websocket; // This will store the web connection

socket.on('connect', function() {

    // Connection established to chess server --
    // Now set up connection to webserver
    server = http.createServer(site_router).listen(http_port);

    // Upgrade the HTTP connection to a Websocket
    websocket = io.listen(server);

    // Once we've made a websocket connection...
    websocket.sockets.on('connection', function(client) {
        // client.send('FECK ARSE');

        // Receive messages from connected clients
        client.on('message', function(msg) {
            console.log('received: ' + msg);
        }).on('disconnect', function() {
            // TODO: disconnect
        });
    });

    process.stdout.write('Connected!\n\n');

    // process.stdin.resume();
    // process.stdin.setEncoding('utf8');

    // // Read input from STDIN and write to Chess server
    // process.stdin.on('data', function (chunk) {
    //     socket.write(chunk);
    // });
}).on('data', function(data) {
    // Write data received from Chess Server to STDOUT
    process.stdout.write(data + '\n\n');
}).on('end', function() {
    process.stdout.write('Disconnecting\n');
});

// Process HTTP request and route to correct page
function site_router(req, res) {
    // var url = req.url.substr(1);
    fs.readFile('templates/login.html', 'utf8', function(err, data) {
        if (err) return;
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(mustache.render(data, {'http_port' : http_port}), "utf8");
    });
}
