'use strict';

var grunt = require('grunt');
var jshint = require('../tasks/lib/jshint').init(grunt);

exports['jshint caching'] = function(test) {
  test.expect(6);
  grunt.log.muted = true;
  
  var origHasCached = jshint.swap.hasCached;
  var origAddCached = jshint.swap.addCached;
  var hasCachedCalls = 0;
  var hasCachedResult;
  var addCachedCalls = 0;
  var mockHasCached = function(category, hash, done) {
    hasCachedCalls++;
    origHasCached.call(jshint.swap, category, hash, function(exists, filePath) {
      hasCachedResult = exists;
      done(exists, filePath);
    });
  };
  var mockAddCached = function(category, hash, contents, done) {
    addCachedCalls++;
    origAddCached.call(jshint.swap, category, hash, contents, done);
  };

  // Clear the entire cache swap to guarantee a fresh start
  jshint.swap.clear(null, function(err) {
    if(err) {
      throw err;
    }

    jshint.swap.hasCached = mockHasCached;
    jshint.swap.addCached = mockAddCached;

    var options = {
      cache: true
    };

    jshint.lint(grunt.file.read('test/fixtures/sample-good.js'), options, null, null, function() {
      test.equal(hasCachedCalls, 1, "Calls hasCached on first run");
      test.equal(addCachedCalls, 1, "Calls addCached on first run");
      test.equal(hasCachedResult, false, "Does not find cached on first run");

      jshint.lint(grunt.file.read('test/fixtures/sample-good.js'), options, null, null, function() {
        test.equal(hasCachedCalls, 2, "Calls hasCached on second run");
        test.equal(addCachedCalls, 1, "Does not call addCached on second run");
        test.equal(hasCachedResult, true, "Does find cached on second run");

        test.done();
      });
    });
  });
};

exports['jshint not caching'] = function(test) {
  test.expect(4);
  grunt.log.muted = true;
  
  var origHasCached = jshint.swap.hasCached;
  var origAddCached = jshint.swap.addCached;
  var hasCachedCalls = 0;
  var hasCachedResult;
  var addCachedCalls = 0;
  var mockHasCached = function(category, hash, done) {
    hasCachedCalls++;
    origHasCached.call(jshint.swap, category, hash, function(exists, filePath) {
      hasCachedResult = exists;
      done(exists, filePath);
    });
  };
  var mockAddCached = function(category, hash, contents, done) {
    addCachedCalls++;
    origAddCached.call(jshint.swap, category, hash, contents, done);
  };

  // Clear the entire cache swap to guarantee a fresh start
  jshint.swap.clear(null, function(err) {
    if(err) {
      throw err;
    }

    jshint.swap.hasCached = mockHasCached;
    jshint.swap.addCached = mockAddCached;

    jshint.lint(grunt.file.read('test/fixtures/sample-good.js'), null, null, null, function() {
      test.equal(hasCachedCalls, 0, "Doesn't call swap.hasCached on first run");
      test.equal(addCachedCalls, 0, "Doesn't call swap.addCached on first run");
      
      jshint.lint(grunt.file.read('test/fixtures/sample-good.js'), null, null, null, function() {
        test.equal(hasCachedCalls, 0, "Doesn't call swap.hasCached on second run");
        test.equal(addCachedCalls, 0, "Doesn't call swap.addCached on second run");
        
        test.done();
      });
    });
  });
};