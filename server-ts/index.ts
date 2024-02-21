/* 
note: this needs Bun, not Node
Big thanks to this static site guide: 
https://medium.com/deno-the-complete-reference/a-beginners-guide-to-building-a-static-file-server-in-bun-9392b4eb0921

TODO: How to run on port 80
https://serverfault.com/questions/112795/how-to-run-a-server-on-port-80-as-a-normal-user-on-linux
*/
// const PORT = 80;

const PORT = 3000;
// const BASE_PATH = "../client";
const BASE_PATH = "../client-odin/build";

let game_url_regex = new RegExp("/\\d+"); // "/123" etc

// let users = {};
let users = [];
users.length = 32; // gotta love JS!
let games = {};


// Note: we'll have a leading slash in the ID (added by new_game_url()) because it's easier
function make_game_id() {
  // finds an ID that's not taken
  const MIN_NUM = 10000000;
  let num = 0;
  while (num < MIN_NUM || num in games) // note: JS converts int obj key to str
    num = Math.floor(Math.random() * MIN_NUM * 10);
  return String(num);
}

function make_user_id() {
  // find first empty slot
  // note: previously we did users.length = MAX_PLAYERS
  // unset values are undefined, which is falsey
  for(let i = 0; i < users.length; i++) {
    if ( ! users[i] ) {
      users[i] = true;
      return i;
    }
  }
}

function new_game_url() {
  // makes an URL to a game ID that's not taken yet
  return "/" + make_game_id();
}

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    console.log('\n\nFETCH');
    // console.log(server.requestIP(req));
    // console.log(req);
    const url = new URL(req.url);
    const path = url.pathname;
    console.log(path);

    // Note: index.html (game client) is overriden; forwards to a new game url (e.g. /12345)
    //       index.html is served by a game url (below)
    if (path === "/" || path === "/index.html") {
      return Response.redirect(new_game_url(), 302);
    }


    // user navigates to game url e.g. /1235678
    if (game_url_regex.test(path)) {
      console.log('NOTE: GAME URL');
      // is this a ws request?
      const upgradeOptions = { data: { game: path } };
      if ( server.upgrade(req, upgradeOptions )) {
        console.log('NOTE: UPGRADED WEBSOCKET REQUEST');
        return; // do not return a Response
      }

      // else http(s): serve game client
      console.log('NOTE: HTTP REQ: SERVING CLIENT');
      let index_path = BASE_PATH + '/index.html';
      const index_file = Bun.file(index_path);
      const index_exists = await index_file.exists(); // boolean;
      if (!index_exists) {
        console.error('CRITICAL ERROR: index.html is missing!');
        // todo call my phone lmao
        return new Response("Game is offline. Sorry!", { status: 503 });
      }
      return new Response(index_file);
    }

    // else: default: load a static file (e.g. js, sounds)
    let filePath = BASE_PATH + path; // pathname has leading slash
    console.log(filePath);


    const file = Bun.file(filePath);
    const exists = await file.exists(); // boolean;
    if (!exists) { 
      return new Response("Error: File not found.", { status: 404 });
    }
    return new Response(file);
  },



  websocket: {
    open(ws) {
      console.log('\n\nWEBSOCKET OPENED!');
      console.log('ip: ' + ws.remoteAddress);
      // TODO: how can I tell which path ws was opened FROM? // origin header
      console.log(ws);
      console.log(ws.data);

      if (typeof ws.data === "undefined" || typeof ws.data.game === "undefined") {
        console.error("CRITICAL ERROR: data.game was not set during WS upgrade!");
        return;
      }

      // TODO: does the player get a different userid every time it disconnects?
      // EDIT: does it matter? as long as dead players get cleaned up in close()
      // UPDATE: no, gets the same one on refresh (the first available), (assuming connection closed properly)
      const user_id = make_user_id();
      ws.data.user_id = user_id;
      ws.send('USERID ' + user_id); // notify new player of own id
      console.log('sent USERID ' + user_id);

      const game_id = ws.data.game;

      ws.subscribe(game_id);

      if(typeof games[game_id] === "undefined") {
        // new game
        games[game_id] = {};
        games[game_id].players = {};
      } else {
        // game exists, tell player who's in it
        const players = games[game_id].players;
        for (let id in players) {
          ws.send("JOIN " + id)
        }
      }
      games[game_id].players[user_id] = true;

      ws.publish(game_id, "JOIN " + user_id); // notify other players
      
    },
    close(ws){
      const user_id = ws.data.user_id;
      const game_id = ws.data.game;
      const msg = `LEAVE ${user_id}`;
      server.publish(game_id, msg);
      ws.unsubscribe(game_id);
      delete users[user_id]; // sets this array index to undefined
      delete games[game_id].players[user_id]
    },
    message(ws, msg) {
      const user_id = ws.data.user_id;
      console.log(`msg from ${user_id}: ${msg}`);
      ws.publish(ws.data.game, `MSG ${user_id} ${msg}`);
    },
    error(ws){
      // TODO: does this mean it's broken / should be closed? 
      //       Or will fatal errors trigger close automatically?
      //           If so, what's this for? What are nonfatal WS errors?
    },
    drain(ws){
      // TODO: ??? backpressure ???
    },   
  },
});

console.log(`Listening on localhost:${server.port}`);