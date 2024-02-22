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

MAX_PLAYERS :: 32
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
        // case: return nil
	}
	return "loading..."
}
