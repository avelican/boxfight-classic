type bool = boolean;
type str = string;
type num = number;
type i32 = number;
type f32 = number;
type u8 = number;

function u8(x:any):u8 {
	return x as u8
}

function i32(x:any):i32 {
	return x as i32
}

function f32(x:any):f32 {
	return x as f32
}

/////
/// more types

interface Vector2 {
	x: f32,
	y: f32,
}

function Vector2(x: f32, y: f32) : Vector2 {
	return {x,y}
}

function Vector2Normalize(vector: Vector2) : Vector2 {
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude === 0) {
        return { x: 0, y: 0 };
    }
    return { x: vector.x / magnitude, y: vector.y / magnitude };
}

function Vector2TimesScalar(v: Vector2, s: f32) : Vector2 {
	return {x: v.x * s, y: v.y * s}
}

///////////////////
function InitArrayWithSize(array: any[], size: i32, constructor: Function) {
	for(let i = 0; i < size; i ++) {
		array[i] = constructor()
	}
}
//////////////////

// DOM / Canvas / Input

let canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
// let context = canvas.getContext("2d", { alpha: true });
let context = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;

const MOUSE_LEFT = 0;
const MOUSE_MIDDLE = 1;
const MOUSE_RIGHT = 2;

interface MouseButtonMap {
    [key: num]: bool;
}

const Mouse = {
	x: -1,
	y: -1,
	moved: false,
	down: <MouseButtonMap>{},
	pressed: <MouseButtonMap>{}, // a button is pressed only for one frame
};

// NOTE: mouse button 0 = left
// NOTE: mouse button 1 = middle
// NOTE: mouse button 2 = right


window.addEventListener("mousemove", function(event){
	Mouse.moved = true;
	
	let x = event.clientX - canvas.offsetLeft;
	let y = event.clientY - canvas.offsetTop;
	
	// x /= SCALE; // TODO
	// y /= SCALE;

	Mouse.x = x;
	Mouse.y = y;
});

// prevent right click menu
window.addEventListener("contextmenu", function(event){ event.preventDefault(); return false;})

window.addEventListener("mousedown", function(event){ 
	Mouse.pressed[event.button] = true;
	Mouse.down[event.button] = true;
});

window.addEventListener("mouseup",   function(event){ 
	Mouse.down[event.button] = false;
});

interface KbdButtonMap {
    [key: str]: bool;
}

// TODO rename to Kbd
const Keyboard = 
{
	down: <KbdButtonMap>{},
	pressed: <KbdButtonMap>{}, // a button is pressed only for one frame
};

window.addEventListener("keydown", function(event){
	// TODO: we can also use event.code 
	// for more precise info,
	// such as which AltLeft instead of Alt... but yea
	Keyboard.down[event.key] = true;
	Keyboard.pressed[event.key] = true;
	// Game.keydown(event.key); // legacy
});

window.addEventListener("keyup", function(event){
	Keyboard.down[event.key] = false;
});


// todo useless
function IsKeyDown(key: str) : bool {
	return !!Keyboard.down[key]; // note: !! converts undefined to false
}

function GetTimeMs() {
	return Date.now()
}

function GetTimeSec() {
	return Date.now() / 1000
}

let secondTimer : f32 = 0; // debug

let _time_prev : f32 = 0;
let _frame_time : f32 = 0;
// let _frame_time_prev : f32 = 0; // TODO: unused?

// let timer: f32; // This gave NaN. TypeScript didn't catch it. Sad.
let timer: f32 = 0;

let shootTimer : f32 = 0
let shootDelay: f32 = 100

let net_send_interval: i32 = 1 // each frame.. 30 fps was awful!

let net_send_interval_counter: i32 = 0


const DEATH_TIME = 4000

let deathTimer : f32 = 0

const PLAYER_WIDTH = 32
const PLAYER_HEIGHT = 32

const SCREEN_WIDTH = 800
const SCREEN_HEIGHT = 600

