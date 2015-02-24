var util = require('util');

var ansi = require('ansi'),
    cursor = ansi(process.stdout);

var fileParser = require('./file-parser');
var ttyrecDecoder = require('./ttyrec-decoder');

module.exports = function (file) {
    fileParser(file, function (err, parsed) {
        ttyrecDecoder(parsed, function (err, ttyrec) {
            var index = 0;
            var blugh = function () {
                console.log('\u001B[2J\u001B[0;0f');
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
                    }
                    cursor.write("\n");
                }

                if (index < ttyrec.frames.length) {
                    index++;
                    setTimeout(blugh, 0);
                }
            };
            blugh();
        });
    });
};
