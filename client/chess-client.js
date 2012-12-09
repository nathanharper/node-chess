var Client = function() {
    var socket = io.connect();
    socket.on('connect', function() {
        Client.onConnect();
    });

    socket.on('message', function(msg) {
        console.log(msg);
    });

    socket.on('disconnect', function() {
    });

    socket.on('error', function(err) {
        console.log("ERROR: " + err);
    });

    // Normal server interaction will just be handled as normal 'messages'.
    // This event type is for handling data that comes in from the Chess server.
    socket.on('chess data', function(data) {
        console.log(data);
    });

    return {
        // Set up all DOM events just after socket connects
        'onConnect' : function() {
            $('form[name=username_form]').submit(function(e) {
                e.preventDefault();
                Client.setNick($('input[name=username]').val());
            });

            $('#join-game').click(function() {
                Client.joinGame($('input[name=game]').val());
            });
        },

        // Try to register for the specified game
        'joinGame' : function(game) {
            if (!game || game.length < 1) {
                alert('You must enter the name of the game you wish to join.');
            }
            else {
                socket.emit('register', game);
            }
        },

        // Try to set the user nickname
        'setNick' : function(nick) {
            if (nick.length < 1) {
                alert('Please enter a nickname.');
            }
            else {
                socket.emit('set nick', nick);
            }
        },

        // Start a game
        'startGame' : function(game) {
            if (!game) return;
            socket.emit('start game', game);
        },

        // Make a move
        'makeMove' : function(game, start, end) {
            if (!game || !start || !end) {
                alert('Not a valid move.');
            }
            else {
                socket.emit('make move', {'game':game, 'start':start, 'end':end});
            }
        }
    };
}();
