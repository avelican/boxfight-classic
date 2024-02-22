package main

import "core:strings"
import "core:runtime"
import "core:fmt"
import "core:mem"
import "core:math/rand"

import rl "raylib"
// NOTE: we are NOT using the builtin raylib, because it doesn't work in WASM (yet)


// NOTE: renamed odin_env to env
// (not sure why it was called that)
foreign import "env"

////////////////
// Note
// This was made in a game jam
// This code has not been cleaned up
// the naming is inconsistent (e.g. network functions)
// and I'm new to Odin so am probably doing stupid things
////////////////



// import js functions
// Note: the functions called FROM JS are at the bottom of this file (...approximately)

@(default_calling_convention="c")
foreign env {
    @(link_name="connect_websocket")
    connect_websocket :: proc() ---
}

@(default_calling_convention="c")
foreign env {
    @(link_name="send_player_pos")
    send_player_pos :: proc(i32, i32) ---
}

@(default_calling_convention="c")
foreign env {
    @(link_name="net_send_bullet")
    net_send_bullet :: proc(i32, i32, i32, i32, i32) ---
}

@(default_calling_convention="c")
foreign env {
    @(link_name="net_send_bullet_died")
    net_send_bullet_died :: proc(i32) ---
}


@(default_calling_convention="c")
foreign env {
    @(link_name="play_sound")
    play_sound :: proc(i32) ---
}

@(default_calling_convention="c")
foreign env {
    @(link_name="send_player_died")
    send_player_died :: proc() ---
}

@(default_calling_convention="c")
foreign env {
    @(link_name="net_send_respawn")
    net_send_respawn :: proc() ---
}

@(default_calling_convention="c")
foreign env {
    @(link_name="you_died")
    you_died :: proc() ---
}


SFX :: enum i32 {
	PLAYER_DEATH = 0, 
	ENEMY_DEATH = 1, 
	EXPLOSION = 2, 
	EXPLOSION_SHORT = 3, 
	HURT = 4,
	// compiler said this value was bigger than 2147483647 lol
}


// camera: rl.Camera3D

ctx: runtime.Context

tempAllocatorData: [mem.Megabyte * 4]byte
tempAllocatorArena: mem.Arena

mainMemoryData: [mem.Megabyte * 16]byte
mainMemoryArena: mem.Arena

timer: f32
shootTimer : f32
shootDelay: f32 = 0.1
// net_send_interval: i32 = 2
net_send_interval: i32 = 1 // each frame

net_send_interval_counter: i32 = 0

// cubePos: [32]rl.Vector3
// cubeColors: [32]rl.Color

/// copied from raylib.odin
import builtin "core:builtin"
cint  :: builtin.i32
cuint :: builtin.u32
clong :: builtin.u32 when (ODIN_OS == .Windows || size_of(builtin.rawptr) == 4) else builtin.u64
// note: todo: why does raylib.odin use cint instead of i32 directly?
// note: todo: raylib.odin mixes f32 and f64, but i believe only f64 exists in wasm
///


DEATH_TIME :: 4

deathTimer : f32 = 0

PLAYER_WIDTH :: 32
PLAYER_HEIGHT :: 32

SCREEN_WIDTH :: 800
SCREEN_HEIGHT :: 600

Player :: struct {
	x: i32,
	y: i32,
	color: rl.Color,
	alive: bool,
	life: i32,
	exists: bool,
}

PLAYER_MOVE_SPEED :: 4
PLAYER_START_LIFE :: 100

player : Player
player_idx : i32 = -1

// MAX_PLAYERS :: 32
MAX_PLAYERS :: 256

players : [MAX_PLAYERS]Player

// DUMMY_PLAYERS_COUNT :: 16

Bullet :: struct {
	x: i32,
	y: i32,
	xf: f32,
	yf: f32,
	dx: i32,
	dy: i32,
	alive: bool,
	life: i32,
}
BULLET_DAMAGE :: 33
BULLET_START_LIFE :: 300

BULLET_WIDTH :: 8
BULLET_HEIGHT :: 8
BULLET_OFFSET ::  (PLAYER_WIDTH * 1.2)
BULLET_SPEED :: 8

