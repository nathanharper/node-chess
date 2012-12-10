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
    mustache = require('mustache'), // templates

    // Set up other globals we'll need
    socket = net.createConnection(chess_port), // connect to chess server
    users = {}, // to store all connected clients
    nicks = {}, // Just a quick lookup to get user ids by name
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
            nicks[nick] = client.id;
            client.emit('nick complete');

            update_nicklist(); // Once client has registered a username, update everybody's nicklist
        });

        // Register for a game.
        // The parameter is the id of the opponent.
        // The second registrant will also send us the game_name
        client.on('register', function(data) {

            if (!data.game_name) {
                data.game_name = client.id + '__' + data.user_id; // I'm guessing that this will probably be "good enough" 
                // users[data.user_id].emit('challenge', {'nick':client.nick, 'id':client.id});

                socket.write(
                    'game register ' + data.game_name + ' ' + (client.nick ? client.nick : client.id),
                    function() {
                        // Make a record of a new game.
                        // 1 indicates that the user has registered, 0 if not.
                        games[data.game_name] = {};
                        games[data.game_name][client.id] = 1;
                        games[data.game_name][data.user_id] = 0;

                        client.emit('alert', 'A challenge has been sent to ' + users[data.user_id].nick + '!');
                        users[data.user_id].emit(
                            'challenge',
                            {'nick':client.nick, 'id':client.id, 'game':data.game_name}
                        );
                    } 
                );
            }
            else {
                socket.write(
                    'game register ' + data.game_name + ' ' + (client.nick ? client.nick : client.id),
                    function() {
                        games[data.game_name][client.id] = 1;
                        socket.write('game start ' + data.game_name + ' ' + users[data.user_id].nick);
                    } 
                );
            }

            // do_chess_command(, client);

        });

        // start a game
        // client.on('start game', function(game) {
        //     do_chess_command('game start ' + game, client);
        // });

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

}).on('end', function() {
    process.stdout.write('Disconnecting\n');
}).on('data', function(data) {

    /**
     * [chrome]It is your move
     * <:=:>[fox]It is chrome's move
     * <:=:>White moves first
     **/
    // [fox]It is your move
    // [chrome]It is fox's move
    // White moves first
    //  8 <BYELLOW><bBLACK> R <BBLUE><bBLACK> H <BYELLOW><bBLACK> B <BBLUE><bBLACK> Q <BYELLOW><bBLACK> K <BBLUE><bBLACK> B <BYELLOW><bBLACK> H <BBLUE><bBLACK> R <NORMAL>
    //  7 <BBLUE><bBLACK> P <BYELLOW><bBLACK> P <BBLUE><bBLACK> P <BYELLOW><bBLACK> P <BBLUE><bBLACK> P <BYELLOW><bBLACK> P <BBLUE><bBLACK> P <BYELLOW><bBLACK> P <NORMAL>
    //  6 <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <NORMAL>
    //  5 <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <NORMAL>
    //  4 <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <NORMAL>
    //  3 <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <BBLUE>   <BYELLOW>   <NORMAL>
    //  2 <BYELLOW><bWHITE> P <BBLUE><bWHITE> P <BYELLOW><bWHITE> P <BBLUE><bWHITE> P <BYELLOW><bWHITE> P <BBLUE><bWHITE> P <BYELLOW><bWHITE> P <BBLUE><bWHITE> P <NORMAL>
    //  1 <BBLUE><bWHITE> R <BYELLOW><bWHITE> H <BBLUE><bWHITE> B <BYELLOW><bWHITE> Q <BBLUE><bWHITE> K <BYELLOW><bWHITE> B <BBLUE><bWHITE> H <BYELLOW><bWHITE> R <NORMAL>
    //     a  b  c  d  e  f  g  h

    // Split up the data on newlines and the weird delimiter thing
    // that the chess server uses ( <:=:> )
    var parts = data.split(/(?:\<\:\=\:\>|\n)+/);

    if (parts.length > 1) {

        var fixed_str,
            counter = 8,
            players = [],
            matches,
            messages = [],
            client,
            params = {
                'rows' : [],
                'square' : render_board_row,
                'count' : function() {
                    return function(text, render) {
                        return counter--;
                    };
                }
            };

        // We received a board position!
        for (var key in parts) {
            if (parts[key].length) {
                if (parts[key].substr(0,1) == '[') {
                    matches = /^\[([^\]]+)\](.*)$/g.exec(parts[key]);
                    if (matches && matches[1] && matches[2]) {
                        client = get_user_by_nick(matches[1]);
                        if (client) {
                            // client.emit('alert', matches[2]);
                            players.push(client);
                            messages[client.nick] = matches[2];
                        }
                    }
                }
                else if (parts[key].match(/^\s\d/)) {
                    // Must be a board row
                    // render_board_row(parts[key]);
                    fixed_str = parts[key].substr(3).replace('<NORMAL>', '');
                    params.rows.push(fixed_str.match(/<(?:BYELLOW|BBLUE)>(?:<b(?:WHITE|BLACK)>\s[A-Z])?/g));
                }
                else {
                    // some stuff we don't care about
                }
            }
        }

        // Render the board with Mustache and send both users the board / message
        fs.readFile('templates/board.html', 'utf8', function(err, html) {
            if (err) return;
            html = mustache.render(html, params);
            for (var i in players) {
                players[i].emit('board position', {'board':html, 'message':messages[players[i].nick]});
            }
        });
    }
}).setEncoding('utf8');

