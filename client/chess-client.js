var Client = function() {
    var socket = io.connect();
    socket.on('connect', function() {
        Client.onConnect();
    });

    socket.on('message', function(msg) {
        console.log(msg);
    });

    socket.on('notify', function(msg) {
        Client.notify(msg);
    });

    // User has received a game challenge
    socket.on('challenge', function(data) {
        if (confirm(data.nick + ' has challenged you to a duel! Do you accept?')) {
            Client.acceptChallenge(data.game);
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
        Client.failure('disconnected');
    });

    socket.on('failure', function(err) {
        Client.failure(err);
    });

    socket.on('board position', function(data) {
        $('#game-arena #board1').html(data.board);
        $('.draggable').draggable({
            'grid' : [50, 50],
            'revert' : 'invalid',
            'containment' : '#' + data.game_name
        });
        $('.droppable').droppable();
        if (data.message) {
            Client.failure(data.message);
        }
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
        },

        // Try to register for a game withe the specified user.
        'joinGame' : function(user_id, game_name) {
            socket.emit('register first', user_id);
        },

        // Accept a challenge
        'acceptChallenge' : function(game_name) {
            socket.emit('register second', game_name);
        },

        // Try to set the user nickname
        'setNick' : function(nick) {
            nick = $.trim(nick);
            if (nick.length < 1) {
                Client.failure('Please enter a nickname.');
            }
            else if (! nick.match(/^[a-z0-9_]+$/i)) {
                Client.failure('Invalid chars were in your nickname. REJECTED.');
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
                Client.failure('Not a valid move.');
            }
            else {
                socket.emit('make move', {'game':game, 'start':start, 'end':end});
            }
        },

        'failure' : function(error) {
            $('#failure').html(error);
        },

        'notify' : function(msg) {
            $('#notify').html(msg);
        }

    };
}();
