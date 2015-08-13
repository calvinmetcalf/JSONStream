

/*
 sometimes jsonparse changes numbers slightly.
*/

var r = Math.random()
  , Parser = require('jsonparse')
  , p = new Parser()
  , times = 20
  , test = require('tape')
test('parse numbers', function (t) {
  while (times --) {

    t.equal(JSON.parse(JSON.stringify(r)), r, 'core JSON')

    p.onValue = function (v) {
      t.equal(
        String(v).slice(0,12),
        String(r).slice(0,12)
      )
    }
    p.write (new Buffer(JSON.stringify([r])))



  }
  t.end();
});