BULLETS_PER_PLAYER :: 6
MAX_BULLETS :: MAX_PLAYERS * BULLETS_PER_PLAYER
bullets: [MAX_BULLETS]Bullet

BULLET_PRECISION_FACTOR :: 100 // lets us use int instead of float



///////////

@(export, link_name="_main")
_main :: proc "c" () {
	ctx = runtime.default_context()
	context = ctx

	mem.arena_init(&mainMemoryArena, mainMemoryData[:])
	mem.arena_init(&tempAllocatorArena, tempAllocatorData[:])

	ctx.allocator      = mem.arena_allocator(&mainMemoryArena)
	ctx.temp_allocator = mem.arena_allocator(&tempAllocatorArena)

	rl.SetRandomSeed(0)
	// init_dummy_players()
	reset_player()

	connect_websocket()

	rl.InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "boxfight")

	rl.SetTargetFPS(60)

}

@(export, link_name="step")
step :: proc "contextless" () {
	context = ctx
	update()
	// TODO add draw
}

random_u8 :: proc(lo : i32, hi: i32) -> u8 {
	return u8(rl.GetRandomValue( lo, hi ))
}

random_color :: proc() -> rl.Color {
	return rl.Color {
		random_u8( 64, 192 ),
		random_u8( 64, 192 ),
		random_u8( 64, 192 ),
		255
	}
}



// used for testing players during development, before server existed

// dummy_player :: proc() -> Player {
// 	PAD :: 32
// 	x := rl.GetRandomValue( PAD, SCREEN_WIDTH - PAD )
// 	y := rl.GetRandomValue( PAD, SCREEN_HEIGHT - PAD )
// 	col := random_color()

// 	p := Player{ true, x, y, col }
// 	return p
// }



// init_dummy_players :: proc() {
// 	for i in 0..<DUMMY_PLAYERS_COUNT {
// 		players[i] = dummy_player()
// 	}
// }

reset_player :: proc() {
	player = Player { 
		SCREEN_WIDTH/2, 
		SCREEN_HEIGHT/2, 
		rl.Color{92, 128, 192, 255}, 
		true, 
		PLAYER_START_LIFE,
		true,
	}
}

respawn :: proc() {
	net_send_respawn()
	reset_player()
}

update_player :: proc() {


	if ! player.alive {
		if deathTimer <= 0 {
			deathTimer = 0
			respawn()
		} else {
			deathTimer -= rl.GetFrameTime()
			return
		}
	}

	if rl.IsKeyDown(rl.KeyboardKey.W) || rl.IsKeyDown(rl.KeyboardKey.UP) {
		player.y -= PLAYER_MOVE_SPEED
	}
	if rl.IsKeyDown(rl.KeyboardKey.S) || rl.IsKeyDown(rl.KeyboardKey.DOWN) {
		player.y += PLAYER_MOVE_SPEED
	}
	if rl.IsKeyDown(rl.KeyboardKey.A) || rl.IsKeyDown(rl.KeyboardKey.LEFT) {
		player.x -= PLAYER_MOVE_SPEED
	}
	if rl.IsKeyDown(rl.KeyboardKey.D) || rl.IsKeyDown(rl.KeyboardKey.RIGHT) {
		player.x += PLAYER_MOVE_SPEED
	}

	if rl.IsMouseButtonDown(rl.MouseButton.LEFT) {
		if canShoot() {
			shoot()
		}
	}

	// collide bullets

	for k in 0..<MAX_BULLETS {
		if ! bullets[k].alive { continue }

		r1 := rl.Rectangle{
			f32(player.x),
			f32(player.y),
			f32(PLAYER_WIDTH),
			f32(PLAYER_HEIGHT)
		}
		r2 := rl.Rectangle{
			f32(bullets[k].x),
			f32(bullets[k].y),
			f32(BULLET_WIDTH),
			f32(BULLET_HEIGHT)
		}

		if rl.CheckCollisionRecs(r1, r2) {
			bullets[k].alive = false
			net_send_bullet_died(i32(k))
			player.life -= BULLET_DAMAGE
			play_sound(i32(SFX.HURT))
			if player.life <= 0 {
				player.alive = false
				// TODO respawn command?
				die()
			}
		}
	}

}


