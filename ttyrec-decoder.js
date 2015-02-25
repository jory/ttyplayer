var Hoek = require('hoek');

// Constants - (Which aren't actually constant, probably...)
var HEIGHT = 24;
var WIDTH = 80;

module.exports = function (parsed, callback) {
    var ttyrec = {};
    ttyrec.frames = [];

    var numFrames = 0;

    // State variables
    var buffer, cursor, margins, rendition, pre_pend, should_print,
        update_lines, update_chars;

    var copyForward = function(index) {
        for (var bl = buffer.length; index < bl; index++) {
            var row = buffer[index];
            for (var r = 0, rl = row.length; r < rl; r++) {
                var atom = row[r];
                if (typeof atom === "number") {
                    row[r] = buffer[atom][r];
                }
            }
        }
    };

    var copyBackwards = function(index) {
        for (; index > 0; index--) {
            var row = buffer[index];
            for (var r = 0, rl = row.length; r < rl; r++) {
                var atom = row[r];
                if (typeof atom === "number") {
                    row[r] = buffer[atom][r];
                }
            }
        }
    };
    var reset_buffer = function() {
        // index = -1;  // Hmm... not entirely sure how that relates to the 'i' I was previously calling 'index'

        reset_cursor();
        reset_margins();
        reset_rendition();

        buffer = new Array(HEIGHT);
        for (var i = 0; i < HEIGHT; i++) {
            buffer[i] = new Array(WIDTH);
            for (var j = 0; j < WIDTH; j++) {
                buffer[i][j] = store_character(' ');
            }
        }

        pre_pend = '';

        update_lines = {};
        update_chars = {};

        should_print = false;
    };

    var reset_cursor = function() {
        cursor = {
            x: 1,
            y: 1,
            show: false
        };
    };

    var reset_margins = function() {
        margins = {
            top: 1,
            bottom: HEIGHT
        };
    };

    var reset_rendition = function () {
        rendition = {
            foreground: 'white',
            background: 'black',
            light: false,
            negative: false
        };
    };

    var capitalize = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    var store_character = function(char) {

        var background = rendition.background;
        var foreground = rendition.foreground;

        if (rendition.light) {
            background = 'bright' + capitalize(background);
            foreground = 'bright' + capitalize(foreground);
        }

        return {
            char: char,
            foreground: rendition.negative ? background : foreground,
            background: rendition.negative ? foreground : background
        };
    };

    var render_frame = function (string) {

        string = pre_pend + string;
        pre_pend = '';

        var regexp = new RegExp('\\x1b[[]([?]?[0-9;]*)([A-Za-z])');
        var part_regexp = new RegExp('\\x1b([[][?]?[0-9;]*)?');

        var output_characters = function (index) {
            var substring = '';

            if (index == -1) {
                substring = string;
                string = '';
            }
            else {
                substring = string.slice(0, index);
                string = string.slice(index);
            }

            var j = 0;

            for (var i = 0, il = substring.length; i < il; i++) {

                if (i + j + 1 > substring.length) {
                    break;
                }

                var character = substring[i + j];

                if (! character) { debugger };

                var code = character.charCodeAt(0);

                if (code < 32) {
                    if (code == 8) {
                        // Backspace
                        if (cursor.show) {
                            buffer[cursor.y - 1][cursor.x - 1] = undefined;

                            if (update_lines['-1'] == undefined &&
                                update_lines[cursor.y] == undefined) {
                                update_chars[cursor.y + '_' + cursor.x] = true;
                            }
                        }
                        cursor.x--;
                    }
                    else if (code == 10) {
                        // LF

                        copyForward(cursor.y);

                        buffer.splice(cursor.y, 0, []);
                        buffer.splice(margins.top - 1, 1);

                        if (update_lines['-1'] == undefined) {
                            for (var k = margins.top; k <= cursor.y; k++) {
                                update_lines[k] = true;
                            }
                        }
                    }
                    else if (code == 13) {
                        // CR
                        cursor.x = 1;
                        cursor.y++;

                        if (cursor.y > HEIGHT) {
                            cursor.y = HEIGHT;
                        }

                        if (buffer[cursor.y - 1] == undefined) {
                            buffer[cursor.y - 1] = [];
                        }

                        update_lines[cursor.y] = true;
                    }
                    else if (code == 27) {
                        // ESC
                        var next = substring[i + j + 1];
                        if (next == '7') {
                            console.log('save_cursor');
                            j++;
                        }
                        else if (next == '8') {
                            console.log('restore_cursor');
                            j++;
                        }
                        else if (next == 'M') {
                            // Reverse LF

                            copyBackwards(cursor.y - 1);

                            buffer.splice(cursor.y - 1, 0, []);
                            buffer.splice(margins.bottom, 1);

                            if (update_lines['-1'] == undefined) {
                                for (var k = cursor.y; k <= margins.bottom; k++) {
                                    update_lines[k] = true;
                                }
                            }

                            j++;
                        }
                        else {
                            console.error('Unhandled ESC followed by: ' + next);
                        }
                    }
                    else {
                        console.error('Unhandled non-printing character, code: ' + code);
                    }
                }
                else {
                    buffer[cursor.y - 1][cursor.x - 1] = store_character(character);

                    if (update_lines['-1'] == undefined &&
                        update_lines[cursor.y] == undefined) {
                        update_chars[cursor.y + '_' + cursor.x] = true;
                    }

                    cursor.x++;
                }
            }

            should_print = true;
        };

        var handle_esc = function() {

            var init_rows = function(n) {
                for (var i = 0; i < n; i++) {
                    if (buffer[cursor.y + i] == undefined) {
                        buffer[cursor.y + i] = [];
                    }
                }
            };

            var cursor_up = function(n) {
                if (cursor.y == 1) return;
                if (isNaN(n)) n = 1;

                cursor.y -= n;

                if (cursor.y < 1) cursor.y = 1;
            };

            var cursor_down = function(n) {
                if (isNaN(n)) n = 1;

                init_rows(n);
                cursor.y += n;
            };

            var cursor_forward = function(n) {
                if (isNaN(n)) n = 1;

                cursor.x += n;
            };

            var cursor_back = function(n) {
                if (cursor.x == 1) return;
                if (isNaN(n)) n = 1;

                cursor.x -= n;

                if (cursor.x < 1) cursor.x = 1;
            };

            var cursor_next_line = function(n) {
                cursor_down(n);
                cursor.x = 1;
            };

            var cursor_prev_line = function(n) {
                cursor_up(n);
                cursor.x = 1;
            };

            var cursor_horizontal_absolute = function(n) {
                if (isNaN(n)) {
                    console.error('Undefined behaviour for cursor_horizontal_absolute');
                    return;
                }

                cursor.x = n;
            };

            var cursor_position = function(row, column) {
                if (row < cursor.y) {
                    cursor_up(cursor.y - row);
                }
                else if (row > cursor.y) {
                    cursor_down(row - cursor.y);
                }

                cursor.x = column;
            };

            var erase_data = function(n) {
                if (isNaN(n)) n = 0;
                if (n == 0) {
                    // Clear from the cursor to the end of the buffer.
                    buffer[cursor.y - 1].splice(cursor.x - 1);
                    buffer.splice(cursor.y);
                    init_rows(HEIGHT - cursor.y);

                    if (update_lines['-1'] == undefined) {
                        if (update_lines[cursor.y] == undefined) {
                            for (var i = cursor.x; i <= WIDTH; i++) {
                                update_chars[cursor.y + '_' + i] = true;
                            }
                        }

                        for (var j = cursor.y + 1; j <= HEIGHT; j++) {
                            update_lines[j] = true;
                        }
                    }
                }
                else if (n == 1) {
                    // Clear from the cursor to beginning of buffer.
                    for (var i = 0; i < cursor.y - 1; i++) {
                        buffer[i] = [];
                    }

                    for (var j = 0; j < cursor.x; j++) {
                        buffer[cursor.y - 1][j] = undefined;
                    }

                    if (update_lines['-1'] == undefined) {
                        for (var i = 1; i < cursor.y; i++) {
                            update_lines[i] = true;
                        }

                        if (update_lines[cursor.y] == undefined) {
                            for (var j = 1; j <= cursor.x; j++) {
                                update_chars[cursor.y + '_' + j] = true;
                            }
                        }
                    }
                }
                else if (n == 2) {
                    buffer = [[]];

                    // Moving the cursor might not be the right behaviour.
                    cursor.x = 1;
                    cursor.y = 1;

                    init_rows(HEIGHT - cursor.y);

                    update_lines['-1'] = true;
                }
                else {
                    console.error('Undefined behaviour for erase_data.');
                }
            };

            var erase_in_line = function(n) {
                if (isNaN(n)) n = 0;
                if (n == 0) {
                    buffer[cursor.y - 1].splice(cursor.x - 1);

                   if (update_lines['-1'] == undefined &&
                       update_lines[cursor.y] == undefined) {
                       for (var i = cursor.x; i <= WIDTH; i++) {
                           update_chars[cursor.y + '_' + i] = true;
                       }
                   }
                }
                else if (n == 1) {
                    for (var i = 0; i < cursor.x; i++) {
                        buffer[cursor.y - 1][i] = undefined;
                    }

                   if (update_lines['-1'] == undefined &&
                       update_lines[cursor.y] == undefined) {
                       for (var j = 1; j <= cursor.x; j++) {
                           update_chars[cursor.y + '_' + j] = true;
                       }
                   }
                }
                else if (n == 2) {
                    buffer[cursor.y - 1] = [];

                    if (update_lines['-1'] == undefined) {
                        update_lines[cursor.y] = true;
                    }
                }
                else {
                    console.error('Undefined behaviour for erase_in_line.');
                }
            };

            var erase_characters = function(n) {
                for (var i = 0; i < n; i++) {
                    buffer[cursor.y - 1][cursor.x - 1 + i] = undefined;
                }

                if (update_lines['-1'] == undefined &&
                    update_lines[cursor.y] == undefined) {
                    for (var i = 0; i < n; i++) {
                        update_chars[cursor.y + '_' + (cursor.x + i)] = true;
                    }
                }
            };

            var delete_line = function(n) {
                if (isNaN(n)) n = 1;

                buffer.splice(cursor.y - 1, n);

                if (update_lines['-1'] == undefined) {
                    for (var i = 0; cursor.y + i <= HEIGHT; i++) {
                        update_lines[(cursor.y + i)] = true;
                    }
                }

                var offset = HEIGHT - n;
                for (var j = 0; offset + j < HEIGHT; j++) {
                    buffer.push([]);
                }
            };

            var delete_character = function(n) {
                if (isNaN(n)) n = 1;

                buffer[cursor.y - 1].splice(cursor.x - 1, n);

                if (update_lines['-1'] == undefined &&
                    update_lines[cursor.y] == undefined) {
                    for (var i = 0; i <= (WIDTH - cursor.x); i++) {
                        update_chars[cursor.y + '_' + (cursor.x + i)] = true;
                    }
                }

            };

            var insert_line = function(n) {
                if (isNaN(n)) n = 1;

                for (var i = 0; i < n; i++) {
                    buffer.splice(cursor.y - 1, 0, []);
                }
                buffer.splice(margins.bottom, n);

                if (update_lines['-1'] == undefined) {
                    for (var k = cursor.y; k <= margins.bottom; k++) {
                        update_lines[k] = true;
                    }
                }
            };

            var select_graphic_rendition = function(value) {
                if (value == '') {
                    reset_rendition();
                }
                else {
                    var values = value.split(';');
                    var l = values.length;
                    for (var i = 0; i < l; i++) {
                        var val = parseInt(values[i]);
                        if (val == 0) {
                            reset_rendition();
                        }
                        else if (val == 1) {
                            rendition.light = true;
                        }
                        else if (val == 5) {
                            // Blink.
                        }
                        else if (val == 7) {
                            rendition.negative = true;
                        }
                        else if (val == 27) {
                            rendition.negative = false;
                        }
                        else if (val == 39) {
                            // Default text colour.
                            rendition.foreground = 'white';
                        }
                        else if (val == 49) {
                            // Default background colour.
                            rendition.background = 'black';
                        }
                        else if ((val >= 30 && val <= 37) || (val >= 40 && val <= 47)) {

                            var background = false;
                            if ((val - 39) > 0) {
                                background = true;
                                val -= 40;
                            }
                            else {
                                val -= 30;
                            }

                            var colour;
                            if (val == 0) colour = 'black';
                            else if (val == 1) colour = 'red';
                            else if (val == 2) colour = 'green';
                            else if (val == 3) colour = 'yellow';
                            else if (val == 4) colour = 'blue';
                            else if (val == 5) colour = 'magenta';
                            else if (val == 6) colour = 'cyan';
                            else if (val == 7) colour = 'white';

                            if (background) {
                                rendition.background = colour;
                            }
                            else {
                                rendition.foreground = colour;
                            }
                        }
                        else {
                            console.error('Unhandled SGR parameter: ' + val);
                        }
                    }
                }
            };

            var set_margins = function(value) {
                var top = 1;
                var bottom = 24;
                if (value != '') {
                    var values = value.split(';');
                    if (values[0] != '') top = parseInt(values[0]);
                    if (values.length == 2) bottom = parseInt(values[1]);
                }

                margins.top = top;
                margins.bottom = bottom;
            };

            var match = string.match(regexp);
            var c = match[2];
            var value = match[1];
            var n = parseInt(value);

            if (c == 'A') {
                cursor_up(n);
            }
            else if (c == 'B') {
                cursor_down(n);
            }
            else if (c == 'C') {
                cursor_forward(n);
            }
            else if (c == 'D') {
                cursor_back(n);
            }
            else if (c == 'E') {
                cursor_next_line(n);
            }
            else if (c == 'F') {
                cursor_prev_line(n);
            }
            else if (c == 'G') {
                cursor_horizontal_absolute(n);
            }
            else if (c == 'H') {
                var x = 1;
                var y = 1;
                if (value != '') {
                    var values = value.split(';');
                    if (values[0] != '') y = parseInt(values[0]);
                    if (values.length == 2) x = parseInt(values[1]);
                }
                cursor_position(y, x);
            }
            else if (c == 'J') {
                erase_data(n);
            }
            else if (c == 'K') {
                erase_in_line(n);
            }
            else if (c == 'L') {
                insert_line(n);
            }
            else if (c == 'M') {
                delete_line(n);
            }
            else if (c == 'P') {
                delete_character(n);
            }
            else if (c == 'S') {
                console.log('scroll_up');
            }
            else if (c == 'T') {
                console.log('scroll_down');
            }
            else if (c == 'X') {
                erase_characters(n);
            }
            else if (c == 'd') {
                cursor_position(n, cursor.x);
            }
            else if (c == 'f') {
                var x = 1;
                var y = 1;
                if (value != '') {
                    var values = value.split(';');
                    if (values[0] != '') y = parseInt(values[0]);
                    if (values.length == 2) x = parseInt(values[1]);
                }
                cursor_position(y, x);
            }
            else if (c == 'h' && value == '?25') {
                cursor.show = true;
            }

            else if (c == 'l' && value == '?25') {
                cursor.show = false;
                buffer[cursor.y - 1][cursor.x - 1] = undefined;
                should_print = true;
            }
            else if (c == 'm') {
                select_graphic_rendition(value);
            }
            else if (c == 'r') {
                set_margins(value);
            }
            else {
                console.error('Unhandled escape sequence: ' + match[0]);
            }

            string = string.slice(match[0].length);
        };

        // Remove shift-in and shift-out, as I have no idea what to do with them.
        string = string.replace(/\x0f/g, '');
        string = string.replace(/\x0e/g, '');

        if (cursor.show) {
            buffer[cursor.y - 1][cursor.x - 1] = store_character(' ');
            update_chars[cursor.y + '_' + cursor.x] = true;
        }

        while (string != '') {
            var i = string.search(regexp);

            if (i == -1) {
                // Have to see if the last few characters are a code that's been cut-off.
                if (string.search(part_regexp) != -1) {
                    pre_pend = string;
                    string = '';
                }
                else {
                    output_characters(i);
                }
            }
            else if (i > 0) {
                output_characters(i);
            }
            else if (i == 0) {
                handle_esc();
            }
        }

        if (cursor.show) {
            buffer[cursor.y - 1][cursor.x - 1] = store_character('_');
            update_chars[cursor.y + '_' + cursor.x] = true;
        }
    };

    var store_buffer = function () {

        var previousFrame = ttyrec.frames[numFrames];

        var newFrame = [];
        for (var i = 0; i < HEIGHT; i++) {
            newFrame[i] = new Array(WIDTH);
            for (var j = 0; j < WIDTH; j++) {
                var prev = previousFrame[i][j];
                if (typeof prev === "object") {
                    newFrame[i][j] = numFrames;
                } else if (typeof prev === "number"){
                    newFrame[i][j] = prev;
                } else {
                    console.warn("UHOH!");
                }
            }
        }

        if (update_lines['-1']) {
            update_chars = {};
            update_lines = {};

            var m = buffer.length;
            for (var n = 1; n <= m; n++) {
                update_lines[n] = true;
            }
        }

        for (var point in update_chars) {
            var points = point.split('_');
            var x = parseInt(points[0]) - 1;
            var y = parseInt(points[1]) - 1;

            // Skip any character that will be covered by a line printing.
            if (update_lines[x]) {
                continue;
            }

            var char = buffer[x][y];
            if (char === undefined) char = store_character(' ');
            newFrame[x][y] = char;
        }

        for (var line in update_lines) {
            var i = parseInt(line) - 1;
            for (var j = 0; j < WIDTH; j++) {
                var char = buffer[i][j];
                if (char === undefined) char = store_character(' ');
                newFrame[i][j] = char;
            }
        }

        update_chars = {};
        update_lines = {};

        ttyrec.frames[++numFrames] = newFrame;
    };

    var store_frame = function() {
        if (should_print) {
            store_buffer();
            should_print = false;
        }
    };

    reset_buffer();
    ttyrec.frames[0] = Hoek.clone(buffer);

    for (var i = 0, il = parsed.positions.length; i < il; i++) {
        var current = parsed.positions[i];

        render_frame(parsed.blob.slice(current.start, current.end));
        store_frame();

        var next = parsed.positions[i + 1];
        if (next) {
            var millisec;

            if (current.sec == next.sec) millisec = (next.usec - current.usec)/1000;
            else if (next.sec > current.sec) {
                millisec = ((next.sec - current.sec - 1) * 1000 +
                            ((1000000 - current.usec) + next.usec)/1000);
            }
            else {
                console.error('Frame ' + (index + 1) +
                              'reports an earlier time than frame ' + index);
                millisec = 0;
            }
        }
    }

    callback(null, ttyrec);
};
