var net = require('net');
var join = require('path').join;
var file = join(__dirname, 'fixtures', 'all_npm.json');
var JSONStream = require('../');
var test = require('tape');
var fs = require('fs');
var str = fs.readFileSync(file);
test('multiple object errors', function (t) {
  var server = net.createServer(function(client) {
      var data_calls = 0;
      var parser = JSONStream.parse();
      parser.on('error', function(err) {
          t.ok(err)
          t.end()
          server.close();
      });

      parser.on('end', function() {
          t.notOk('END')
          t.end()
          server.close();
      });
      client.pipe(parser);
  });
  server.listen(9999);

  var client = net.connect({ port : 9999 }, function() {
      var msgs = str + '}';
      client.end(msgs);
  });
});
