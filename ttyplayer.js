var util = require('util');

var ansi = require('ansi'),
    cursor = ansi(process.stdout);

var keypress = require('keypress');
keypress(process.stdin);

var fileParser = require('./file-parser');
var ttyrecDecoder = require('./ttyrec-decoder');

module.exports = function (file) {
    fileParser(file, function (err, parsed) {
        ttyrecDecoder(parsed, function (err, ttyrec) {

            var printFrame = function (index) {
                console.log('\u001B[2J\u001B[0;0f');

                console.log("~> ", index);

                var frame = ttyrec.frames[index];
                for (var i = 0, il = frame.length; i < il; i++) {
                    var row = frame[i];
                    for (var j = 0, jl = row.length; j < jl; j++) {
                        var char = row[j];
                        if (typeof char === "number") {
                            char = ttyrec.frames[char][i][j];
                        }
                        cursor[char.foreground]();
                        cursor.bg[char.background]();
                        cursor.write(char.char);
                        cursor.reset();
                    }
                    cursor.write("\n");
                }
            };


            var index = 0;

            process.stdin.on('keypress', function (ch, key) {
                console.log('got "keypress"', key);
                if (key && key.ctrl && key.name == 'c') {
                    process.stdin.pause();
                } else {
                    printFrame(index++);
                }
            });

            process.stdin.setRawMode(true);
            process.stdin.resume();
        });
    });
};
