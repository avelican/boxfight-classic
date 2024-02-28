/* 
note: this needs Bun, not Node
Big thanks to this static site guide: 
https://medium.com/deno-the-complete-reference/a-beginners-guide-to-building-a-static-file-server-in-bun-9392b4eb0921

TODO: How to run on port 80
https://serverfault.com/questions/112795/how-to-run-a-server-on-port-80-as-a-normal-user-on-linux

(as root)
apt install iptables-persistent
systemctl start iptables
sysctl net.ipv4.ip_forward=1
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
iptables-save > /etc/iptables/rules.v4

WARNING: you must open port 80 in AWS
( if you do not open port 80, you are not going to succeed in the games industry. )


*/
// const PORT = 80;


type bool = boolean;
type str = string;
type num = number;
type i32 = number;
type f32 = number;
type u8 = number;

let DELAY = 0;
DELAY = 1000; // simulate lag

declare var Bun: any;
// TODO: get TS definitions for Bun

const PORT = 3000;
const BASE_PATH = "../client/build";


let game_url_regex = new RegExp("/\\d+"); // "/123" etc


// todo: this is kind of a hack, i'll probably just use nginx 

const CONTENT_TYPES = {
  html: "text/html; charset=utf-8",
  js: "text/javascript;charset=utf-8",
  wasm: "application/wasm",
}

function get_content_type(fileName) {
  if (fileName.endsWith('.js.gz')) return CONTENT_TYPES.js;
  if (fileName.endsWith('.html.gz')) return CONTENT_TYPES.html;
  if (fileName.endsWith('.wasm.gz')) return CONTENT_TYPES.wasm;
  throw "unknown content type"
}

function get_gzip_headers(file) {
  return {
    "Content-Type": get_content_type(file.name),
    "Content-Encoding": "gzip",
  }
}

const MAX_PLAYERS = 256;

// let users = {};
let users: bool[] = []; // why was this an array of "never" ?
users.length = MAX_PLAYERS; // gotta love JS!

let games = {};



// note: disabled until we make a users data structure per-game

// // Note: we'll have a leading slash in the ID (added by new_game_url()) because it's easier
// function make_game_id() {
//   // finds an ID that's not taken
//   const MIN_NUM = 10000000;
//   let num = 0;
//   while (num < MIN_NUM || num in games) // note: JS converts int obj key to str
//     num = Math.floor(Math.random() * MIN_NUM * 10);
//   return String(num);
// }

function has_capacity() {
  for(let i = 0; i < users.length; i++) {
    if ( ! users[i] ) {
      return true
    }
  }
  return false;
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
  return null;
}


// note: disabled until we make a users data structure per-game
// function new_game_url() {
//   // makes an URL to a game ID that's not taken yet
//   return "/" + make_game_id();
// }

async function get_file_gzip(filePath) {
  // return a Bun file object of the gzipped file if it exists, else just the file
  const file = Bun.file(filePath);
  const file_exists = await file.exists();
  if ( ! file_exists ) return null;
  // check for gzip
  const file_gz = Bun.file(filePath + '.gz')
  const file_gz_exists = await file_gz.exists();
  if (file_gz_exists) {
    return file_gz;
  } else {
    return file;
  }
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


    // // Note: Disabled
    // // Note: Formerly, / would forward to e.g. /3809809
    // // Note: But now we want / to alias /1
    // /////////////////
    // // Note: index.html (game client) is overriden; forwards to a new game url (e.g. /12345)
    // //       index.html is served by a game url (below)
    // if (path === "/" || path === "/index.html") {
    //   return Response.redirect(new_game_url(), 302);
    // }


    if (! has_capacity()) { 
      return new Response("Sorry, server is full. Please come back later!", { status: 503 });
    }


    // user navigates to game url e.g. /1235678
    // if (path === "/" || game_url_regex.test(path)) {
    if (path === "/" ) { // note game rooms disabled untl we fix users data structure

      console.log('NOTE: GAME URL');
      // is this a ws request?
      const game_path = ( path === "/") ? "/1" : path; // make / behave as /1
      const upgradeOptions = { data: { game: game_path } };
      if ( server.upgrade(req, upgradeOptions )) {
        console.log('NOTE: UPGRADED WEBSOCKET REQUEST');
        return; // do not return a Response
      }

      // else http(s): serve game client
      console.log('NOTE: HTTP REQ: SERVING CLIENT');
      let index_path = BASE_PATH + '/index.html';
      // const index_file = Bun.file(index_path);
      // const index_exists = await index_file.exists(); // boolean;
      const index_file = await get_file_gzip(index_path)
      if (index_file === null) {
        console.error('CRITICAL ERROR: index.html is missing!');
        // todo call my phone lmao
        return new Response("Game is offline. Sorry!", { status: 503 });
      }

      let index_resp_headers = {}
      if (index_file.name.endsWith('.gz')) { // todo refactor / integrate with the gzip loader code?
        index_resp_headers = get_gzip_headers(index_file)
      } else {
        console.warn('index file name: ' + index_file.name)
      }
      console.log(index_resp_headers)
      return new Response(index_file, {headers:index_resp_headers});
    }

    // else: default: load a static file (e.g. js, sounds)
    let filePath = BASE_PATH + path; // pathname has leading slash
    console.log(filePath);


    // const file = Bun.file(filePath);
    // const exists = await file.exists(); // boolean;
    const file = await get_file_gzip(filePath);
    if (!file) { 
      return new Response("Error: File not found.", { status: 404 });
    }

    let file_resp_headers = {}
    if (file.name.endsWith('.gz')) { // todo refactor / integrate with the gzip loader code?
      file_resp_headers = get_gzip_headers(file)
    }
    
    return new Response(file, {headers:file_resp_headers});
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

      if (DELAY == 0) { // can I avoid duplication here?
        ws.publish(ws.data.game, `MSG ${user_id} ${msg}`)
      } else {
        setTimeout(() =>
          ws.publish(ws.data.game, `MSG ${user_id} ${msg}`),
        DELAY);
      }
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
