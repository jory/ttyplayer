function TTYPlayer () {
	var frame = $('#frame');
	var binary = null;
	var ttyrec = null;

	return {
		get_ttyrec: function() {
			return ttyrec;
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

		render_frame: function (data) {
			var string = data;

			var point = { x : 1, y : 1 };
			var regexp = new RegExp('\\x1b\\[([0-9;]*)([mHGJ])');
			var span = {
				foreground: 'white-fg',
				background: 'black-bg',
				light: ''
			};

			var output = [];

			var print = function(index) {
				output.push('<span class="' + span.light + span.foreground +
							' ' + span.background + '">');
				if (index == -1) {
					point.x += string.length;
					if (string.indexOf(' ') != -1) {
						string = string.replace(/ /g, '&nbsp;');
					}
					output.push(string);
					string = '';
				}
				else {
					var substring = string.slice(0, index);
					if (substring.indexOf(' ') != -1) {
						substring = substring.replace(/ /g, '&nbsp;');
					}
					output.push(substring);
					point.x += index;
					string = string.slice(index);
				}
				output.push('</span>');
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
					if (value == '') {
						// point.x = 1;
						// point.y = 1;
					}
					else {
						var n = point.y;
						var m = point.x;

						var values = value.split(';');

						if (values[0] != '') {
							n = parseInt(values[0]);
						}
						if (values.length == 2) {
							m = parseInt(values[1]);
						}

						if (n > point.y) {
							var diff = n - point.y;

							output.push('<br/>');
							for (var i = 1; i < diff; i++) {
								output.push('<div>&nbsp;</div>');
							}

							point.y = n;
							point.x = 1;
						}


						var diff = m - point.x;

						output.push('<span>');
						for (var i = 0; i < diff; i++) {
							output.push('&nbsp');
						}
						output.push('</span>');

						point.x = m;
					}
				}
				else if (c == 'G') {
					var m = parseInt(value);

					var diff = m - point.x;

					output.push('<span>');
					for (var i = 0; i < diff; i++) {
						output.push('&nbsp');
					}
					output.push('</span>');

					point.x = m;
				}
				else if (c == 'J') {
					var n = parseInt(value);
					if (n == 2) {
						frame.empty();
						point.x = 1;
						point.y = 1;
					}
					else {
						console.error('Unhandled value for J: ' + value);
					}
				}
				else {
					console.error('Unhandled escape sequence: ' + match[0]);
				}

				string = string.slice(match[0].length);
			};

			// Done with definitions!

			frame.empty();

			// Until we know what this character does, get rid of it outright.
			string = string.replace(/\x0f/g, '');

			console.log(string);

			while (string != '') {
				var index = string.search(regexp);

				if (index == -1) {
					print(index);
				}
				else if (index > 0) {
					print(index);
					// handle_esc();
				}
				else if (index == 0) {
					handle_esc();
				}			
			}

			// Now append the whole chunk to the frame.
			frame.append(output.join(''));
		}
	};
}

var t = "\x1b[39;49m\x1b[37m\x1b[40m\x1b[H\x1b[2J\x1b[33m\x1b[40mWelcome, Shy.\x1b[0;1m\x0f\x1b[33m\x1b[40m Please select your species.\x1b[3;4H\x1b[0m\x0f\x1b[37m\x1b[40ma - Human\x1b[3;29Hi - Halfling\x1b[3;54Hq - Kenku\x1b[4;4Hb - High Elf\x1b[4;29Hj - Kobold\x1b[4;54Hr - Draconian\x1b[5;4Hc - Deep Elf\x1b[5;29Hk - Spriggan\x1b[5;54Hs - Demigod\x1b[6;4Hd - Sludge Elf\x1b[6;29Hl - Naga\x1b[6;54Ht - Demonspawn\x1b[7;4He - Mountain Dwarf\x1b[29Gm - Centaur\x1b[7;54Hu - Mummy\x1b[8;4H\x1b[37m\x1b[42mf - Deep Dwarf          \x1b[m\x0f\x1b[39;49m\x1b[37m\x1b[40m \x1b[37m\x1b[40mn - Ogre\x1b[8;54Hv - Ghoul\x1b[9;4Hg - Hill Orc\x1b[9;29Ho - Troll\x1b[9;54Hw - Vampire\x1b[10;4Hh - Merfolk\x1b[10;29Hp - Minotaur\x1b[17;4H\x1b[0;1m\x0f\x1b[37m\x1b[40mThey live deep down and cannot regenerate, but they are resilient and have\x1b[0m\x0f\x1b[30m\x1b[40m  \x1b[18;4H\x1b[0;1m\x0f\x1b[37m\x1b[40mtools to heal.\x1b[20;4H\x1b[0m\x0f\x1b[33m\x1b[40m+ - Viable Species\x1b[29G* - Random species\x1b[21;4H# - Viable character\x1b[m\x0f\x1b[39;49m\x1b[37m\x1b[40m     \x1b[33m\x1b[40m! - Random character\x1b[22;4H% - List aptitudes\x1b[m\x0f\x1b[39;49m\x1b[37m\x1b[40m   \x1b[33m\x1b[40mSpace - Pick background first\x1b[23;4H? - Help\x1b[23;27HTab - Deep Dwarf Chaos Knight\x1b[8;28H\x1b[m\x0f\x1b[39;49m\x1b[37m\x1b[40m";

var p;

$().ready(function() {
			  p = TTYPlayer();
			  p.render_frame(t);
			  BinaryAjax('foo.ttyrec', function (data) { p.parse_data(data); });
		  });
