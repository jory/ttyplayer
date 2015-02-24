var util = require('util');

var fileParser = require('./file-parser');
var ttyrecDecoder = require('./ttyrec-decoder');

module.exports = function (file) {
    fileParser(file, function (err, parsed) {
        ttyrecDecoder(parsed, function (err, ttyrec) {
            console.log(Object.keys(ttyrec));
            console.log(ttyrec.frames.length);

            var index = 0;

            var blugh = function () {
                console.log('\u001B[2J\u001B[0;0f');

                var frame = ttyrec.frames[index];
                var string = "";

                for (var i = 0, il = frame.length; i < il; i++) {
                    var row = frame[i];
                    for (var j = 0, jl = row.length; j < jl; j++) {
                        var char = row[j];
                        if (typeof char === "number") {
                            string += ttyrec.frames[char][i][j].char;
                        } else if (typeof char === "object"){
                            string += char.char;
                        } else {
                            console.warn("MAJOR UHOH");
                        }
                    }
                    string += "\n";
                }

                console.log(string);

                if (index < ttyrec.frames.length) {
                    index++;
                    setTimeout(blugh, 0);
                }
            };

            blugh();
        });
    });
};