update_players :: proc() {

	// NOTE: does nothing
	
	// NOTE: each player updates themselves and sends the result over network
	// this could be described as "not ideal" for various reasons,
	// notably latency and cheating
}

draw_players :: proc() {
	for i in 0..<MAX_PLAYERS {
		if ! players[i].exists { continue }
		// fmt.println(key, value)
		draw_player(&players[i], i32(i))
	}
}

draw_player :: proc(p: ^Player, id: i32) {
	if p.alive {
		rl.DrawRectangle(p.x, p.y, PLAYER_WIDTH, PLAYER_HEIGHT, p.color)
	} else {
		rl.DrawRectangle(p.x, p.y, PLAYER_WIDTH, PLAYER_HEIGHT, rl.Color{255,0,0,128})
	}
	textSize : i32 = 32
	text: string = int_to_str(id)
	text_c := strings.unsafe_string_to_cstring(text)
	// rl.DrawText(text_c, p.x + PLAYER_WIDTH/2, p.y - 16, textSize, rl.Color{255,255,255,64})
	rl.DrawText(text_c, p.x, p.y - 32, textSize, rl.Color{255,255,255,64})

}

update_bullets :: proc() {
	for i in 0..<MAX_BULLETS {
		if ! bullets[i].alive { 
			continue 
		}
		if bullets[i].life <= 0 { 
			bullets[i].alive = false; 
			continue 
			// no need for net send die, since it'll die everywhere when time runs out
			// note: lag makes this terrible, but it's a jam so.. lol
		}
		bullets[i].xf += f32(bullets[i].dx / BULLET_PRECISION_FACTOR)
		bullets[i].yf += f32(bullets[i].dy / BULLET_PRECISION_FACTOR)
		bullets[i].x = i32(bullets[i].xf)
		bullets[i].y = i32(bullets[i].yf)
		bullets[i].life-=1

		if bullets[i].x < (-BULLET_WIDTH) || bullets[i].y < (-BULLET_HEIGHT) || bullets[i].x > SCREEN_WIDTH || bullets[i].y > SCREEN_HEIGHT {
			bullets[i].alive = false
		}
	}
}

draw_bullets :: proc() {
	for i in 0..<MAX_BULLETS {
		if ! bullets[i].alive { continue }
		draw_bullet(&bullets[i])
	}
}

draw_bullet :: proc(b: ^Bullet) {
	rl.DrawRectangle(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, rl.YELLOW)
}

update :: proc() {
	free_all(context.temp_allocator)


	shootTimer -= rl.GetFrameTime()
	if shootTimer < 0 {
		shootTimer = 0
	}

	// todo: does this timer thing make sense? (isn't there a raylib builtin way to handle frame rate?)
	// todo: take a look at Tyler Glaiel's  article on frame time
	timer -= rl.GetFrameTime()
	if timer <= 0 {
		// timer = 1
		timer = 1 / 60

		net_send_interval_counter += 1
		if net_send_interval_counter == net_send_interval {
			net_send_interval_counter = 0
			net_send()
		}


		// player.x = rl.GetMouseX();
		// player.y = rl.GetMouseY();
		update_player()
		update_players()
		update_bullets()

	}

	rl.BeginDrawing()
	defer rl.EndDrawing()

	// rl.UpdateCamera(&camera, .ORBITAL)

	// rl.ClearBackground(rl.RAYWHITE)
	rl.ClearBackground(rl.Color{32, 32, 32, 255})



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
	draw_player(&player, i32(player_idx))
	draw_bullets()

}

canShoot :: proc() -> bool {
	return player.alive && shootTimer <= 0
}

