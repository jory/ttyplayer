var util = require('util');

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

                var out = [];
                var frame = ttyrec.frames[index];
                for (var i = 0, il = frame.length; i < il; i++) {
                    var row = frame[i];
                    for (var j = 0, jl = row.length; j < jl; j++) {
                        var char = row[j];
                        if (typeof char === "number") {
                            char = ttyrec.frames[char][i][j];
                        }
                        out.push(char.char);
                    }
                    out.push("\n");
                }

                console.log(out.join(''));
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
