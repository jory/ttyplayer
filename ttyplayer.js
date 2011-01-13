function TTYPlayer () {
	var frame = $('#frame');
	return {
		render_frame: function(data) {
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
				if (index == -1) {
					output.push(string);
					point.x += string.length;
					string = '';
				}
				else {
					output.push(string.slice(0, index));
					point.x += index;
					string = string.slice(index);
				}
			};

			var handle_esc = function() {
				var match = string.match(regexp);
				var value = match[1];
				var c = match[2];

				if (c == 'm') {
					if (value == '') {
						output.push('<span class="black-bg white-fg">');
						num_open_spans += 1;						
					}
					else {
						var values = value.split(';');
						var l = values.length;
						for (var i = 0; i < l; i++) {
							var val = values[i];
							output.push('<span class="');
							if (val == '0') {
								output.push('black-bg white-fg');
							}
							else if (val == '1') {
								output.push('bold');
							}
							else if (val == '33') {
								output.push('yellow-fg');
							}
							else {
								console.error('Unhandled SGR parameter: ' + val);
							}
							output.push('">');
							num_open_spans += 1;
						}
					}
				}
				else if (c == 'H') {
				}
				else if (c == 'G') {
				}
				else if (c == 'J') {
				}
				else {
					console.error('Unhandled escape sequence: ' + match[0]);
				}

				string = string.slice(match[0].length);
			};

			// Until we know what this character does, get rid of it outright.
			string.replace(/\\x0f/g, '');

			while (string != '') {
				var index = string.search(regexp);

				if (index == -1) {
					print(index);
				}
				else if (index > 0) {
					print(index);
					handle_esc();
				}
				else if (index == 0) {
					handle_esc();
				}			
			}

			for (var i = 0; i < num_open_spans; i++) {
				output.push('</span>');
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
		  });