// Player :: struct {
// 	x: i32,
// 	y: i32,
// 	color: Color,
// 	alive: bool,
// 	life: i32,
// 	exists: bool,
// }

interface Color {
	r: u8,
	g: u8,
	b: u8,
	a: u8,
}

function Color(r: u8, g: u8, b: u8, a: u8) : Color {
	return { r, g, b, a	}
}

const COLOR_ZERO = Color(0,0,0,0);
const COLOR_YELLOW = Color( 253, 249, 0, 255 );

function StupidAlpha(a: i32) : str {
	return `${Math.floor(a * 100 / 255)}%`
}

function SetFillStyle(color: Color) : void {
	const {r,g,b} = color
	const a = StupidAlpha(color.a)
	context.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
}

function ClearBackground(color: Color) : void {
	SetFillStyle(color);

	context.clearRect(0,0, SCREEN_WIDTH, SCREEN_HEIGHT) // unnecessary?
	context.fillRect(0,0, SCREEN_WIDTH, SCREEN_HEIGHT)
}

interface Rect {
	x: f32,
	y: f32,
	w: f32,
	h: f32,
}

function Rect(x: f32, y: f32, w: f32, h: f32) : Rect {
	return {x,y,w,h}
}

// thank you kind sir https://www.jeffreythompson.org/collision-detection/rect-rect.php
function rectRect(r1: Rect, r2: Rect) : bool {
	return (r1.x + r1.w >= r2.x &&    // r1 right edge past r2 left
	r1.x <= r2.x + r2.w &&    // r1 left edge past r2 right
	r1.y + r1.h >= r2.y &&    // r1 top edge past r2 bottom
	r1.y <= r2.y + r2.h);    // r1 bottom edge past r2 top
}

// todo rename to DrawRect
function DrawRectangle(r: Rect, color: Color) : void {
	SetFillStyle(color)
	const {x,y,w,h} = r
	context.fillRect(x,y,w,h);
}

function DrawRectangleArgs(x: i32, y: i32, w: i32, h: i32, color: Color) : void {
	SetFillStyle(color)
	context.fillRect(x,y,w,h);
}

function DrawText(text: str, x: i32, y: i32, textSize: i32, color: Color) : void {
	// TODO implement my own text renderer
	// context.font = `${textSize}px sans-serif`
	SetFillStyle(color)
	context.font = `${textSize}px monospace`
	context.fillText(text, x, y);
}

///////////////////////////



// TODO clean up

function send_player_pos(x: i32, y: i32) : void {
	// Module.print('send player pos: ' + x + ', ' + y);
	sendMessage(`POS ${x} ${y}`);
}

function send_player_died() : void{
	// Module.print('send player pos: ' + x + ', ' + y);
	sendMessage(`DIED`);
}

function net_send_respawn() : void {
	// Module.print('send player pos: ' + x + ', ' + y);
	sendMessage(`RSPN`);
}

function net_send_bullet(idx: i32, x: i32, y: i32, dx: i32, dy: i32) : void {
	// Module.print('send player pos: ' + x + ', ' + y);
	sendMessage(`BLT ${idx} ${x} ${y} ${dx} ${dy}`);
}

function net_send_bullet_died(idx: i32) : void {
	// Module.print('send player pos: ' + x + ', ' + y);
	sendMessage(`BLT_X ${idx}`);
}

function connect_websocket() : void {
	// Module.print('connect_websocket');
	connectWebSocket()
}

// function playSound(snd_id: i32) : void {
// 	playSound(snd_id);
// }

function you_died() : void {
	youDied();
}


declare class SamJs {
	constructor(x:any)
	speak(s:str): void
}

declare class Sfxr {
	toAudio(x:any):any;
}

declare var sfxr: Sfxr;


let sam = new SamJs({pitch:200});
let samDeep = new SamJs({pitch:142, speed:132});

// function playSound(id) {
// 	console.log('id ' + id)
// 	const sfx = getSfxById(id); // defined in jsfxr_presets.js
// 	// @ts-ignore
// 	sfx.play();
// }

