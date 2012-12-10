A quick and dirty attempt at a real-time Chess site using NodeJS and Socket.IO. The backend server with all the actual chess logic is not included! The chess server I'm using was originally created by kodgehopper for use with the Irssi IRC client, and it resides here: http://irc-chess.sourceforge.net/

NOTE: This is still completely in process.

~~~~~~~~~~~~
INSTALLATION:
~~~~~~~~~~~~

<pre>sudo port install nodejs / sudo apt-get install nodejs / whatever...</pre>
<pre>sudo port install npm / etc...</pre>

<pre>npm install socket.io</pre>
<pre>npm install mustache</pre>

Download kodgehopper's chess server, unpack it and cd into the new directory created. Start the server with:

<pre>java Chess 1234</pre>

... or whatever port you want it to run on in place of 1234.

Then start up the Node server with:

<pre>node chess.js 1234 8090</pre>

The first argument is the Chess server port, so it needs to match whatever port you gave the java command. The second port is for the Node socket, so in the above example you would view the site at "http://localhost:8090".
