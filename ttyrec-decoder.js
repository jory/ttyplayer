var Hoek = require('hoek');

// Constants - (Which aren't actually constant, probably...)
var HEIGHT = 24;
var WIDTH = 80;

var regexp = new RegExp('\\x1b[[]([?]?[0-9;]*)([A-Za-z])');
var partRegexp = new RegExp('\\x1b([[][?]?[0-9;]*)?');

module.exports = function (parsed, callback) {
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
            if (update_lines[points[0]]) {
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
};

function TTYDecoder (parsed, callback) {
    if (!(this instanceof TTYDecoder)) {
        return new TTYDecoder(parsed, callback);
    }

    this.frames = [];

    this.resetBuffer();

    this.frames[0] = Hoek.clone(this.buffer);

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

    return this;
};

TTYDecoder.prototype.resetBuffer = function () {
    this.resetCursor();
    this.resetMargins();
    this.resetRendition();

    this.buffer = new Array(HEIGHT);
    for (var i = 0; i < HEIGHT; i++) {
        this.buffer[i] = new Array(WIDTH);
        for (var j = 0; j < WIDTH; j++) {
            this.buffer[i][j] = store_character(' ');
        }
    }

    this.prepend = '';

    this.updateLines = {};
    this.updateChars = {};

    this.shouldPrint = false;
};

TTYDecoder.prototype.resetCursor = function () {
    this.x = 1;
    this.y = 1;
    this.showCursor = false;
};

TTYDecoder.prototype.resetMargins = function () {
    this.marginTop = 1;
    this.marginBottom = HEIGHT;
};

TTYDecoder.prototype.resetRendition = function () {
    this.foreground = 'white';
    this.background = 'black';
    this.light = false;
    this.negative = false;
};

TTYDecoder.prototype.initRows = function (n) {
    for (var i = 0; i < n; i++) {
        if (this.buffer[this.y + i] == undefined) {
            this.buffer[this.y + i] = [];
        }
    }
};

TTYDecoder.prototype.up = function (n) {
    if (this.y === 1) return;
    if (isNaN(n)) n = 1;

    this.y -= n;

    if (this.y < 1) this.y = 1;
};

TTYDecoder.prototype.back = function (n) {
    if (this.x === 1) return;
    if (isNaN(n)) n = 1;

    this.x -= n;

    if (this.x < 1) this.x = 1;
};

TTYDecoder.prototype.down = function (n) {
    if (isNaN(n)) n = 1;
    this.initRows(n);
    this.y += n;
};

TTYDecoder.prototype.forward = function (n) {
    if (isNaN(n)) n = 1;
    this.x += n;
};

TTYDecoder.prototype.nextLine = function (n) {
    this.down(n);
    this.x = 1;
};

TTYDecoder.prototype.prevLine = function (n) {
    this.up(n);
    this.x = 1;
};

TTYDecoder.prototype.horizontalAbsolute = function (n) {
    if (isNaN(n)) {
        console.error('Undefined behaviour for cursor_horizontal_absolute');
        return;
    }
    this.x = n;
};

TTYDecoder.prototype.position = function (row, col) {
    if (row < this.y) {
        this.up(this.y - row);
    }
    else if (row > this.y) {
        this.down(row - this.y);
    }
    this.x = col;
};

TTYDecoder.prototype.eraseData = function (n) {
    if (isNaN(n)) n = 0;

    var i, j;

    if (n == 0) {
        // Clear from the cursor to the end of the buffer.
        this.buffer[this.y - 1].splice(this.x - 1);
        this.buffer.splice(this.y);
        this.initRows(HEIGHT - this.y);

        if (this.updateLines['-1'] == undefined) {
            if (this.updateLines[this.y] == undefined) {
                for (i = this.x; i <= WIDTH; i++) {
                    this.updateChars[this.y + '_' + i] = true;
                }
            }

            for (j = this.y + 1; j <= HEIGHT; j++) {
                this.updateLines[j] = true;
            }
        }
    } else if (n == 1) {
        // Clear from the cursor to beginning of buffer.
        for (i = 0; i < this.y - 1; i++) {
            this.buffer[i] = [];
        }

        for (j = 0; j < this.x; j++) {
            this.buffer[this.y - 1][j] = undefined;
        }

        if (this.updateLines['-1'] == undefined) {
            for (i = 1; i < this.y; i++) {
                this.updateLines[i] = true;
            }

            if (this.updateLines[this.y] == undefined) {
                for (j = 1; j <= this.x; j++) {
                    this.updateChars[this.y + '_' + j] = true;
                }
            }
        }
    } else if (n == 2) {
        this.buffer = [[]];

        // Moving the cursor might not be the right behaviour.
        this.x = 1;
        this.y = 1;

        this.initRows(HEIGHT - this.y);

        this.updateLines['-1'] = true;
    } else {
        console.error('Undefined behaviour for eraseData.');
    }
};

TTYDecoder.prototype.eraseInLine = function (n) {
    if (isNaN(n)) n = 0;

    var i, j;

    if (n == 0) {
        this.buffer[this.y - 1].splice(this.x - 1);

        if (this.updateLines['-1'] == undefined &&
            this.updateLines[this.y] == undefined) {
            for (i = this.x; i <= WIDTH; i++) {
                this.updateChars[this.y + '_' + i] = true;
            }
        }
    } else if (n == 1) {
        for (i = 0; i < this.x; i++) {
            this.buffer[this.y - 1][i] = undefined;
        }

        if (this.updateLines['-1'] == undefined &&
            this.updateLines[this.y] == undefined) {
            for (j = 1; j <= this.x; j++) {
                this.updateChars[this.y + '_' + j] = true;
            }
        }
    } else if (n == 2) {
        this.buffer[this.y - 1] = [];

        if (this.updateLines['-1'] == undefined) {
            this.updateLines[this.y] = true;
        }
    } else {
        console.error('Undefined behaviour for eraseInLine.');
    }
};

TTYDecoder.prototype.eraseCharacters = function (n) {
    for (var i = 0; i < n; i++) {
        this.buffer[this.y - 1][this.x - 1 + i] = undefined;
    }

    if (this.updateLines['-1'] == undefined &&
        this.updateLines[this.y] == undefined) {
        for (var j = 0; i < n; i++) {
            this.updateChars[this.y + '_' + (this.x + i)] = true;
        }
    }
};

TTYDecoder.prototype.deleteLine = function (n) {
    if (isNaN(n)) n = 1;

    this.buffer.splice(this.y - 1, n);

    if (this.updateLines['-1'] == undefined) {
        for (var i = 0; this.y + i <= HEIGHT; i++) {
            this.updateLines[(this.y + i)] = true;
        }
    }

    var offset = HEIGHT - n;
    for (var j = 0; offset + j < HEIGHT; j++) {
        this.buffer.push([]);
    }
};

TTYDecoder.prototype.deleteCharacter = function (n) {
    if (isNaN(n)) n = 1;

    this.buffer[this.y - 1].splice(this.x - 1, n);

    if (this.updateLines['-1'] == undefined &&
        this.updateLines[this.y] == undefined) {
        for (var i = 0; i <= (WIDTH - this.x); i++) {
            this.updateChars[this.y + '_' + (this.x + i)] = true;
        }
    }
};

TTYDecoder.prototype.insertLine = function (n) {
    if (isNaN(n)) n = 1;

    // I'm doing this really inefficiently / weirdly here...?
    for (var i = 0; i < n; i++) {
        this.buffer.splice(this.y - 1, 0, []);
    }
    this.buffer.splice(this.marginBottom, n);

    if (this.updateLines['-1'] == undefined) {
        for (var k = this.y; k <= this.marginBottom; k++) {
            this.updateLines[k] = true;
        }
    }
};

TTYDecoder.prototype.selectGraphicRendition = function (value) {
    if (value == '') {
        this.resetRendition();
    } else {
        var values = value.split(';');
        for (var i = 0, il = values.length; i < il; i++) {
            var val = parseInt(values[i]);

            switch (val) {
            case 0:
                this.resetRendition();
                break;
            case 1:
                this.light = true;
                break;
            case 5:
                // Blink.
                break;
            case 7:
                this.negative = true;
                break;
            case 27:
                this.negative = false;
                break;
            case 39:
                // Default text colour.
                this.foreground = 'white';
                break;
            case 49:
                // Default background colour.
                this.background = 'black';
                break;
            default:
                if ((val >= 30 && val <= 37) || (val >= 40 && val <= 47)) {

                    var background = false;
                    if ((val - 39) > 0) {
                        background = true;
                        val -= 40;
                    } else {
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
                        this.background = colour;
                    } else {
                        this.foreground = colour;
                    }
                } else {
                    console.error('Unhandled SGR parameter: ' + val);
                }
                break;
            }
        }
    }

};

TTYDecoder.prototype.setMargins = function (value) {
    var top = 1;
    var bottom = HEIGHT;

    if (value != '') {
        var values = value.split(';');
        if (values[0] != '') top = parseInt(values[0]);
        if (values.length == 2) bottom = parseInt(values[1]);
    }

    this.marginTop = top;
    this.marginBottom = bottom;
};

TTYDecoder.prototype.renderFrame = function (string) {

    this.string = this.prepend + string;
    this.prepend = '';

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
            if (string.search(partRegexp) != -1) {
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

TTYDecoder.prototype.outputCharacters = function (index) {
    var substring = '';

    if (index == -1) {
        substring = this.string;
        this.string = '';
    } else {
        substring = this.string.slice(0, index);
        this.string = this.string.slice(index);
    }

    for (var i = 0, j = 0, k = 0, il = substring.length; i < il; i++) {
        if (i + j + 1 > substring.length) {
            break;
        }

        var character = substring[i + j];

        if (! character) { debugger };

        var code = character.charCodeAt(0);

        if (code < 32) {
            if (code == 8) {
                // Backspace
                if (this.show) {
                    this.buffer[this.y - 1][this.x - 1] = undefined;

                    if (this.updateLines['-1'] == undefined &&
                        this.updateLines[this.y] == undefined) {
                        this.updateChars[this.y + '_' + this.x] = true;
                    }
                }
                this.x--;

            } else if (code == 10) {
                // LF
                this.buffer.splice(this.y, 0, []);
                this.buffer.splice(this.marginTop - 1, 1);

                if (this.updateLines['-1'] == undefined) {
                    for (k = this.marginTop; k <= this.y; k++) {
                        this.updateLines[k] = true;
                    }
                }

            } else if (code == 13) {
                // CR
                this.x = 1;
                this.y++;

                if (this.y > HEIGHT) {
                    this.y = HEIGHT;
                }

                if (this.buffer[this.y - 1] == undefined) {
                    this.buffer[this.y - 1] = [];
                }

                this.updateLines[this.y] = true;

            } else if (code == 27) {
                // ESC
                var next = substring[i + j + 1];
                if (next == '7') {
                    console.log('save_cursor');
                    j++;
                } else if (next == '8') {
                    console.log('restore_cursor');
                    j++;
                } else if (next == 'M') {
                    // Reverse LF
                    this.buffer.splice(this.y - 1, 0, []);
                    this.buffer.splice(this.marginBottom, 1);

                    if (this.updateLines['-1'] == undefined) {
                        for (k = this.y; k <= this.marginBottom; k++) {
                            this.updateLines[k] = true;
                        }
                    }

                    j++;
                } else {
                    console.error('Unhandled ESC followed by: ' + next);
                }
            } else {
                console.error('Unhandled non-printing character, code: ' + code);
            }
        } else {
            this.buffer[this.y - 1][this.x - 1] = this.storeCharacter(character);

            if (this.updateLines['-1'] == undefined &&
                this.updateLines[this.y] == undefined) {
                this.updateChars[this.y + '_' + this.x] = true;
            }

            this.x++;
        }
    }
    this.shouldPrint = true;
};

TTYDecoder.prototype.handleEsc = function () {
    var match = this.string.match(regexp);

    var c = match[2];
    var value = match[1];
    var n = parseInt(value);

    switch (c) {
    case 'A': this.up(n); break;
    case 'B': this.down(n); break;
    case 'C': this.forward(n); break;
    case 'D': this.back(n); break;
    case 'E': this.nextLine(n); break;
    case 'F': this.prevLine(n); break;
    case 'G': this.horizontalAbsolute(n); break;
    case 'J': this.eraseData(n); break;
    case 'K': this.eraseInLine(n); break;
    case 'L': this.insertLine(n); break;
    case 'M': this.deleteLine(n); break;
    case 'P': this.deleteCharacter(n); break;
    case 'X': this.eraseCharacters(n); break;

    case 'd': this.position(n, this.x); break;
    case 'm': this.selectGraphicRendition(value); break;
    case 'r': this.setMargins(value); break;

    case 'H':
    case 'f':
        var x = 1, y = 1;
        if (value != '') {
            var values = value.split(';');
            if (values[0] != '') y = parseInt(values[0]);
            if (values.length == 2) x = parseInt(values[1]);
        }
        this.position(y, x);
        break;

    case 'h':
        if (value == '?25') this.show = true;
        break;

    case 'l':
        if (value == '?25') {
            this.show = false;
            this.buffer[this.y - 1][this.x - 1] = undefined;
            this.shouldPrint = true;
        }
        break;

    case 'S': console.log('scrollUp'); break;
    case 'T': console.log('scrollDown'); break;

    default:
        console.error('Unhandled escape sequence: ' + match[0]);
        break;
    }

    this.string = this.string.slice(match[0].length);
};

TTYDecoder.prototype.storeCharacter = function (char) {
    var background = this.background;
    var foreground = this.foreground;

    if (this.light) {
        background = 'bright' + capitalize(background);
        foreground = 'bright' + capitalize(foreground);
    }

    return {
        char: char,
        foreground: this.negative ? background : foreground,
        background: this.negative ? foreground : background
    };
};

function capitalize (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};