function playSound(sfx: any) {
	// @ts-ignore
	sfx.play();
}


///////////////////////////////////
// sorry
// TODO fixme

interface sfx {
	PLAYER_DEATH: any,
	ENEMY_DEATH: any,
	EXPLOSION: any,
	EXPLOSION_SHORT: any,
	HURT: any,
}

const SFX = {
	PLAYER_DEATH: null,
	ENEMY_DEATH: null,
	EXPLOSION: null,
	EXPLOSION_SHORT: null,
	HURT: null,
};

const JSFXR_PLAYER_DEATH = {
  "oldParams": true,
  "wave_type": 3,
  "p_env_attack": 0,
  "p_env_sustain": 0.146,
  "p_env_punch": 0.34,
  "p_env_decay": 0.682,
  "p_base_freq": 0.29191116671533823,
  "p_freq_limit": 0,
  "p_freq_ramp": -0.171,
  "p_freq_dramp": 0,
  "p_vib_strength": 0,
  "p_vib_speed": 0,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 0,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0,
  "p_pha_offset": 0,
  "p_pha_ramp": 0,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0,
  "p_hpf_ramp": 0,
  "sound_vol": 0.25,
  "sample_rate": 11025,
  "sample_size": 8
}

SFX.PLAYER_DEATH = sfxr.toAudio(JSFXR_PLAYER_DEATH);
// SFX.PLAYER_DEATH.play();

const JSFXR_ENEMY_DEATH = {
  "oldParams": true,
  "wave_type": 3,
  "p_env_attack": 0,
  "p_env_sustain": 0.146,
  "p_env_punch": 0.34,
  "p_env_decay": 0.516,
  "p_base_freq": 0.29191116671533823,
  "p_freq_limit": 0,
  "p_freq_ramp": -0.217,
  "p_freq_dramp": 0,
  "p_vib_strength": 0,
  "p_vib_speed": 0,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 0,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0,
  "p_pha_offset": 0,
  "p_pha_ramp": 0,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0,
  "p_hpf_ramp": 0,
  "sound_vol": 0.25,
  "sample_rate": 11025,
  "sample_size": 8
}

SFX.ENEMY_DEATH = sfxr.toAudio(JSFXR_ENEMY_DEATH);

const JSFXR_EXPLOSION = {
  "oldParams": true,
  "wave_type": 3,
  "p_env_attack": 0,
  "p_env_sustain": 0.13319494246236924,
  "p_env_punch": 0.6648364348154416,
  "p_env_decay": 0.12139456795379933,
  "p_base_freq": 0.03665698130227344,
  "p_freq_limit": 0,
  "p_freq_ramp": 0.08502019811512262,
  "p_freq_dramp": 0,
  "p_vib_strength": 0.5274586566235788,
  "p_vib_speed": 0.43123974849995844,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 0,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0.6773385022526437,
  "p_pha_offset": -0.2588846618005372,
  "p_pha_ramp": -0.19861840639250428,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0,
  "p_hpf_ramp": 0,
  "sound_vol": 0.25,
  "sample_rate": 44100,
  "sample_size": 8
}


SFX.EXPLOSION = sfxr.toAudio(JSFXR_EXPLOSION);

const JSFXR_EXPLOSION_SHORT = {
  "oldParams": true,
  "wave_type": 3,
  "p_env_attack": 0,
  "p_env_sustain": 0.13319494246236924,
  "p_env_punch": 0.285,
  "p_env_decay": 0.365,
  "p_base_freq": 0.03665698130227344,
  "p_freq_limit": 0,
  "p_freq_ramp": 0.08502019811512262,
  "p_freq_dramp": 0,
  "p_vib_strength": 0.5274586566235788,
  "p_vib_speed": 0.43123974849995844,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 0,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0.6773385022526437,
  "p_pha_offset": -0.2588846618005372,
  "p_pha_ramp": -0.19861840639250428,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0,
  "p_hpf_ramp": 0,
  "sound_vol": 0.25,
  "sample_rate": 44100,
  "sample_size": 8
}

