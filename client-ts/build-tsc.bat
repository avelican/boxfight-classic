@echo off

REM disabled because for some reason we can't use tsconfig that way.. lame!
REM call tsc src/game.ts --outfile build/game.js
call tsc


if not exist build mkdir build
pushd build


if "%1" == "rel" (
	rem optimize js
	rem ( there are other js files but they're already tiny and/or minified )
	call terser game.js -o game.js
	REM it's not game.min.js because then we'd need two HTML files or conditionally generate them
)


copy ..\src\index.html index.html

REM tsc handles this one
rem copy ..\src\game.js game.js

copy ..\src\samjs.min.js samjs.min.js
copy ..\src\riffwave.js riffwave.js
copy ..\src\jsfxr_presets.js jsfxr_presets.js
copy ..\src\sfxr.js sfxr.js

if "%1" == "rel" (
	rem gzip compress the files for efficient transfer to browser
	7z a -tgzip index.html.gz index.html
	7z a -tgzip game.js.gz game.js
	7z a -tgzip samjs.min.js.gz samjs.min.js
	7z a -tgzip riffwave.js.gz riffwave.js
	7z a -tgzip sfxr.js.gz sfxr.js
)

popd