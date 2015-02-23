var FileApi = require('file-api'),
    File = FileApi.File;

var ttyplayer = require('./ttyplayer');

var file = new File('./foo.ttyrec');

ttyplayer(file);