SFX.EXPLOSION_SHORT = sfxr.toAudio(JSFXR_EXPLOSION_SHORT);


const JSFXR_HURT = {
  "oldParams": true,
  "wave_type": 1,
  "p_env_attack": 0,
  "p_env_sustain": 0,
  "p_env_punch": 0,
  "p_env_decay": 0.194,
  "p_base_freq": 0.396,
  "p_freq_limit": 0.201,
  "p_freq_ramp": -0.296,
  "p_freq_dramp": -0.079,
  "p_vib_strength": 0,
  "p_vib_speed": 0,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 1,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0,
  "p_pha_offset": 0,
  "p_pha_ramp": 0,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0.21582389981362443,
  "p_hpf_ramp": 0,
  "sound_vol": 0.362,
  "sample_rate": 44100,
  "sample_size": 8
}

SFX.HURT = sfxr.toAudio(JSFXR_HURT);





// function getSfxById(id) {
//   switch(id) {
//     case 0: return SFX.PLAYER_DEATH;
//     case 1: return SFX.ENEMY_DEATH;
//     case 2: return SFX.EXPLOSION;
//     case 3: return SFX.EXPLOSION_SHORT;
//     case 4: return SFX.HURT;
//   }
// }

///////////////////////////////////

function chat_log(msg: str) : void{
	const log_el = document.querySelector('#chat_log') as HTMLTextAreaElement
	// prepend
	log_el.value = msg + '\n' + log_el.value
}



let websocket : WebSocket;





function connectWebSocket() {
	const host = window.location.host; // e.g. "localhost:3000"
	const path = window.location.pathname; // e.g. "/12345"
	// const path = '';
	const url = "ws://" + host + path; // note: we use the path for the room

	console.log('websocket connecting to ' + url);
	// connect
	websocket = new WebSocket(url);

	// init events
	websocket.onopen = function () {
		console.log("WebSocket connection opened");
	};

	websocket.onmessage = function (event) {
		if (!event.data.includes('POS')) { // antispam
			console.log("Received message:", event.data);
		}
		handleMessage(event.data);
	};

	websocket.onclose = function (event) {
		console.warn(`WebSocket closed with code ${event.code}. Reconnecting in 2 seconds...`);
		setTimeout(connectWebSocket, 2000);
	};

	websocket.onerror = function (error) {
		console.error("WebSocket error:", error);
		// Handle errors as needed
	};
}

function sendMessage(msg: str) {
	if ( ! (websocket.readyState == 1) ) return;
	if ( ! msg.startsWith('POS')) { // prevent spam
		console.log('sent message:')
		console.log(msg)
		console.log('');
	}
	// msg = JSON.stringify(message)
	websocket.send(msg);
}

function handleMessage(msg: str) {

	if(msg.startsWith('MSG')) {
		return handleUserMessage(msg);
	}

	// server messages
	const chunks = msg.split(' ');
	if (chunks.length > 1) {
		const cmd = chunks[0];
		switch (cmd) {
			
			// NOTE: moved to handleUserMessage
			// case "POS":
			// 	_set_player_pos(Number(chunks[1]), Number(chunks[2]));
			// 	// NOTE: emscripten apparently exports WASM functions, prefixed with underscore 
			// break;

			case "USERID":
				set_player_id(Number(chunks[1]))
			break;

			case "JOIN":
				spawn_player(Number(chunks[1])); // no data but gets synced immediately
				const join_msg = `Player ${chunks[1]} joined`;
				sam.speak(join_msg);
				chat_log(join_msg)

				// TODO: maybe keep new player disabled until first sync ?
			break;

			case "LEAVE":
				delete_player(Number(chunks[1]));
				const leave_msg  = `Player ${chunks[1]} quit`;
				sam.speak(leave_msg);
				chat_log(leave_msg)

			break;
		}
	}
}