shoot :: proc() {

	if player_idx == -1 { return }

	if ! canShoot() {
		return
	}

	shootTimer = shootDelay
	
	// find free bullet slot
	startIndex := player_idx * BULLETS_PER_PLAYER
	endIndex := startIndex + BULLETS_PER_PLAYER - 1
	for i in startIndex..=endIndex {
		if bullets[i].alive { continue }
		// if we reach this line, we found a free slot
		bullets[i].alive = true
		bullets[i].life = BULLET_START_LIFE


		mouse_x := rl.GetMouseX()
		mouse_y := rl.GetMouseY()

		diff_x := f32(mouse_x - (player.x + PLAYER_WIDTH/2))
		diff_y := f32(mouse_y - (player.y + PLAYER_HEIGHT/2))

		diff := rl.Vector2{ diff_x, diff_y }
		dir := rl.Vector2Normalize(diff)

		offset := dir * BULLET_OFFSET
		offset.x += PLAYER_WIDTH/2
		offset.y += PLAYER_HEIGHT/2

		vel := dir * BULLET_SPEED
		bullets[i].x = player.x + i32(offset.x)
		bullets[i].y = player.y + i32(offset.y)
		bullets[i].xf = f32(bullets[i].x)
		bullets[i].yf = f32(bullets[i].y)
		bullets[i].dx = i32(vel.x * BULLET_PRECISION_FACTOR)
		bullets[i].dy = i32(vel.y * BULLET_PRECISION_FACTOR)
		net_send_bullet(i, bullets[i].x, bullets[i].y, bullets[i].dx, bullets[i].dy)
		play_sound(i32(SFX.EXPLOSION_SHORT))
		break
	}
}



//////////////////////////

// functions called from JS

@(export, link_name="net_get_bullet")
net_get_bullet :: proc(idx: i32, x: i32, y:i32, dx: i32, dy: i32) {
	bullets[idx] = Bullet { 
		x, 
		y, 
		f32(x), 
		f32(y), 
		dx, 
		dy, 
		true, 
		BULLET_START_LIFE,
	}
	play_sound(i32(SFX.EXPLOSION_SHORT))
}

@(export, link_name="net_kill_bullet")
net_kill_bullet :: proc(idx: i32) {
	bullets[idx].alive = false
}

@(export, link_name="net_player_died")
net_player_died :: proc(idx: i32) {
	players[idx].alive = false
}

die :: proc() {
	player.alive = false
	send_player_died()
	deathTimer = DEATH_TIME
	play_sound(i32(SFX.PLAYER_DEATH))
	you_died() // tts
}

net_send :: proc() {
	send_player_pos(player.x, player.y) 	// send_player_pos() is a js function
}

@(export, link_name="spawn_player")
spawn_player :: proc "c" (plr_id: i32) { // spawn_player() called from js

	// random_color demands a context
	ctx = runtime.default_context()
	context = ctx

	players[plr_id].x = -999 // offscreen until sync msg
	players[plr_id].y = -999
	players[plr_id].color = random_color()
	players[plr_id].alive = true
	players[plr_id].life = PLAYER_START_LIFE
	players[plr_id].exists = true
	
	play_sound( i32(SFX.EXPLOSION_SHORT) ) // tmp
}

@(export, link_name="delete_player")
delete_player :: proc "c" (plr_id: i32) {  // delete_player() called from js
	players[plr_id].exists = false
}

@(export, link_name="set_player_pos")
set_player_pos :: proc "c" (plr_id: i32, x: i32, y: i32) {
	players[plr_id].x = x
	players[plr_id].y = y
}

@(export, link_name="set_player_id")
set_player_id :: proc "c" (plr_id: i32) {
	player_idx = plr_id
}



// forgive me

