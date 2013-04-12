/*
 * grunt-contrib-jshint
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman, contributors
 * Licensed under the MIT license.
 */

'use strict';

var crypto = require('crypto');
var path = require('path');

// External libs.
var jshint = require('jshint').JSHINT;
var CacheSwap = require('cache-swap');

exports.init = function(grunt) {
  var exports = {};
  // Grab the package.json for the version.
  var packageInfo = grunt.file.readJSON(path.resolve(path.join(__dirname, '..', '..', 'package.json')));
  var swap = new CacheSwap({
      // Add on the package version so that upgrading the package will invalidate previous caches
      cacheDirName: 'grunt-contrib-jshint-' + packageInfo.version
    });
  // A mock function that bypasses the check for a cached version.
  var doNotCheckCached = function(src, done) {
    done(false);
  };

  // No idea why JSHint treats tabs as options.indent # characters wide, but it
  // does. See issue: https://github.com/jshint/jshint/issues/430
  var getTabStr = function(options) {
    // Do something that's going to error.
    jshint('\tx', options || {});
    // If an error occurred, figure out what character JSHint reported and
    // subtract one.
    var character = jshint.errors && jshint.errors[0] && jshint.errors[0].character - 1;
    // If character is actually a number, use it. Otherwise use 1.
    var tabsize = isNaN(character) ? 1 : character;
    // If tabsize > 1, return something that should be safe to use as a
    // placeholder. \uFFFF repeated 2+ times.
    return tabsize > 1 && grunt.util.repeat(tabsize, '\uFFFF');
  };

  var tabregex = /\t/g;

  // For unit testing
  exports.swap = swap;

  // Check for a previously cached version
  exports.checkCached = function(src, done) {
    // Hash the contents to compare with previous runs
    var sha1 = crypto.createHash('sha1');
    var fileHash = sha1.update(src).digest('hex');

    swap.hasCached('jshinted', fileHash, function(isCached, cachedFilePath) {
      if(isCached) {
        grunt.verbose.debug("Cached JSHint file: " + cachedFilePath);  
      }
      
      done(isCached, fileHash);
    });
  };

  // Lint source code with JSHint.
  exports.lint = function(src, options, globals, extraMsg, done) {
    // JSHint sometimes modifies objects you pass in, so clone them.
    options = options ? grunt.util._.clone(options) : {};
    globals = globals ? grunt.util._.clone(globals) : {};
    // Enable/disable debugging if option explicitly set.
    if (grunt.option('debug') !== undefined) {
      options.devel = options.debug = grunt.option('debug');
      // Tweak a few things.
      if (grunt.option('debug')) {
        options.maxerr = Infinity;
      }
    }

    var checkCached = options.cache;
    var checkCachedFunc = options.cache ? this.checkCached : doNotCheckCached;
    // Get rid of this so we don't pass it as a jshint option.
    delete options.cache;

    checkCachedFunc(src, function(isCached, fileHash) {
      if(isCached) {
        grunt.verbose.write('Skipped linting' + (extraMsg ? ' ' + extraMsg : '') + '...');
        grunt.verbose.ok();
        return done();
      }
      
      var msg = 'Linting' + (extraMsg ? ' ' + extraMsg : '') + '...';
      grunt.verbose.write(msg);
      // Tab size as reported by JSHint.
      var tabstr = getTabStr(options);
      var placeholderregex = new RegExp(tabstr, 'g');
      // Lint.
      var result = jshint(src, options, globals);
      
      if (result) {
        // Success!
        grunt.verbose.ok();

        if(checkCached) {
          // Add a blank placeholder to our cache to indicate success
          swap.addCached("jshinted", fileHash, "", function(err, cachedFilePath) {
            if(err) {
              grunt.fatal(err);
              grunt.warn("Failed to save cache file");
              return;
            }

            done();
          });
        } else {
          done();
        }

        return;
      }

      // Something went wrong.
      grunt.verbose.or.write(msg);
      grunt.log.error();

      // Iterate over all errors.
      jshint.errors.forEach(function(e) {
        // Sometimes there's no error object.
        if (!e) { return; }
        var pos;
        var code = '';
        var evidence = e.evidence;
        var character = e.character;
        if (evidence) {
          // Manually increment errorcount since we're not using grunt.log.error().
          grunt.fail.errorcount++;
          // Descriptive code error.
          pos = '['.red + ('L' + e.line).yellow + ':'.red + ('C' + character).yellow + ']'.red;
          if (e.code) {
            code = e.code.yellow + ':'.red + ' ';
          }
          grunt.log.writeln(pos + ' ' + code + e.reason.yellow);
          // If necessary, eplace each tab char with something that can be
          // swapped out later.
          if (tabstr) {
            evidence = evidence.replace(tabregex, tabstr);
          }
          if (character === 0) {
            // Beginning of line.
            evidence = '?'.inverse.red + evidence;
          } else if (character > evidence.length) {
            // End of line.
            evidence = evidence + ' '.inverse.red;
          } else {
            // Middle of line.
            evidence = evidence.slice(0, character - 1) + evidence[character - 1].inverse.red +
              evidence.slice(character);
          }
          // Replace tab placeholder (or tabs) but with a 2-space soft tab.
          evidence = evidence.replace(tabstr ? placeholderregex : tabregex, '  ');
          grunt.log.writeln(evidence);
        } else {
          // Generic "Whoops, too many errors" error.
          grunt.log.error(e.reason);
        }
      });

      grunt.log.writeln();
      done();
    });
  };

  return exports;
};
