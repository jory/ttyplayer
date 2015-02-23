var FileApi = require('file-api'),
    FileReader = FileApi.FileReader;

var LONG = 4;
var TIME = LONG * 2;

var parseLongAt = function(DOMString, offset) {
    var a = DOMString.charCodeAt(offset);
    var b = DOMString.charCodeAt(offset + 1);
    var c = DOMString.charCodeAt(offset + 2);
    var d = DOMString.charCodeAt(offset + 3);

    var long = (((((d << 8) + c) << 8) + b) << 8) + a;
    if (long < 0) long += 4294967296;

    return long;
};

module.exports = function (file, cb) {
    var ttyrec = {};
    ttyrec.positions = [];

    var offset = 0;
    var size = file.size;

    var parse_helper = function(evt) {

        ttyrec.blob = evt.target.result;

        while (offset < size) {
            var sec = parseLongAt(ttyrec.blob, offset);
            var usec = parseLongAt(ttyrec.blob, offset + LONG);
            var length = parseLongAt(ttyrec.blob, offset + TIME);

            offset += TIME + LONG;

            ttyrec.positions.push({
                sec: sec,
                usec: usec,
                start: offset,
                end: offset + length
            });

            offset += length;
        }

        cb(ttyrec);
    };

    var reader = new FileReader();
    reader.onload = parse_helper;
    reader.readAsBinaryString(file);
};