STR_00 :: "00"
STR_01 :: "01"
STR_02 :: "02"
STR_03 :: "03"
STR_04 :: "04"
STR_05 :: "05"
STR_06 :: "06"
STR_07 :: "07"
STR_08 :: "08"
STR_09 :: "09"
STR_10 :: "10"
STR_11 :: "11"
STR_12 :: "12"
STR_13 :: "13"
STR_14 :: "14"
STR_15 :: "15"
STR_16 :: "16"
STR_17 :: "17"
STR_18 :: "18"
STR_19 :: "19"
STR_20 :: "20"
STR_21 :: "21"
STR_22 :: "22"
STR_23 :: "23"
STR_24 :: "24"
STR_25 :: "25"
STR_26 :: "26"
STR_27 :: "27"
STR_28 :: "28"
STR_29 :: "29"
STR_30 :: "30"
STR_31 :: "31"
STR_32 :: "32"
STR_33 :: "33"
STR_34 :: "34"
STR_35 :: "35"
STR_36 :: "36"
STR_37 :: "37"
STR_38 :: "38"
STR_39 :: "39"
STR_40 :: "40"
STR_41 :: "41"
STR_42 :: "42"
STR_43 :: "43"
STR_44 :: "44"
STR_45 :: "45"
STR_46 :: "46"
STR_47 :: "47"
STR_48 :: "48"
STR_49 :: "49"
STR_50 :: "50"
STR_51 :: "51"
STR_52 :: "52"
STR_53 :: "53"
STR_54 :: "54"
STR_55 :: "55"
STR_56 :: "56"
STR_57 :: "57"
STR_58 :: "58"
STR_59 :: "59"
STR_60 :: "60"
STR_61 :: "61"
STR_62 :: "62"
STR_63 :: "63"
STR_64 :: "64"
STR_65 :: "65"
STR_66 :: "66"
STR_67 :: "67"
STR_68 :: "68"
STR_69 :: "69"
STR_70 :: "70"
STR_71 :: "71"
STR_72 :: "72"
STR_73 :: "73"
STR_74 :: "74"
STR_75 :: "75"
STR_76 :: "76"
STR_77 :: "77"
STR_78 :: "78"
STR_79 :: "79"
STR_80 :: "80"
STR_81 :: "81"
STR_82 :: "82"
STR_83 :: "83"
STR_84 :: "84"
STR_85 :: "85"
STR_86 :: "86"
STR_87 :: "87"
STR_88 :: "88"
STR_89 :: "89"
STR_90 :: "90"
STR_91 :: "91"
STR_92 :: "92"
STR_93 :: "93"
STR_94 :: "94"
STR_95 :: "95"
STR_96 :: "96"
STR_97 :: "97"
STR_98 :: "98"
STR_99 :: "99"
STR_100 :: "100"
STR_101 :: "101"
STR_102 :: "102"
STR_103 :: "103"
STR_104 :: "104"
STR_105 :: "105"
STR_106 :: "106"
STR_107 :: "107"
STR_108 :: "108"
STR_109 :: "109"
STR_110 :: "110"
STR_111 :: "111"
STR_112 :: "112"
STR_113 :: "113"
STR_114 :: "114"
STR_115 :: "115"
STR_116 :: "116"
STR_117 :: "117"
STR_118 :: "118"
STR_119 :: "119"
STR_120 :: "120"
STR_121 :: "121"
STR_122 :: "122"
STR_123 :: "123"
STR_124 :: "124"
STR_125 :: "125"
STR_126 :: "126"
STR_127 :: "127"
STR_128 :: "128"
STR_129 :: "129"
STR_130 :: "130"
STR_131 :: "131"
STR_132 :: "132"
STR_133 :: "133"
STR_134 :: "134"
STR_135 :: "135"
STR_136 :: "136"
STR_137 :: "137"
STR_138 :: "138"
STR_139 :: "139"
STR_140 :: "140"
STR_141 :: "141"
STR_142 :: "142"
STR_143 :: "143"
STR_144 :: "144"
STR_145 :: "145"
STR_146 :: "146"
STR_147 :: "147"
STR_148 :: "148"
STR_149 :: "149"
STR_150 :: "150"
STR_151 :: "151"
STR_152 :: "152"
STR_153 :: "153"
STR_154 :: "154"
STR_155 :: "155"
STR_156 :: "156"
STR_157 :: "157"
STR_158 :: "158"
STR_159 :: "159"
STR_160 :: "160"
STR_161 :: "161"
STR_162 :: "162"
STR_163 :: "163"
STR_164 :: "164"
STR_165 :: "165"
STR_166 :: "166"
STR_167 :: "167"
STR_168 :: "168"
STR_169 :: "169"
STR_170 :: "170"
STR_171 :: "171"
STR_172 :: "172"
STR_173 :: "173"
STR_174 :: "174"
STR_175 :: "175"
STR_176 :: "176"
STR_177 :: "177"
STR_178 :: "178"
STR_179 :: "179"
STR_180 :: "180"
STR_181 :: "181"
STR_182 :: "182"
STR_183 :: "183"
STR_184 :: "184"
STR_185 :: "185"
STR_186 :: "186"
STR_187 :: "187"
STR_188 :: "188"
STR_189 :: "189"
STR_190 :: "190"
STR_191 :: "191"
STR_192 :: "192"
STR_193 :: "193"
STR_194 :: "194"
STR_195 :: "195"
STR_196 :: "196"
STR_197 :: "197"
STR_198 :: "198"
STR_199 :: "199"
STR_200 :: "200"
STR_201 :: "201"
STR_202 :: "202"
STR_203 :: "203"
STR_204 :: "204"
STR_205 :: "205"
STR_206 :: "206"
STR_207 :: "207"
STR_208 :: "208"
STR_209 :: "209"
STR_210 :: "210"
STR_211 :: "211"
STR_212 :: "212"
STR_213 :: "213"
STR_214 :: "214"
STR_215 :: "215"
STR_216 :: "216"
STR_217 :: "217"
STR_218 :: "218"
STR_219 :: "219"
STR_220 :: "220"
STR_221 :: "221"
STR_222 :: "222"
STR_223 :: "223"
STR_224 :: "224"
STR_225 :: "225"
STR_226 :: "226"
STR_227 :: "227"
STR_228 :: "228"
STR_229 :: "229"
STR_230 :: "230"
STR_231 :: "231"
STR_232 :: "232"
STR_233 :: "233"
STR_234 :: "234"
STR_235 :: "235"
STR_236 :: "236"
STR_237 :: "237"
STR_238 :: "238"
STR_239 :: "239"
STR_240 :: "240"
STR_241 :: "241"
STR_242 :: "242"
STR_243 :: "243"
STR_244 :: "244"
STR_245 :: "245"
STR_246 :: "246"
STR_247 :: "247"
STR_248 :: "248"
STR_249 :: "249"
STR_250 :: "250"
STR_251 :: "251"
STR_252 :: "252"
STR_253 :: "253"
STR_254 :: "254"
STR_255 :: "255"
// STR_256 :: "256"
// STR_257 :: "257"
// STR_258 :: "258"
// STR_259 :: "259"
// STR_260 :: "260"
// STR_261 :: "261"
// STR_262 :: "262"
// STR_263 :: "263"
// STR_264 :: "264"
// STR_265 :: "265"
// STR_266 :: "266"
// STR_267 :: "267"
// STR_268 :: "268"
// STR_269 :: "269"
// STR_270 :: "270"
// STR_271 :: "271"
// STR_272 :: "272"
// STR_273 :: "273"
// STR_274 :: "274"
// STR_275 :: "275"
// STR_276 :: "276"
// STR_277 :: "277"
// STR_278 :: "278"
// STR_279 :: "279"
// STR_280 :: "280"
// STR_281 :: "281"
// STR_282 :: "282"
// STR_283 :: "283"
// STR_284 :: "284"
// STR_285 :: "285"
// STR_286 :: "286"
// STR_287 :: "287"
// STR_288 :: "288"
// STR_289 :: "289"
// STR_290 :: "290"
// STR_291 :: "291"
// STR_292 :: "292"
// STR_293 :: "293"
// STR_294 :: "294"
// STR_295 :: "295"
// STR_296 :: "296"
// STR_297 :: "297"
// STR_298 :: "298"
// STR_299 :: "299"


