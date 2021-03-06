var app = require('http').createServer(handler)
var io = require('socket.io').listen(app)
var fs = require('fs')
var url = require('url')
var dateFormat = require('dateformat')

require('./server/Chat.js');
require('./server/ChatCommand.js');
require('./server/User.js');
require('./server/MessageType.js');

app.listen(parseInt(process.argv[2], 10) || 3300);

function returnFile(row, res, statusCode){
	var file = fs.readFileSync(__dirname + "/client" + (row.file || row.action));
	res.writeHead(statusCode, {"Content-Type": row.contentType });
	res.end(file, row.type);
}

function handler (req, res) {
	var request = url.parse(req.url, true);
	var action = request.pathname;
	var files = [
		{action: "/", contentType: "text/html", type: "text", file: "/index.html"},
		{action: "/js/chat.js", contentType: "text/javascript", type: "text"},
		{action: "/img/water.png", contentType: "image/png", type: "binary"},
		{action: "/css/screen.css", contentType: "text/css", type: "text"},
		{action: "/error.html", contentType: "text/html", type: "text"}
	];

	for (var i = 0; i < files.length; i++) {
		if (files[i].action == action) { returnFile(files[i], res, 200); break; };
		if (i == files.length - 1) { returnFile(files[i], res, 404); };
	}
}

var messageType = new MessageType();
var chat = new Chat(dateFormat, messageType);
var chatCommand = new Chat.Command(chat);

io.sockets.on("connection", function (socket) {

	socket.on("connect", chat.addUser.bind(chat, socket));
	socket.on("disconnect", chat.disconnect.bind(chat, socket));
	socket.on("message", function(message){
		if (chatCommand.isCommand(message.text)) {
			chatCommand.parse(message.text, socket);
		}else{
			chat.sendMessage(socket, message);
		}
	});
});
