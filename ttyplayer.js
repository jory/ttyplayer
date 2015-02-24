var fileParser = require('./file-parser');
var ttyrecDecoder = require('./ttyrec-decoder');

module.exports = function (file) {

    fileParser(file, function (err, parsed) {
        ttyrecDecoder(parsed, function (err, ttyrec) {
            console.log(ttyrec.frames[42]);
        });
    });
};
