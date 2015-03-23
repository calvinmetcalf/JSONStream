#! /usr/bin/env node

var Parser = require('jsonparse')
  , Transform = require('readable-stream').Transform
  , inherits = require('inherits')

/*

  the value of this.stack that creationix's jsonparse has is weird.

  it makes this code ugly, but his problem is way harder that mine,
  so i'll forgive him.

*/

exports.parse = Parse;

inherits(Parse, Transform)

function Parse(path, map) {
  if (!(this instanceof Parse))
    return new Parse(path, map)

  Transform.call(this, {
    objectMode: true
  })

  var stream = this;
  this.root = null;
  var parser = this.parser = new Parser()

  if('string' === typeof path)
    path = path.split('.').map(function (e) {
      if (e === '*')
        return true
      else if (e === '') // '..'.split('.') returns an empty string
        return {recurse: true}
      else
        return e
    })


  var count = 0, _key
  if(!path || !path.length)
    path = null

  parser.onValue = function (value) {
    if (!this.root)
      stream.root = value

    if(! path) return

    var i = 0 // iterates on path
    var j  = 0 // iterates on stack
    while (i < path.length) {
      var key = path[i]
      var c
      j++

      if (key && !key.recurse) {
        c = (j === this.stack.length) ? this : this.stack[j]
        if (!c) return
        if (! check(key, c.key)) return
        i++
      } else {
        i++
        var nextKey = path[i]
        if (! nextKey) return
        while (true) {
          c = (j === this.stack.length) ? this : this.stack[j]
          if (!c) return
          if (check(nextKey, c.key)) {
            i++;
            this.stack[j].value = null
            break
          }
          j++
        }
      }

    }
    if (j !== this.stack.length) return

    count ++
    var actualPath = this.stack.slice(1).map(function(element) { return element.key }).concat([this.key])
    var data = this.value[this.key]
    if(null != data)
      if(null != (data = map ? map(data, actualPath) : data))
        stream.push(data)
    delete this.value[this.key]
    for(var k in this.stack)
      this.stack[k].value = null
  }
  parser._onToken = parser.onToken;

  parser.onToken = function (token, value) {
    parser._onToken(token, value);
    if (this.stack.length === 0) {
      if (stream.root) {
        if(!path)
          stream.push(stream.root)
        count = 0;
        stream.root = null;
      }
    }
  }

  parser.onError = function (err) {
    if(err.message.indexOf("at position") > -1)
      err.message = "Invalid JSON (" + err.message + ")";
    stream.emit('error', err)
  }


}

Parse.prototype._transform = function (chunk, encoding, next) {
  if('string' === typeof encoding)
    chunk = new Buffer(chunk, encoding)
  this.parser.write(chunk)
  next()
}

function check (x, y) {
  if ('string' === typeof x)
    return y == x
  else if (x && 'function' === typeof x.exec)
    return x.exec(y)
  else if ('boolean' === typeof x)
    return x
  else if ('function' === typeof x)
    return x(y)
  return false
}

exports.stringify = Stringify;

inherits(Stringify, Transform)

function Stringify(op, sep, cl, indent) {
  if (!(this instanceof Stringify))
    return new Stringify(op, sep, cl, indent)

  Transform.call(this, {
    objectMode: true
  })

  this.indent = indent || 0
  if (op === false){
    this.op = ''
    this.sep = '\n'
    this.cl = ''
  } else if (op == null) {

    this.op = '[\n'
    this.sep = '\n,\n'
    this.cl = '\n]\n'

  }

  //else, what ever you like

  this.first = true
  this.anyData = false
}

Stringify.prototype._transform = function (data, _, next) {
  this.anyData = true
  var json = JSON.stringify(data, null, this.indent)
  if(this.first) {
    this.first = false;
    this.push(this.op + json)
  }
  else this.push(this.sep + json)
  next()
}

Stringify.prototype._flush = function (done) {
  if(!this.anyData)
    this.push(this.op)
  this.push(this.cl)
  done()
}

exports.stringifyObject = StringifyObject;

inherits(StringifyObject, Transform)

function StringifyObject (op, sep, cl, indent) {
  if (!(this instanceof StringifyObject))
    return new StringifyObject(op, sep, cl, indent)

  Transform.call(this, {
    objectMode: true
  })

  this.indent = indent || 0
  if (op === false){
    this.op = ''
    this.sep = '\n'
    this.cl = ''
  } else if (op == null) {

    this.op = '{\n'
    this.sep = '\n,\n'
    this.cl = '\n}\n'

  }

  //else, what ever you like

  this.first = true
  this.anyData = false
}
StringifyObject.prototype._transform = function (data, _, next) {
  this.anyData = true
  var json = JSON.stringify(data[0]) + ':' + JSON.stringify(data[1], null, this.indent)
  if(this.first) { this.first = false ; this.push(this.op + json)}
  else this.push(this.sep + json)
  next()
}
StringifyObject.prototype._flush = function (done) {
  if(!this.anyData) this.push(this.op)
  this.push(this.cl)

  done()
}


if(!module.parent && process.title !== 'browser') {
  process.stdin
    .pipe(exports.parse(process.argv[2]))
    .pipe(exports.stringify('[', ',\n', ']\n', 2))
    .pipe(process.stdout)
}
