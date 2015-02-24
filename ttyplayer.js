var fileParser = require('./file-parser');
var ttyrecDecoder = require('./ttyrec-decoder');

module.exports = function (file) {

    fileParser(file, function (err, parsed) {
        ttyrecDecoder(parsed, function (err, ttyrec) {
        });
    });

        var print_buffer = function () {

        var print_cell = function(i, j, q) {

            var c = buffer[i - 1][j - 1];
            if (c == undefined) {
                c = '<span>&nbsp;</span>';
            }

            cells[q].html(c);
        };

        if (update_lines['-1']) {
            update_chars = {};
            update_lines = {};

            var m = buffer.length;
            for (var n = 1; n <= m; n++) {
                update_lines[n] = true;
            }

            for (var i = 1; i + m <= HEIGHT; i++) {
                for (var j = 1; j <= WIDTH; j++) {
                    cells[(i + m) + '_' + j].html('<span>&nbsp;</span>');
                }
            }
        }

        for (var point in update_chars) {
            var points = point.split('_');
            var i = points[0];

            // Skip any character that will be covered by a line printing.
            if (update_lines[i]) {
                continue;
            }

            print_cell(parseInt(i), parseInt(points[1]), point);
        }

        for (var line in update_lines) {
            var i = parseInt(line);

            for (var j = 1; j <= WIDTH; j++) {
                print_cell(i, j, line + '_' + j);
            }
        }

        update_chars = {};
        update_lines = {};
    };

    var print_frame = function(i) {
        if (should_print) {
            print_buffer();
            should_print = false;
        }
    };

    var play_data = function() {

        if (!playing) {
            playing = true;
            $("#play").attr("disabled", "t");
            $("#pause").attr("disabled", "");
        }

        next_frame();
    };

    var stop_data = function() {

        if (playing) {
            playing = false;
            $("#pause").attr("disabled", "t");
            $("#play").attr("disabled", "");
        }

        window.clearTimeout(timeout);
    };

    var get_ttyrec = function() {
        return ttyrec;
    };

    return {
        reset_buffer: reset_buffer,

        goto_frame: goto_frame,

        next_frame: next_frame,

        print_frame: print_frame,

        play_data: play_data,

        stop_data: stop_data,

        get_ttyrec: get_ttyrec
    };
};
