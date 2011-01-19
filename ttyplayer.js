function TTYPlayer () {
	var frame = $('#frame');
	var binary = null;
	var ttyrec = null;
	var index = 0;
	var buffer = [[]];
	var point = {
		x: 1, y: 1
	};
	var render_frame = function (string) {

		var regexp = new RegExp('\\x1b\\[([0-9;]*)([dmGHJX])');
		var span = {
			foreground: 'white-fg',
			background: 'black-bg',
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
			
			var pre = '<span class="' + span.light + span.foreground + ' ' +
				span.background + '">';
			var post = '</span>';

			for (var i in substring) {
				var character = substring[i];
				if (character == ' ') {
					character = '&nbsp;';
				}

				buffer[point.y - 1][point.x - 1] = pre + character + post;
				point.x++;
			}
		};

		var handle_esc = function() {
			var match = string.match(regexp);
			var value = match[1];
			var c = match[2];

			if (c == 'm') {
				if (value == '') {
					span.foreground = 'white-fg';
					span.background = 'black-bg';
					span.light = '';
				}
				else {
					var values = value.split(';');
					var l = values.length;
					for (var i = 0; i < l; i++) {
						var val = values[i];
						if (val == '0') {
							span.foreground = 'white-fg';
							span.background = 'black-bg';
							span.light = '';
						}
						else if (val == '1') {
							span.light = 'light-';
						}
						else if (val == '30') {
							span.foreground = 'black-fg';
						}
						else if (val == '33') {
							span.foreground = 'yellow-fg';
						}
						else if (val == '37') {
							span.foreground = 'white-fg';
						}
						else if (val == '39') {
							span.foreground = 'white-fg';
						}
						else if (val == '40') {
							span.background = 'black-bg';
						}
						else if (val == '42') {
							span.background = 'green-bg';
						}
						else if (val == '49') {
							span.background = 'black-bg';
						}
						else {
							console.error('Unhandled SGR parameter: ' + val);
						}
					}
				}
			}
			else if (c == 'H') {
				// Moves the point
				if (value == '') {
					point.x = 1;
					point.y = 1;
				}
				else {
					var values = value.split(';');

					if (values[0] != '') {
						var n = parseInt(values[0]);
						for (var i = 0; i + point.y < n; i++) {
							if (buffer[point.y + i] == undefined) {
								buffer[point.y + i] = [];
							}
						}
						point.y = n;
					}
					else {
						point.y = 1;
					}

					if (values.length == 2) {
						point.x = parseInt(values[1]);
					}
					else {
						point.x = 1;
					}
				}
			}
			else if (c == 'G') {
				// Moves the point horizontally.
				point.x = parseInt(value);
			}
			else if (c == 'J') {
				// Clear the buffer
				if (value == '') {
					// Same as 0 case,
					// clear from point to end of buffer.
					console.error('[J needs implementing');
				}
				else {
					var n = parseInt(value);
					if (n == 0) {
						// Same as empty case,
						// clear from point to end of buffer.
						console.error('[0J needs implementing');
					}
					else if (n == 1) {
						// Clear from point to beginning of buffer.
						console.error('[1J needs implementing');
					}
					else if (n == 2) {
						buffer = [[]];
						point.x = 1;
						point.y = 1;
					}
					else {
						console.error('Unhandled value for J: ' + value);
					}
				}
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
		};

		string = string.replace(/\x0f/g, '');

		while (string != '') {
			var index = string.search(regexp);

			if (index == -1 || index > 0) {
				output_characters(index);
			}
			else if (index == 0) {
				handle_esc();
			}			
		}
		
		print_buffer();
	};

	return {
		get_ttyrec: function() {
			return ttyrec;
		},

		clear_frame: function() {
			buffer = [[]];
			point = { x:1, y: 1};
			render_frame('');
		},

		next_frame: function() {
			if (index < ttyrec.length) {
				var t = ttyrec[index];
				var s = binary.getStringAt(t.address, t.len);
				p.render_frame(s);
				index += 1;
			}
		},

		previous_frame: function() {
			if (index > 0) {
				var t = ttyrec[index];
				var s = binary.getStringAt(t.address, t.len);
				p.render_frame(s);
				index -= 1;
			}
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
}

var t = "\x1b[39;49m\x1b[37m\x1b[40m\x1b[H\x1b[2J\x1b[33m\x1b[40mWelcome, Shy.\x1b[0;1m\x0f\x1b[33m\x1b[40m Please select your species.\x1b[3;4H\x1b[0m\x0f\x1b[37m\x1b[40ma - Human\x1b[3;29Hi - Halfling\x1b[3;54Hq - Kenku\x1b[4;4Hb - High Elf\x1b[4;29Hj - Kobold\x1b[4;54Hr - Draconian\x1b[5;4Hc - Deep Elf\x1b[5;29Hk - Spriggan\x1b[5;54Hs - Demigod\x1b[6;4Hd - Sludge Elf\x1b[6;29Hl - Naga\x1b[6;54Ht - Demonspawn\x1b[7;4He - Mountain Dwarf\x1b[29Gm - Centaur\x1b[7;54Hu - Mummy\x1b[8;4H\x1b[37m\x1b[42mf - Deep Dwarf          \x1b[m\x0f\x1b[39;49m\x1b[37m\x1b[40m \x1b[37m\x1b[40mn - Ogre\x1b[8;54Hv - Ghoul\x1b[9;4Hg - Hill Orc\x1b[9;29Ho - Troll\x1b[9;54Hw - Vampire\x1b[10;4Hh - Merfolk\x1b[10;29Hp - Minotaur\x1b[17;4H\x1b[0;1m\x0f\x1b[37m\x1b[40mThey live deep down and cannot regenerate, but they are resilient and have\x1b[0m\x0f\x1b[30m\x1b[40m  \x1b[18;4H\x1b[0;1m\x0f\x1b[37m\x1b[40mtools to heal.\x1b[20;4H\x1b[0m\x0f\x1b[33m\x1b[40m+ - Viable Species\x1b[29G* - Random species\x1b[21;4H# - Viable character\x1b[m\x0f\x1b[39;49m\x1b[37m\x1b[40m     \x1b[33m\x1b[40m! - Random character\x1b[22;4H% - List aptitudes\x1b[m\x0f\x1b[39;49m\x1b[37m\x1b[40m   \x1b[33m\x1b[40mSpace - Pick background first\x1b[23;4H? - Help\x1b[23;27HTab - Deep Dwarf Chaos Knight\x1b[8;28H\x1b[m\x0f\x1b[39;49m\x1b[37m\x1b[40m";

var p;

$().ready(function() {
			  p = TTYPlayer();
			  p.render_frame(t);
			  BinaryAjax('foo.ttyrec', function (data) { p.parse_data(data); });
		  });
