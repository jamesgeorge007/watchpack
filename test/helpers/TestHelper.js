"use strict";

var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");

require("../../lib/getWatcherManager");
var watcherManagerModule =
	require.cache[require.resolve("../../lib/getWatcherManager")];

const allWatcherManager = new Set();
const oldFn = watcherManagerModule.exports;
watcherManagerModule = options => {
	const watcherManager = oldFn(options);
	allWatcherManager.add(watcherManager);
};

const checkAllWatcherClosed = () => {
	for (const watcherManager of allWatcherManager) {
		Array.from(watcherManager.directoryWatchers.keys()).should.be.eql([]);
	}
};

function TestHelper(testdir) {
	this.testdir = testdir;
	var self = this;
	this.before = function(done) {
		self._before(done);
	};
	this.after = function(done) {
		self._after(done);
	};
}
module.exports = TestHelper;

TestHelper.prototype._before = function before(done) {
	checkAllWatcherClosed();
	this.tick(
		400,
		function() {
			rimraf.sync(this.testdir);
			fs.mkdirSync(this.testdir);
			done();
		}.bind(this)
	);
};

TestHelper.prototype._after = function after(done) {
	var i = 0;
	this.tick(
		300,
		function del() {
			try {
				rimraf.sync(this.testdir);
			} catch (e) {
				if (i++ > 20) throw e;
				this.tick(100, del.bind(this));
				return;
			}
			checkAllWatcherClosed();
			this.tick(300, done);
		}.bind(this)
	);
};

TestHelper.prototype.dir = function dir(name) {
	fs.mkdirSync(path.join(this.testdir, name));
};

TestHelper.prototype.file = function file(name) {
	fs.writeFileSync(path.join(this.testdir, name), Math.random() + "", "utf-8");
};

TestHelper.prototype.symlinkFile = function symlinkFile(name, target) {
	fs.symlinkSync(target, path.join(this.testdir, name), "file");
};

TestHelper.prototype.symlinkDir = function symlinkDir(name, target) {
	fs.symlinkSync(target, path.join(this.testdir, name), "dir");
};

TestHelper.prototype.unlink = function unlink(name) {
	fs.unlinkSync(path.join(this.testdir, name));
};

TestHelper.prototype.mtime = function mtime(name, mtime) {
	var stats = fs.statSync(path.join(this.testdir, name));
	fs.utimesSync(path.join(this.testdir, name), stats.atime, new Date(mtime));
};

TestHelper.prototype.remove = function remove(name) {
	rimraf.sync(path.join(this.testdir, name));
};

TestHelper.prototype.tick = function tick(arg, fn) {
	if (typeof arg === "function") {
		fn = arg;
		arg = 100;
	}
	setTimeout(function() {
		fn();
	}, arg);
};

TestHelper.prototype.getNumberOfWatchers = function getNumberOfWatchers() {
	const count = 0;
	for (const watcherManager of allWatcherManager) {
		count += watcherManager.directoryWatchers.size;
	}
	return count;
};
