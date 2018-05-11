var path = require("path")
var Deps = require("./deps")
var unix = Deps.unix
var through = require("through2")
var PluginError = require('plugin-error')
var _ = require("lodash")
var vinylFile = require('vinyl-file')
var Vinyl = require('vinyl')

var defaultConfig = {
    resolve: {},
    output: process.cwd(),
    cache: false
}

function getManifestFile(opts) {
    return vinylFile.read(opts.manifest, opts)
        .catch(function(err) {
            if (err.code === 'ENOENT') {
                return new Vinyl({
                    path: opts.manifest
                })
            }
            throw err
        })
}

module.exports = function(options) {
    if( !options ) {
        options = {}
    }

    return through.obj(function(file, enc, cb) {
        if( file.isNull() ) {
            cb(null, file)
            return
        }
        if( file.isStream() ) {
            cb(new PluginError('gulp-msapp-require', 'Streaming not supported'))
            return
        }
        if( path.extname(file.path) !== '.js' ) {
            cb(null, file)
            return
        }
        var config = _.extend({}, defaultConfig, options, {
            entry: file.path
        })

        if( config.cache && _.isBoolean(config.cache) ) {
            config.cache = path.resolve(config.output, "./depends-cache.json")
        }

        var entry = new Deps(config)
        entry.parseDeps()
        file.contents = new Buffer(entry.transfrom(file.path))
        cb(null, file)
    })
}

module.exports.manifest = function(options) {    
    if( !options ) {
        options = {}
    }

    options = _.extend({
        merge: false,
        manifest: "msapp-require-manifest.json"
    }, options)

    var manifest = {}

    return through.obj(function(file, enc, cb) {
        if( file.isNull() ) {
            cb(null, file)
            return
        }
        if( file.isStream() ) {
            cb(new PluginError('gulp-msapp-require', 'Streaming not supported'))
            return
        }
        if( path.extname(file.path) !== '.js' ) {
            cb(null, file)
            return
        }
        var config = _.extend({}, defaultConfig, options, {
            entry: file.path
        })

        if( config.cache && _.isBoolean(config.cache) ) {
            config.cache = path.resolve(config.output, "./depends-cache.json")
        }
        
        var entry = new Deps(config)
        entry.parseDeps()
        manifest = _.extend(manifest, entry.outputMap())
        cb()
    }, function(cb) {
        if( _.keys(manifest).length === 0 ) {
            return cb()
        }
        var self = this
        getManifestFile(options).then(function(manifestFile) {
            if( options.merge && !manifestFile.isNull() ) {
                var oldManifest = {}
                try {
                    oldManifest = JSON.parse(manifestFile.contents.toString())
                }catch(e) {}
                manifest = _.extend({}, oldManifest, manifest)
            }

            manifestFile.contents = new Buffer(JSON.stringify(manifest, null, 4))
            self.push(manifestFile)
            cb()
        }).catch(cb)
    })
}