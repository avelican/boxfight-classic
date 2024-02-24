
// mergeInto(LibraryManager.library, {
// 	hello: function() {
// 		Module.print('hello from lib!');
// 		Module.print('websocket: ' + websocket);
// 	}
// });

mergeInto(LibraryManager.library, {
	send_player_pos: function(x,y) {
		// Module.print('send player pos: ' + x + ', ' + y);
		sendMessage(`POS ${x} ${y}`);
	},

	send_player_died: function() {
		// Module.print('send player pos: ' + x + ', ' + y);
		sendMessage(`DIED`);
	},
	
	net_send_respawn: function() {
		// Module.print('send player pos: ' + x + ', ' + y);
		sendMessage(`RSPN`);
	},
	

	net_send_bullet: function(idx,x,y,dx,dy) {
		// Module.print('send player pos: ' + x + ', ' + y);
		sendMessage(`BLT ${idx} ${x} ${y} ${dx} ${dy}`);
	},	

	net_send_bullet_died: function(idx) {
		// Module.print('send player pos: ' + x + ', ' + y);
		sendMessage(`BLT_X ${idx}`);
	},

	connect_websocket: function() {
		Module.print('connect_websocket');
		connectWebSocket()
	},
	play_sound: function(snd_id) {
		playSound(snd_id);
	},
	you_died: function() {
		youDied();
	}

});

