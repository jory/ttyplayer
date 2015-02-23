var fs = require('fs');

var FileApi = require('file-api'),
    File = FileApi.File;

var ttyplayer = require('./ttyplayer');

var stats = fs.statSync('./foo.ttyrec');

var file = new File({
    path: './foo.ttyrec',
    size: stats.size
});

ttyplayer(file);