int_to_str :: proc(n : i32) -> string {
	switch n {
        case 0: return STR_00
        case 1: return STR_01
        case 2: return STR_02
        case 3: return STR_03
        case 4: return STR_04
        case 5: return STR_05
        case 6: return STR_06
        case 7: return STR_07
        case 8: return STR_08
        case 9: return STR_09
        case 10: return STR_10
        case 11: return STR_11
        case 12: return STR_12
        case 13: return STR_13
        case 14: return STR_14
        case 15: return STR_15
        case 16: return STR_16
        case 17: return STR_17
        case 18: return STR_18
        case 19: return STR_19
        case 20: return STR_20
        case 21: return STR_21
        case 22: return STR_22
        case 23: return STR_23
        case 24: return STR_24
        case 25: return STR_25
        case 26: return STR_26
        case 27: return STR_27
        case 28: return STR_28
        case 29: return STR_29
        case 30: return STR_30
        case 31: return STR_31
        case 32: return STR_32
		case 33: return STR_33
		case 34: return STR_34
		case 35: return STR_35
		case 36: return STR_36
		case 37: return STR_37
		case 38: return STR_38
		case 39: return STR_39
		case 40: return STR_40
		case 41: return STR_41
		case 42: return STR_42
		case 43: return STR_43
		case 44: return STR_44
		case 45: return STR_45
		case 46: return STR_46
		case 47: return STR_47
		case 48: return STR_48
		case 49: return STR_49
		case 50: return STR_50
		case 51: return STR_51
		case 52: return STR_52
		case 53: return STR_53
		case 54: return STR_54
		case 55: return STR_55
		case 56: return STR_56
		case 57: return STR_57
		case 58: return STR_58
		case 59: return STR_59
		case 60: return STR_60
		case 61: return STR_61
		case 62: return STR_62
		case 63: return STR_63
		case 64: return STR_64
		case 65: return STR_65
		case 66: return STR_66
		case 67: return STR_67
		case 68: return STR_68
		case 69: return STR_69
		case 70: return STR_70
		case 71: return STR_71
		case 72: return STR_72
		case 73: return STR_73
		case 74: return STR_74
		case 75: return STR_75
		case 76: return STR_76
		case 77: return STR_77
		case 78: return STR_78
		case 79: return STR_79
		case 80: return STR_80
		case 81: return STR_81
		case 82: return STR_82
		case 83: return STR_83
		case 84: return STR_84
		case 85: return STR_85
		case 86: return STR_86
		case 87: return STR_87
		case 88: return STR_88
		case 89: return STR_89
		case 90: return STR_90
		case 91: return STR_91
		case 92: return STR_92
		case 93: return STR_93
		case 94: return STR_94
		case 95: return STR_95
		case 96: return STR_96
		case 97: return STR_97
		case 98: return STR_98
		case 99: return STR_99


		case 100: return STR_100
        case 101: return STR_101
        case 102: return STR_102
        case 103: return STR_103
        case 104: return STR_104
        case 105: return STR_105
        case 106: return STR_106
        case 107: return STR_107
        case 108: return STR_108
        case 109: return STR_109
        case 110: return STR_110
        case 111: return STR_111
        case 112: return STR_112
        case 113: return STR_113
        case 114: return STR_114
        case 115: return STR_115
        case 116: return STR_116
        case 117: return STR_117
        case 118: return STR_118
        case 119: return STR_119
        case 120: return STR_120
        case 121: return STR_121
        case 122: return STR_122
        case 123: return STR_123
        case 124: return STR_124
        case 125: return STR_125
        case 126: return STR_126
        case 127: return STR_127
        case 128: return STR_128
        case 129: return STR_129
        case 130: return STR_130
        case 131: return STR_131
        case 132: return STR_132
		case 133: return STR_133
		case 134: return STR_134
		case 135: return STR_135
		case 136: return STR_136
		case 137: return STR_137
		case 138: return STR_138
		case 139: return STR_139
		case 140: return STR_140
		case 141: return STR_141
		case 142: return STR_142
		case 143: return STR_143
		case 144: return STR_144
		case 145: return STR_145
		case 146: return STR_146
		case 147: return STR_147
		case 148: return STR_148
		case 149: return STR_149
		case 150: return STR_150
		case 151: return STR_151
		case 152: return STR_152
		case 153: return STR_153
		case 154: return STR_154
		case 155: return STR_155
		case 156: return STR_156
		case 157: return STR_157
		case 158: return STR_158
		case 159: return STR_159
		case 160: return STR_160
		case 161: return STR_161
		case 162: return STR_162
		case 163: return STR_163
		case 164: return STR_164
		case 165: return STR_165
		case 166: return STR_166
		case 167: return STR_167
		case 168: return STR_168
		case 169: return STR_169
		case 170: return STR_170
		case 171: return STR_171
		case 172: return STR_172
		case 173: return STR_173
		case 174: return STR_174
		case 175: return STR_175
		case 176: return STR_176
		case 177: return STR_177
		case 178: return STR_178
		case 179: return STR_179
		case 180: return STR_180
		case 181: return STR_181
		case 182: return STR_182
		case 183: return STR_183
		case 184: return STR_184
		case 185: return STR_185
		case 186: return STR_186
		case 187: return STR_187
		case 188: return STR_188
		case 189: return STR_189
		case 190: return STR_190
		case 191: return STR_191
		case 192: return STR_192
		case 193: return STR_193
		case 194: return STR_194
		case 195: return STR_195
		case 196: return STR_196
		case 197: return STR_197
		case 198: return STR_198
		case 199: return STR_199
		

		case 200: return STR_200
        case 201: return STR_201
        case 202: return STR_202
        case 203: return STR_203
        case 204: return STR_204
        case 205: return STR_205
        case 206: return STR_206
        case 207: return STR_207
        case 208: return STR_208
        case 209: return STR_209
        case 210: return STR_210
        case 211: return STR_211
        case 212: return STR_212
        case 213: return STR_213
        case 214: return STR_214
        case 215: return STR_215
        case 216: return STR_216
        case 217: return STR_217
        case 218: return STR_218
        case 219: return STR_219
        case 220: return STR_220
        case 221: return STR_221
        case 222: return STR_222
        case 223: return STR_223
        case 224: return STR_224
        case 225: return STR_225
        case 226: return STR_226
        case 227: return STR_227
        case 228: return STR_228
        case 229: return STR_229
        case 230: return STR_230
        case 231: return STR_231
        case 232: return STR_232
		case 233: return STR_233
		case 234: return STR_234
		case 235: return STR_235
		case 236: return STR_236
		case 237: return STR_237
		case 238: return STR_238
		case 239: return STR_239
		case 240: return STR_240
		case 241: return STR_241
		case 242: return STR_242
		case 243: return STR_243
		case 244: return STR_244
		case 245: return STR_245
		case 246: return STR_246
		case 247: return STR_247
		case 248: return STR_248
		case 249: return STR_249
		case 250: return STR_250
		case 251: return STR_251
		case 252: return STR_252
		case 253: return STR_253
		case 254: return STR_254
		case 255: return STR_255
		// case 256: return STR_256
		// case 257: return STR_257
		// case 258: return STR_258
		// case 259: return STR_259
		// case 260: return STR_260
		// case 261: return STR_261
		// case 262: return STR_262
		// case 263: return STR_263
		// case 264: return STR_264
		// case 265: return STR_265
		// case 266: return STR_266
		// case 267: return STR_267
		// case 268: return STR_268
		// case 269: return STR_269
		// case 270: return STR_270
		// case 271: return STR_271
		// case 272: return STR_272
		// case 273: return STR_273
		// case 274: return STR_274
		// case 275: return STR_275
		// case 276: return STR_276
		// case 277: return STR_277
		// case 278: return STR_278
		// case 279: return STR_279
		// case 280: return STR_280
		// case 281: return STR_281
		// case 282: return STR_282
		// case 283: return STR_283
		// case 284: return STR_284
		// case 285: return STR_285
		// case 286: return STR_286
		// case 287: return STR_287
		// case 288: return STR_288
		// case 289: return STR_289
		// case 290: return STR_290
		// case 291: return STR_291
		// case 292: return STR_292
		// case 293: return STR_293
		// case 294: return STR_294
		// case 295: return STR_295
		// case 296: return STR_296
		// case 297: return STR_297
		// case 298: return STR_298
		// case 299: return STR_299


        // case: return nil
	}
	return "loading..."
}
