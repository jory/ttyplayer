function TTYPlayer () {
	var binary = null;
	var ttyrec = null;
	var index = -1;

	var frame = $('#frame');
	var buffer = [[]];
	var output = '';
	var pre_pend = '';
	var point = {
		x: 1, y: 1
	};

	var render_frame = function (string) {
		string = pre_pend + string;
		pre_pend = '';

		output = string;

		var regexp = new RegExp('\\x1b[[][?]?([0-9;]*)([A-Za-z])');
		var part_regexp = new RegExp('\\x1b[[][?]?([0-9;]*)');
		var span = {
			foreground: 'white',
			background: 'black',
			light: ''
		};

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
			
			var pre = '<span class="' + span.light + span.foreground + '-fg ' +
				span.background + '-bg">';
			var post = '</span>';

			for (var i in substring) {
				var character = substring[i];
				var code = character.charCodeAt(0);

				if (code < 32) {
					if (code == 8) {
						// Backspace
						point.x--;
					}
					else if (code == 13) {
						// Carriage return
						point.x = 1;
						point.y++;
					}
					else {
						console.error('Unhandled non-printing character, code: ' + code);
					}
				}
				else {
					if (character == ' ') {
						character = '&nbsp;';
					}

					buffer[point.y - 1][point.x - 1] = pre + character + post;
					point.x++;					
				}
			}
		};

		var handle_esc = function() {

			var init_rows = function(n) {
				for (var i = 0; i < n; i++) {
					if (buffer[point.y + i] == undefined) {
						buffer[point.y + i] = [];
					}
				}
			};

			var cursor_up = function(n) {
				if (point.y == 1) return;
				if (isNaN(n)) n = 1;

				point.y -= n;

				if (point.y < 1) point.y = 1;
			};

			var cursor_down = function(n) {
				if (isNaN(n)) n = 1;

				init_rows(n);
				point.y += n;
			};

			var cursor_forward = function(n) {
				if (isNaN(n)) n = 1;

				point.x += n;
			};

			var cursor_back = function(n) {
				if (point.x == 1) return;
				if (isNaN(n)) n = 1;

				point.x -= n;

				if (point.x < 1) point.x = 1;
			};

			var cursor_next_line = function(n) {
				cursor_down(n);
				point.x = 1;
			};

			var cursor_prev_line = function(n) {
				cursor_up(n);
				point.x = 1;
			};

			var cursor_horizontal_absolute = function(n) {
				if (isNaN(n)) {
					console.error('Undefined behaviour for cursor_horizontal_absolute');
					return;
				}

				point.x = n;
			};

			var cursor_position = function(row, column) {
				if (row < point.y) {
					cursor_up(point.y - row);
				}
				else if (row > point.y) {
					cursor_down(row - point.y);
				}

				point.x = column;
			};

			var erase_data = function(n) {
				if (isNaN(n)) n = 0;
				if (n == 0) {
					// Clear from the cursor to the end of the buffer.
					buffer[point.y - 1].splice(point.x - 1);
					buffer.splice(point.y - 1);
				}
				else if (n == 1) {
					// Clear from the cursor to beginning of buffer.
					for (var i = 0; i < point.y - 1; i++) {
						buffer[i] = [];
					}

					for (var j = 0; j < point.x; j++) {
						buffer[point.y - 1][j] = undefined;
					}
				}
				else if (n == 2) {
					buffer = [[]];
					
					// Moving the cursor might not be the right behaviour.
					point.x = 1;
					point.y = 1;
				}
				else {
					console.error('Undefined behaviour for erase_data.');
				}
			};

			var erase_in_line = function(n) {
				if (isNaN(n)) n = 0;
				if (n == 0) {
					buffer[point.y - 1].splice(point.x - 1);
				}
				else if (n == 1) {
					for (var i = 0; i < point.x; i++) {
						buffer[point.y - 1][i] = undefined;
					}
				}
				else if (n == 2) {
					buffer[point.y - 1] = [];
				}
				else {
					console.error('Undefined behaviour for erase_in_line.');
				}
			};

			var delete_characters = function(n) {
				for (var i = 0; i < n; i++) {
					buffer[point.y - 1][point.x + i] = undefined;
				}
				cursor_forward(n);
			};

			var select_graphic_rendition = function(value) {
				if (value == '') {
					span.foreground = 'white';
					span.background = 'black';
					span.light = '';
				}
				else {
					var values = value.split(';');
					var l = values.length;
					for (var i = 0; i < l; i++) {
						var val = values[i];
						if (val == '0') {
							span.foreground = 'white';
							span.background = 'black';
							span.light = '';
						}
						else if (val == '1') {
							span.light = 'light-';
						}
						else if (val == '5') {
							// Blink.
						}
						else if (val == '7') {
							var temp = span.foreground;
							span.foreground = span.background;
							span.background = temp;
						}
						else if (val == '30') {
							span.foreground = 'black';
						}
						else if (val == '31') {
							span.foreground = 'red';
						}
						else if (val == '32') {
							span.foreground = 'green';
						}
						else if (val == '33') {
							span.foreground = 'yellow';
						}
						else if (val == '34') {
							span.foreground = 'blue';
						}
						else if (val == '35') {
							span.foreground = 'magenta';
						}
						else if (val == '36') {
							span.foreground = 'cyan';
						}
						else if (val == '37') {
							span.foreground = 'white';
						}
						else if (val == '39') {
							span.foreground = 'white';
						}
						else if (val == '40') {
							span.background = 'black';
						}
						else if (val == '41') {
							span.background = 'red';
						}
						else if (val == '42') {
							span.background = 'green';
						}
						else if (val == '43') {
							span.background = 'yellow';
						}
						else if (val == '44') {
							span.background = 'blue';
						}
						else if (val == '45') {
							span.background = 'magenta';
						}
						else if (val == '46') {
							span.background = 'cyan';
						}
						else if (val == '47') {
							span.background = 'white';
						}
						else if (val == '49') {
							span.background = 'black';
						}
						else {
							console.error('Unhandled SGR parameter: ' + val);
						}
					}
				}				
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
			else if (c == 'S') {
				console.error('scroll_up not defined.');
			}
			else if (c == 'T') {
				console.error('scroll_down not defined.');
			}
			else if (c == 'X') {
				// Delete n characters to the right of the point?
				delete_characters(n);
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
			else if (c == 'm') {
				select_graphic_rendition(value);
			}
			else if (c == 'd') {
				// Move the point downwards?
				cursor_position(n, point.x);
			}
			else if (match[0] == '[?25l') {
				console.error('hide_cursor not defined.');
			}
			else if (match[0] == '[?25h') {
				console.error('show_cursor not defined.');
			}
			else {
				console.error('Unhandled escape sequence: ' + match[0]);
			}

			string = string.slice(match[0].length);
		};

		var print_buffer = function () {
			frame.empty();			

			var m = buffer.length;
			for	(var i = 0; i < m; i++) {
				var row = buffer[i];
				var n = row.length;
				for (var j = 0; j < n; j++) {
					var character = row[j];
					if (character == undefined) {
						character = '<span>&nbsp;</span>';
					}
					frame.append(character);
				}
				frame.append('<br/>');
			}

			for (var j = 0; j + m < 24; j++) {
				frame.append('<span>&nbsp;</span><br/>');
			}
		};

		// Remove shift-in and shift-out, as I have no idea what to do with them.
		string = string.replace(/\x0f/g, '');
		string = string.replace(/\x0e/g, '');

		while (string != '') {
			var index = string.search(regexp);

			if (index == -1) {
				// Have to see if the last few characters are a code that's been cut-off.
				if (string.search(part_regexp) != -1) {
					pre_pend = string;
					string = '';
				}
				else {
					output_characters(index);
				}
			}
			else if ( index > 0) {
				output_characters(index);
			}
			else if (index == 0) {
				handle_esc();
			}			
		}
		
		print_buffer();
	};

	var print_frame = function(i) {
		var t = ttyrec[i];
		var s = binary.getStringAt(t.address, t.len);
		p.render_frame(s);
	};

	return {
		get_buffer: function() {
			return buffer;
		},

		get_index: function() {
			return index;
		},

		get_output: function() {
			return output;
		},

		get_point: function() {
			return point;
		},

		get_prepend: function() {
			return pre_pend;
		},

		get_ttyrec: function() {
			return ttyrec;
		},

		clear_frame: function() {
			buffer = [[]];
			point = { x:1, y: 1};
			render_frame('');
		},
		
		print_frame: print_frame,

		next_frame: function() {
			if (index < ttyrec.length) {
				index += 1;
				print_frame(index);
			}
		},

		previous_frame: function() {
			if (index > 0) {
				index -= 1;
				print_frame(index);
			}
		},

		set_frame: function(n) {
			index = n;
			print_frame(index);
		},

		parse_data: function (input) {
			binary = input.binaryResponse;
			ttyrec = [];

			var length = binary.getLength();
			var offset = 0;

			while (offset < length) {
				var sec = binary.getLongAt(offset + 0, false);
				var usec = binary.getLongAt(offset + 4, false);
				var len = binary.getLongAt(offset + 8, false);
				var address = offset + 12;

				ttyrec.push({ 
								sec: sec,
								usec: usec,
								len: len,
								address: address
							});

				offset += (12 + len);				
			}			
		},

		render_frame: render_frame
	};
};

var p;

$().ready(function() {
			  p = TTYPlayer();
			  BinaryAjax('Spec.ttyrec', function (data) { p.parse_data(data); p.set_frame(6); });
		  });

$('html').keydown(function(event) {
				if (event.keyCode == '37') {
					p.previous_frame();
				}
				else if (event.keyCode == '39') {
					p.next_frame();
				}
			});
