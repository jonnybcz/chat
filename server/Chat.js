/**
 * @param {DateFormat} dateFormat
 * @param {MessageType} messageType
 */
Chat = function(dateFormat, messageType){
	this._users = [];
	this._dateFormat = dateFormat;
	this._messageType = messageType;

	this._chatCommand = new Chat.Command(this);
}

Chat.prototype.addUser = function(socket, cookie){
	if (this.existUser(cookie)) {
		var user = this.getUser(cookie);
		var nick = user.getNick();
		user.setSocketId(socket.id); // uzivatel ma novy socket.id
		user.setStatus("online");
	}else{
		var nick = "guest" + this._users.length;
		var cookie = Date.now().toString(); // @todo md5 hash, unikatni

		var user = new User(socket.id);
		user.setNick(nick);
		user.setStatus("online");
		user.setCookie(cookie);

		this._users.push(user);

		socket.emit("setCookie", cookie); // nastavi cookie uzivateli aby se pri refreshi neobjevil znova
	}

	socket.emit("nickWasSet", {nick: nick});
	socket.emit("refreshUsers", this.getUsers());

	socket.broadcast.emit("refreshUsers", this.getUsers());
	socket.broadcast.emit("userEnter", {nick: nick});
}

Chat.prototype.disconnect = function(socket){
	var user = this.getUserOverSocketId(socket.id);
	//user.setStatus("offline");
	socket.broadcast.emit("refreshUsers", this.getUsers());
}

Chat.prototype.existUser = function(cookie){
	for (var i = 0; i < this._users.length; i++) {
		if (this._users[i].getCookie() == cookie) { return true};
	}

	return false;
}

Chat.prototype.getUser = function(cookie){
	for (var i = 0; i < this._users.length; i++) {
		if (this._users[i].getCookie() == cookie) { return this._users[i]};
	}
}

Chat.prototype.getUserOverSocketId = function(socketId){
	for (var i = 0; i < this._users.length; i++) {
		if (this._users[i].getSocketId() == socketId) { return this._users[i]};
	}
}

/**
 * @return {[{}]} [{nick: "jonnyb", id: "xsfsf", status: "available" ... }]
 */
Chat.prototype.getUsers = function(){
	var connectedUsers = [];

	for (var i = 0; i < this._users.length; i++) {
		var publicUserData = {
			status: this._users[i].getStatus(),
			nick: this._users[i].getNick()
		};

		connectedUsers.push(publicUserData);
	}

	return connectedUsers;
}

Chat.prototype.sendMessage = function(socket, data){
	var user = this.getUserOverSocketId(socket.id);

	if (user) { // pokud je otevreny chat v prohlizeci, vypne se a zapne server, tak uzivatel nema aktualni websocket id
		var date = new Date();
		var message = {
			author: user.getNick(),
			text: data.text,
			time: this._dateFormat("GMT:hh:MM:ss")
		};

		message = this._messageType.addType(message);

		socket.broadcast.emit("broadcastMessage", message);
		socket.emit("broadcastMessage", message);
	}else{
		socket.emit("systemMessage", "Zkus refresh prohlížeče ctrl + r");
	}
}