// Function for use in mustache templates -- converts Chess format to HTML
function render_board_row() {
    return function(text, render) {
        var str = '<td class="',
            attr;
        if (text.indexOf('<BYELLOW>') >= 0) {
            str += 'yellow">';
        } else {
            str += 'blue">';
        }

        attr = /<b(WHITE|BLACK)> ([A-Z])/.exec(text);
        if (attr && attr[1] && attr[2]) {
            str += '<div class="piece ' + attr[1] + '-' + attr[2] + '"></div>';
        }

        str += '</td>';
        return str;
    };
}

// Use the nicks list to lookup the actual user
function get_user_by_nick(nick) {
    if (nicks[nick]) {
        return users[nicks[nick]] || false;
    }
    return false;
}

// Process HTTP request and route to correct page
function site_router(req, res) {
    if (req.url.match(/^\/script\/./i)) {
        // if the first piece of the unparsed path indicates a script,
        // load the specified script file from the client-side js folder.
        var file_name = req.url.replace(/^\/script\/([a-z_\-\.]+)/i, function(match, $1) { return $1; });
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
    else if (req.url.match(/^\/image\/./i)) {
        // Load images
        // This regex gets the file name and the extension
        var img = req.url.replace(/^\/image\/([a-z_\-]+)\.([a-z]+)/i, function(str, $1, $2) { 
            return {'name':$1, 'ext':$2}; 
        });
        fs.readFile('images/' + img.name + '.' + img.ext, 'binary', function(err, data) {
            if (err) return;
            res.writeHead(200, {'Content-Type': 'image/' + img.ext});
            res.end(data, 'binary');
        });
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
    for (var key in games) {
        if (games[key][id]) {
            delete games[key][id];
        }
    }
}

// All commands to the chess server need the client name at the end.
function do_chess_command(cmd, client) {
    socket.write(cmd + ' ' + (client.nick ? client.nick : client.id), 'utf8', callback);
}

// CALLBACKS -- the following functions are for handling data returned by the chess server.
function register_callback(data) {
    // EX:
    // [chrome]registered as player 1 for game aWqZEU2Z4ASd2ely1YSc__g8BXuRxVI-6DaSxk1YSb. You are White
}
function start_callback(data) {
}

// Update nicklist for all clients
function update_nicklist() {
    var html = '';
    for (var key in users) {
        if (users[key].nick) {
            html += '<a href="javascript:void(0);"'
                + 'onclick="Client.joinGame(\'' + key + '\');"' 
                + ' class="nick-name" >' + 
                users[key].nick 
                + '</a><br />';
        }
    }
    websocket.sockets.emit('nicklist', html);
    // fs.readFile('templates/nicklist.html', 'utf8', function(err, html) {
    //     if (err) return;
    //     // html = mustache.render(html, {'users':websocket.sockets, 'games':games});

    //     // For now, just emit the same thing to all clients --
    //     // later we can figure out a way to tailor the unique html.
    //     websocket.sockets.emit('nicklist', html);
    // });
}

// GENERAL TODO: namespacing sockets would be a good choice.