function handleUserMessage(msg: str) {
	const args = msg.split(' ');
	if (args.length > 1) {
		// @ts-ignore (unused)
		const server_cmd = args.shift(); // MSG
		const userid = args.shift();
		const cmd = args.shift();
		// note: remaining args (if any) now begin at 0
		switch (cmd) {
			case "POS":
				set_player_pos(Number(userid), Number(args[0]), Number(args[1]));
			break;
			case "CHAT":
				const chat_msg = args.join(' ');
				const chat_msg_line = `PLAYER ${userid}: ${chat_msg}`
				chat_log(chat_msg_line)
				sam.speak(chat_msg)
			break;
			case "BLT":
				{
					const idx = Number(args[0])
					const x = Number(args[1])
					const y = Number(args[2])
					const dx = Number(args[3])
					const dy = Number(args[4])
					net_get_bullet(idx, x, y, dx, dy)
				}
			break;
			case "BLT_X":
				const idx = Number(args[0])
				net_kill_bullet(idx)
			break
			case "DIED":
				const die_msg = `PLAYER ${userid} DIED`;
				(document.querySelector('#chat_log') as HTMLTextAreaElement).value += die_msg + '\n';
				sam.speak(die_msg)
				net_player_died(Number(userid))
				playSound(1) // SFX.ENEMY_DEATH
			break;	

			case "RSPN":
				spawn_player(Number(userid)); // no data but gets synced immediately by next POS msg
			break;
		}
	}
}

function youDied() {
	window.setTimeout(
		function(){
			samDeep.speak('You died')
		},
		500 // delay so death sfx ends
	)
}









///////////////////////////////

interface Player {
	x: i32,
	y: i32,
	color: Color,
	alive: bool,
	life: i32,
	exists: bool,
}

// lol... probably better to just be explicit about it
// having many positional args is a footgun
// function Player(	
// 	x: i32,
// 	y: i32,
// 	color: Color,
// 	alive: bool,
// 	life: i32,
// 	exists: bool
// ) : Player {
// 	return { x, y, color, alive, life, exists }
// }
//
const PLAYER_MOVE_SPEED = 4
const PLAYER_START_LIFE = 100

let player : Player;
let player_idx : i32 = -1

const MAX_PLAYERS = 256

const players : Player[] = []
// players.length = MAX_PLAYERS // ...beautiful
InitArrayWithSize(players, MAX_PLAYERS, function() : Player {
	return { x:0, y:0, color: COLOR_ZERO, alive: false, life: 0, exists: false}
})

// const DUMMY_PLAYERS_COUNT = 16

interface Bullet {
	x: i32,
	y: i32,
	xf: f32,
	yf: f32,
	dx: i32,
	dy: i32,
	alive: bool,
	life: i32,
}

const BULLET_DAMAGE = 33
const BULLET_START_LIFE = 300
 
const BULLET_WIDTH = 8
const BULLET_HEIGHT = 8
const BULLET_OFFSET =  (PLAYER_WIDTH * 1.2)
const BULLET_SPEED = 8

const BULLETS_PER_PLAYER = 6
const MAX_BULLETS = MAX_PLAYERS * BULLETS_PER_PLAYER
const bullets: Bullet[] = []
// bullets.length = MAX_BULLETS

// TODO: Why the HELL does this not produce a TS error ?
// InitArrayWithSize(bullets, MAX_BULLETS, function() : Player {
// 	return { x:0, y:0, color: COLOR_ZERO, alive: false, life: 0, exists: false}
// })

InitArrayWithSize(bullets, MAX_BULLETS, function() : Bullet {
	return { x:0, y:0, xf:0, yf:0, dx:0, dy:0, alive: false, life: 0 }
})


const BULLET_PRECISION_FACTOR = 100 // lets us use int instead of float



///////////
// TODO rename to init
function _main() : void {

	// init_dummy_players()
	reset_player()

	connect_websocket()

	// these are just hardcoded in html, unnecessary
	// window.title = "boxfight"
	// canvas.width = SCREEN_WIDTH
	// canvas.height = SCREEN_HEIGHT
	// TODO: use CSS to fill screen?

	// rl.SetTargetFPS(60)
	requestAnimationFrame(step)

}


