# boxfight.xyz

http://boxfight.xyz

A very simple multiplayer fighting game with [Odin](https://github.com/odin-lang/Odin) and [Raylib](https://github.com/raysan5/raylib)

Special thanks to Caedo: https://github.com/Caedo/raylib_wasm_odin/

---

## WARNING

This was written for a game jam: [Low Level Game Dev's 7 day multiplayer game challenge](https://www.youtube.com/watch?v=NbhYi_I5T4A).

Do not expect sanity from anything you find here!

The server does not verify client inputs, so players can exercise their "creativity".

---

## NOTE

The game server will randomly assign you a world ( e.g. /123456 ).

You can send this to your friends to play together.

---

## Instructions

You will need both Windows and Linux. (Sorry.)

client side

`build.bat`

server side (linux)

`bun index.ts`

( Get Bun here https://github.com/oven-sh/bun )

The server acts both to serve the files, and as a websocket game server.

It just forwards messages. No game logic handled on server except join/quit messages.

---

## License

I dedicate this work to the public domain, except for the parts I didn't write.

raylib is licensed under zlib https://github.com/raysan5/raylib

jsfxr and its dependency riffwave.js are public domain https://github.com/chr15m/jsfxr

The game client is based on Caedo's repo, which currently has no license. (Awaiting response) https://github.com/Caedo/raylib_wasm_odin/

Software Automatic Mouth https://github.com/discordier/sam

Software Automatic Mouth is reverse engineered from proprietary software, so *technically* illegal, but also... the author attempted to contact them and got no response... so... yeah...

( If you start making millions of dollars with SAM, they might take notice ;)

---

## TODO

TODO: Port build.bat to Linux. Should be quite trivial.

TODO: Run server on port 80

TODO: Set up a systemd service

TODO: Figure out what Drain means in uWebSockets ... seemed fairly important

TODO: Add WebTransport ? I don't think Bun supports it yet and supporting both transport types in a single server might be tricky.

But a better protocol should greatly speed up loading, which is currently really bad when far from server due to all the back and forth of the handshake and WS upgrade.

