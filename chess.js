// First read the ARGS to determine the ports we're running on
// (or just use defaults)
// Note: argv[0] is 'node' and argv[1] is the script name.
var chess_port = process.argv[2] || 1234, // chess server port
    http_port = process.argv[3] || 8090, // webserver port

    // Load standard Node libraries
    http = require('http'),
    net = require('net'),
    fs = require('fs'),

    // Dependencies!!! use npm to get these.
    io = require('socket.io'), // websockets
    // mustache = require('mustache'), // templates

    // Set up other globals we'll need
    socket = net.createConnection(chess_port), // connect to chess server
    users = {}, // to store all connected clients
    games = {}, // to store all the games and the associated client ids
    websocket; // This will store the web connection

socket.on('connect', function() {

    // Connection established to chess server --
    // Now set up connection to webserver
    server = http.createServer(site_router).listen(http_port);

    // Upgrade the HTTP connection to a Websocket
    websocket = io.listen(server);

    // Once we've made a websocket connection...
    websocket.sockets.on('connection', function(client) {

        // Add client to the user object so we can reference it later by id
        users[client.id] = client;

        // Set nickname
        client.on('set nick', function(nick) {
            client.nick = get_unique_nickname(nick, client.id);
            users[client.id].nick = client.nick;
            client.send('Your unique username is: ' + client.nick);
        });

        // Register for a game
        client.on('register', function(game_name) {
            do_chess_command('game register ' + game_name, client);
        });

        // start a game
        client.on('start game', function(game) {
            do_chess_command('game start ' + game, client);
        });

        // Client has attempted to move a piece
        client.on('make move', function(data) {
            do_chess_command('game move ' + data.game + ' ' + data.start + '-' + data.end, client);
        });

        // Receive messages from connected clients
        // client.on('message', function(msg) process_client_message);
        
        client.on('disconnect', function() {
            user_cleanup(client.id);
        });
    });

    // process.stdout.write('Connected!\n\n');

}).on('data', function(data) {
    // Process data received from Chess Server
    process.stdout.write(data + '\n');
}).on('end', function() {
    process.stdout.write('Disconnecting\n');
});

// Process HTTP request and route to correct page
function site_router(req, res) {
    if (req.url.match(/^\/script\/./i)) {
        // if the first piece of the unparsed path indicates a script,
        // load the specified script file from the client-side js folder.
        var file_name = req.url.replace(/^\/script\/([a-z_\-]+)/i, function(match, $1) {
            return $1;
        });
        if (file_name) {
            fs.readFile('client/' + file_name, 'utf8', function(err, data) {
                if (err) return;
                res.writeHead(200, {'Content-Type': 'text/javascript'});
                res.end(data, "utf8");
            });
        }
        else {
            console.log('No valid filename');
        }
    }
    else {
        fs.readFile('templates/login.html', 'utf8', function(err, data) {
            if (err) return;
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data, "utf8");
        });
    }
}

// Check the user list to make sure the nick provided is unique.
function get_unique_nickname(nick, client_id) {
    for (var key in users) {
        if (client_id != key && users[key].nick && users[key].nick == nick) {
            return get_unique_nickname(nick + '_', client_id);
        }
    }
    return nick;
}

// A user disconnected so we need to delete all traces of them
// and send a message to other users they were playing games with
function user_cleanup(id) {
    delete users[id];
}

// All commands to the chess server need the client name at the end.
function do_chess_command(cmd, client) {
    socket.write(cmd + ' ' + (client.nick ? client.nick : client.id));
}

// GENERAL TODO: namespacing sockets would be a good choice.