// TODO rename to tick
function step(time: num) : void {
	update(time)
	// TODO add draw
	// draw(time)
	requestAnimationFrame(step)
}

function random_int(lo : i32, hi: i32) : i32 {
	const range = hi-lo;
	return Math.floor(lo + Math.random() * range)
}

// todo rename?
function random_u8(lo : i32, hi: i32) : u8 {
	return u8(random_int( lo, hi ))
}

function random_color() : Color {
	return Color (
		random_u8( 64, 192 ),
		random_u8( 64, 192 ),
		random_u8( 64, 192 ),
		255
	)
}



// used for testing players during development, before server existed

// dummy_player() : Player {
// 	PAD :: 32
// 	x := random_int( PAD, SCREEN_WIDTH - PAD )
// 	y := random_int( PAD, SCREEN_HEIGHT - PAD )
// 	col := random_color()

// 	p := Player{ true, x, y, col }
// 	return p
// }



// init_dummy_players() {
// 	for i in 0..<DUMMY_PLAYERS_COUNT {
// 		players[i] = dummy_player()
// 	}
// }

// TODO: the word Player refers to both the player and the other players
// How can we disambiguate this? "local player"?
function reset_player() : void {
	player = { 
		x: SCREEN_WIDTH/2, 
		y: SCREEN_HEIGHT/2, 
		color: Color(92, 128, 192, 255), // TODO plr color to top?
		alive: true, 
		life: PLAYER_START_LIFE,
		exists: true,
	}
}

function respawn() : void {
	net_send_respawn()
	reset_player()
}

function update_player() : void {


	if(! player.alive ) {
		if(deathTimer <= 0 ) {
			deathTimer = 0
			respawn()
		} else {
			deathTimer -= _frame_time
			return
		}
	}

	if(IsKeyDown("w") || IsKeyDown("ArrowUp") ) {
		console.log('up')
		player.y -= PLAYER_MOVE_SPEED
	}
	if(IsKeyDown("s") || IsKeyDown("ArrowDown") ) {
		player.y += PLAYER_MOVE_SPEED
	}
	if(IsKeyDown("a") || IsKeyDown("ArrowLeft") ) {
		player.x -= PLAYER_MOVE_SPEED
	}
	if(IsKeyDown("d") || IsKeyDown("Arrowright") ) {
		player.x += PLAYER_MOVE_SPEED
	}

	if(Mouse.down[MOUSE_LEFT] ) {
		if(canShoot()) {
			shoot()
		}
	}

	// collide bullets

	// for k in 0..<MAX_BULLETS {
	for ( let k = 0; k < MAX_BULLETS; k++) {
		const bullet = bullets[k]!;
		if(! bullet.alive) { continue }

		const r1 = Rect(
			f32(player.x),
			f32(player.y),
			f32(PLAYER_WIDTH),
			f32(PLAYER_HEIGHT)
		)
		const r2 = Rect(
			f32(bullet.x),
			f32(bullet.y),
			f32(BULLET_WIDTH),
			f32(BULLET_HEIGHT)
		)

		if(rectRect(r1, r2)) {
			bullet.alive = false
			net_send_bullet_died(i32(k))
			player.life -= BULLET_DAMAGE
			playSound(SFX.HURT)
			if(player.life <= 0) {
				player.alive = false
				// TODO respawn command?
				die()
			}
		}
	}

}


function update_players() : void {

	// NOTE: does nothing
	
	// NOTE: each player updates themselves and sends the result over network
	// this could be described as "not ideal" for various reasons,
	// notably latency and cheating
}

function draw_players() : void {
	// for i in 0..<MAX_PLAYERS {
	for (let i = 0; i < MAX_PLAYERS; i++) {
		
		if(! players[i]!.exists) { continue }
		// fmt.println(key, value)
		draw_player(players[i]!, i32(i))
	}
}

