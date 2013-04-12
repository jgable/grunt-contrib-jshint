'use strict';

var grunt = require('grunt');
var jshint = require('../tasks/lib/jshint').init(grunt);

exports['jshint'] = function(test) {
  test.expect(1);
  grunt.log.muted = true;

  jshint.lint(grunt.file.read('test/fixtures/lint.txt'), null, null, null, function() {
    test.ok(true, "Did not throw");
    test.done();
  });
};