@echo off

set STACK_SIZE=1048576
set HEAP_SIZE=67108864

call emsdk activate latest

if not exist build mkdir build
pushd build


call odin build ../src -target=freestanding_wasm32 -out:odin -build-mode:obj -debug -show-system-calls
call emcc -g --js-library ../src/js.js -o index.html ../src/main.c odin.wasm.o ../lib/libraylib.a -s USE_GLFW=3 -s GL_ENABLE_GET_PROC_ADDRESS -DWEB_BUILD -sSTACK_SIZE=%STACK_SIZE% -s TOTAL_MEMORY=%HEAP_SIZE% -sERROR_ON_UNDEFINED_SYMBOLS=0
rem -g for debug

rem optimize webassembly for size
rem running both of these commands does indeed help significantly
rem order doesn't seem to matter much, but haven't done much testing
wasm-strip index.wasm
wasm-opt -Oz index.wasm -o index.wasm

echo test1

rem optimize js
rem ( there are other js files but they're already tiny and/or minified )
call terser index.js -o index.js

echo test2

del index.html
copy ..\src\shell.html index.html
copy ..\src\samjs.min.js samjs.min.js
copy ..\src\riffwave.js riffwave.js
copy ..\src\jsfxr_presets.js jsfxr_presets.js
copy ..\src\sfxr.js sfxr.js

rem gzip compress the files for efficient transfer to browser

7z a -tgzip index.html.gz index.html
7z a -tgzip index.js.gz index.js
7z a -tgzip samjs.min.js.gz samjs.min.js
7z a -tgzip riffwave.js.gz riffwave.js
7z a -tgzip jsfxr_presets.js.gz jsfxr_presets.js
7z a -tgzip sfxr.js.gz sfxr.js
7z a -tgzip index.wasm.gz index.wasm

popd