function draw_player(p: Player, id: i32) : void {
	if(p.alive) {
		DrawRectangleArgs(p.x, p.y, PLAYER_WIDTH, PLAYER_HEIGHT, p.color)
	} else {
		DrawRectangleArgs(p.x, p.y, PLAYER_WIDTH, PLAYER_HEIGHT, Color(255,0,0,128))
	}
	let textSize : i32 = 32
	// let text: string = `${id}`
	let text : string;
	if ( id == -1) {
		text = "loading..."; 
	} else {
		text = String(id).padStart(2, '0');
	}
	
	DrawText(text, p.x, p.y - 32, textSize, Color(255,255,255,64))

}

function update_bullets() : void {
	// for i in 0..<MAX_BULLETS {
	for (let i = 0; i < MAX_BULLETS; i++) {
		const bullet = bullets[i]!;
		if(! bullet.alive) { 
			continue 
		}
		if(bullet.life <= 0) { 
			bullet.alive = false; 
			continue 
			// no need for net send die, since it'll die everywhere when time runs out
			// note: lag makes this terrible, but it's a jam so.. lol
		}
		bullet.xf += f32(bullet.dx / BULLET_PRECISION_FACTOR)
		bullet.yf += f32(bullet.dy / BULLET_PRECISION_FACTOR)
		bullet.x = i32(bullet.xf)
		bullet.y = i32(bullet.yf)
		bullet.life-=1

		if(bullet.x < (-BULLET_WIDTH) || bullet.y < (-BULLET_HEIGHT) || bullet.x > SCREEN_WIDTH || bullet.y > SCREEN_HEIGHT) {
			bullet.alive = false
		}
	}
}

function draw_bullets() : void {
	for (let i = 0; i < MAX_BULLETS; i++) {
	// for i in 0..<MAX_BULLETS {
		if(! bullets[i]!.alive) { continue }
		draw_bullet(bullets[i]!)
	}
}

function draw_bullet(b: Bullet) : void {
	DrawRectangleArgs(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, COLOR_YELLOW)
}

let updateCounter: i32 = 0;

function update(time: num) : void {
	updateCounter++;
	// _time = GetTimeMs()
	_frame_time = time - _time_prev;
	secondTimer += _frame_time
	if(secondTimer >= 1000) {
		secondTimer = 0;
		console.log('one second passed')
		console.log('Updates in past second: ' + updateCounter);
		updateCounter = 0;
	}
	// note: at bottom we do _frame_time_prev = _frame_time;

	shootTimer -= _frame_time
	if(shootTimer < 0) {
		shootTimer = 0
	}
	// console.log(time)
	// todo: does this timer thing make sense? (isn't there a raylib builtin way to handle frame rate?)
	// todo: take a look at Tyler Glaiel's  article on frame time
	timer -= _frame_time
	// if(timer <= 0) {
	// console.log('timer')
	// timer = 1
	timer = 1000 / 60

	net_send_interval_counter += 1
	if(net_send_interval_counter == net_send_interval) {
		net_send_interval_counter = 0
		net_send()
	}


	// player.x = rl.GetMouseX();
	// player.y = rl.GetMouseY();
	update_player()
	update_players()
	update_bullets()

	// }


	// rl.UpdateCamera(&camera, .ORBITAL)

	// rl.ClearBackground(rl.RAYWHITE)
	ClearBackground(Color(32, 32, 32, 255))



	// rl.BeginMode3D(camera)
	// {
	//     for i in 0..<32 {
	//         rl.DrawCube(cubePos[i], 1, 1, 1, cubeColors[i])
	//     }
	//     rl.DrawGrid(10, 1)
	// }
	// rl.EndMode3D()



	// draw player
	draw_players()
	draw_player(player, i32(player_idx))
	draw_bullets()


	// context.fillStyle = `rgb(128,255,255, 0.2)`
	// // context.fillStyle = '#fff8'
	// context.fillText('hello', 32, 32);

	DrawText('hello', 32, 32, 16, Color(255,255,255,32))

	// reset inputs
	Mouse.moved = false;
	Mouse.pressed = {};
	Keyboard.pressed = {}; // clear pressed keys at the end of each frame

	// frame time
	_time_prev = time;
	// _frame_time_prev = _frame_time;
}

