var Client = function() {
    var socket = io.connect();
    socket.on('connect', function() {
        Client.onConnect();
    });

    socket.on('message', function(msg) {
        console.log(msg);
    });

    socket.on('alert', function(msg) {
        Client.alert(msg);
    });

    // User has received a game challenge
    socket.on('challenge', function(data) {
        console.log(data);
        if (confirm(data.nick + ' has challenged you to a duel! Do you accept?')) {
            Client.joinGame(data.id, data.game);
        }
        else {
            socket.emit('challenge denied', data);
        }
    });

    // both players have registered and game may begin
    socket.on('game ready', function(game_name) {
        console.log(game_name);
    });

    socket.on('disconnect', function() {
        Client.error('disconnected');
    });

    socket.on('error', function(err) {
        Client.error(err);
    });

    // Normal server interaction will just be handled as normal 'messages'.
    // This event type is for handling data that comes in from the Chess server.
    socket.on('chess data', function(data) {
        console.log(data);
    });

    // We received a signal to update the nicklist
    socket.on('nicklist', function(html) {
        $('#sidebar-contents').html(html);
    });

    // Nickname was accepted by server -- show the nicklist
    socket.on('nick complete', function() {
        $('#sidebar #sidebar-contents').show();
        $('#enter-nick').hide();
        $('#thank-you').show();
    });

    return {
        // Set up all DOM events just after socket connects
        'onConnect' : function() {
            $('form[name=username_form]').submit(function(e) {
                e.preventDefault();
                Client.setNick($('input[name=username]').val());
            });

            // $('.nick-name').click(function() {
            //     Client.joinGame($(this).attr('user_id'));
            // });

            // $('#join-game').click(function() {
            //     Client.joinGame($('input[name=game]').val());
            // });

            // $('#start-game').click(function() {
            //     Client.startGame($('input[name=game]').val());
            // });
        },

        // Try to register for a game withe the specified user.
        'joinGame' : function(user_id, game_name) {
            socket.emit('register', {'user_id':user_id, 'game_name':game_name});
        },

        // Try to set the user nickname
        'setNick' : function(nick) {
            nick = $.trim(nick);
            if (nick.length < 1) {
                Client.error('Please enter a nickname.');
            }
            else if (! nick.match(/^[a-z0-9_]+$/i)) {
                Client.error('Invalid chars were in your nickname. REJECTED.');
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
                Client.error('Not a valid move.');
            }
            else {
                socket.emit('make move', {'game':game, 'start':start, 'end':end});
            }
        },

        'error' : function(error) {
            $('#error').html(error);
        },

        'alert' : function(msg) {
            $('#alert').html(msg);
        }

    };
}();
