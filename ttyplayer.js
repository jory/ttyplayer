var fileParser = require('./file-parser');
var ttyrecDecoder = require('./ttyrec-decoder');

module.exports = function (file) {
    fileParser(file, function (err, parsed) {
        ttyrecDecoder(parsed, function (err, ttyrec) {
            console.log(Object.keys(ttyrec));
            console.log(ttyrec.frames.length);

            var index = 420;
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
        });
    });
};