function canShoot() : bool {
	return player.alive && shootTimer <= 0
}

function shoot() : void {

	if(player_idx == -1) { return }

	if(! canShoot()) {
		return
	}

	shootTimer = shootDelay

	if (!bullets || bullets.length < (MAX_BULLETS)) return

	
	// find free bullet slot
	const startIndex = player_idx * BULLETS_PER_PLAYER
	const endIndex = startIndex + BULLETS_PER_PLAYER - 1
	// for i in startIndex..=endIndex {
	for (let i = startIndex; i <= endIndex; i++) {
		const bullet = bullets[i]!; // sigh
		if(bullet.alive) { continue }
		// if(we reach this line, we found a free slot
		bullet.alive = true
		bullet.life = BULLET_START_LIFE


		const diff_x = f32(Mouse.x - (player.x + PLAYER_WIDTH/2))
		const diff_y = f32(Mouse.y - (player.y + PLAYER_HEIGHT/2))

		const diff = Vector2( diff_x, diff_y )
		const dir = Vector2Normalize(diff)

		// const offset = dir * BULLET_OFFSET // TODO vector mul
		const offset = Vector2TimesScalar(dir, BULLET_OFFSET);
		offset.x += PLAYER_WIDTH/2
		offset.y += PLAYER_HEIGHT/2

		let vel = Vector2TimesScalar(dir, BULLET_SPEED)
		bullet.x = player.x + i32(offset.x)
		bullet.y = player.y + i32(offset.y)
		bullet.xf = f32(bullet.x)
		bullet.yf = f32(bullet.y)
		bullet.dx = i32(vel.x * BULLET_PRECISION_FACTOR)
		bullet.dy = i32(vel.y * BULLET_PRECISION_FACTOR)
		net_send_bullet(i, bullet.x, bullet.y, bullet.dx, bullet.dy)
		playSound(SFX.EXPLOSION_SHORT)
		break
	}
}




function die() {
	player.alive = false
	send_player_died()
	deathTimer = DEATH_TIME
	playSound(SFX.PLAYER_DEATH)
	you_died() // tts
}


// todo move
function net_send() {
	send_player_pos(player.x, player.y) 	// send_player_pos() is a js function
}


//////////////////////////

// functions called from net message handler


//net 
function net_get_bullet(idx: i32, x: i32, y:i32, dx: i32, dy: i32) : void {
	bullets[idx] = { 
		x, 
		y, 
		xf: f32(x), 
		yf: f32(y), 
		dx, 
		dy, 
		alive: true, 
		life: BULLET_START_LIFE,
	}
	playSound(SFX.EXPLOSION_SHORT)
}

//net 
function net_kill_bullet(idx: i32) : void {
	bullets[idx]!.alive = false
}

//net 
function net_player_died(idx: i32) : void {
	players[idx]!.alive = false
}



//net 
function spawn_player(plr_id: i32) : void { // spawn_player() called from js
	// NOTE: plr_id will be in valid range, server guarantees it
	const plr = players[plr_id]!;
	plr.x = -999 // offscreen until sync msg
	plr.y = -999
	plr.color = random_color()
	plr.alive = true
	plr.life = PLAYER_START_LIFE
	plr.exists = true
	
	playSound(SFX.EXPLOSION_SHORT) // tmp
}

//net 
function delete_player(plr_id: i32) : void {  // delete_player() called from js
	players[plr_id]!.exists = false
}

//net 
function set_player_pos(plr_id: i32, x: i32, y: i32) : void {
	players[plr_id]!.x = x
	players[plr_id]!.y = y
}

//net 
function set_player_id(plr_id: i32) : void {
	player_idx = plr_id
}

window.onload = _main