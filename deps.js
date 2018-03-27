var _ = require("lodash")
var t = require("babel-types")
var babylon = require("babylon")
var traverse = require("babel-traverse").default
var generator = require("babel-generator").default

var path = require("path")
var fs = require("fs-extra")

var defaultConfig = {
    entry: "index.js",
    npm: {
        src: "/",
        dist: "/"
    },
    ignoreRelative: true // 忽略相对路径的依赖
}

var BASE_DIR = process.cwd()

function Deps(options) {
    this.depends = []
    this.pulledList = []
    this.map = {}
    this.config = this.processConfig(options || {})
    this.findDeps(this.config.entry)
}

Deps.prototype.processConfig = function(config) {
    var obj = {};
    _.each(
        ["entry", "npm.src", "custom.src", "npm.dist", "custom.dist", "base"],
        function(key) {
            var val = _.get(config, key)
            if( val && !path.isAbsolute(val) ) {
                _.set(obj, key, unix(path.resolve(BASE_DIR, val)))
            }else if( val ) {
                _.set(obj, key, unix(val))
            }
        }
    )
    return _.extend({}, defaultConfig, config, obj)
}

Deps.prototype.isAbsolute = function(path) {
    // 不是 ./ 或者 ../ 开头的路径
    return !/^\.{1,2}\//.test(path)
}

Deps.prototype.findDeps = function(origin, dist) {
    if( !/\.js$/.test(origin) ) {
        origin = origin + ".js"
    }
    if( dist && !/\.js$/.test(dist) ) {
        dist = dist + ".js"
    }
    origin = unix(origin)
    if(  _.indexOf(this.pulledList, origin) > -1 ) {
        return
    }else {
        this.pulledList.push(origin)
    }
    
    var code
    try {
        code = fs.readFileSync(origin, 'utf-8')
    }catch(e) {
        console.error(e)
        return
    }
    var ast = babylon.parse(code, {
        sourceType: "module"
    })
    var self = this
    traverse(ast, {
        enter: function(path) {
            if ( t.isImportDeclaration(path) ) {
                self.pushDeps(
                    path.node.source.value, 
                    origin
                )
            }else if ( t.isCallExpression(path) && 
                t.isIdentifier(path.node.callee) && 
                path.node.callee.name === 'require' &&
                path.node.arguments.length === 1 &&
                t.isStringLiteral(path.node.arguments[0])
            ) {
                self.pushDeps(
                    path.node.arguments[0].value, 
                    origin
                )
            }
        }
    })
    if( dist ) {
        fs.copySync(origin, dist)
    }
}

Deps.prototype.pushDeps = function(dep, origin) {
    var config = this.config
    var relativeDep, relativeDepDist
    if( this.isAbsolute(dep) ) {
        return this.depends.push({
            dep: dep,
            originDep: dep,
            origin: origin
        })
    }
    
    if( /^\.\//.test(dep) ) { // ./index.js => ../index.js
        dep = dep.replace(/^\.\//, "../")
    }else if( /^\.\.\//.test(dep) ) { // ../index.js => ../../index.js
        dep = "../" + dep
    }
    relativeDep = path.resolve(origin, dep)
    if( !config.ignoreRelative && config.base ) {
        relativeDepDist = path.resolve(config.base, path.relative(config.entry, relativeDep))
        this.findDeps(relativeDep, relativeDepDist)
    }/*else {
        this.findDeps(relativeDep)
    }*/
}

Deps.prototype.getDeps = function() {
    return this.depends
}

Deps.prototype.parseDeps = function() {
    var config = this.config
    var self = this
    var pkgJson
    if( config.npm.src ) {
        try {
            pkgJson = fs.readJsonSync(path.resolve(config.npm.src, "../package.json"))
        }catch(e) { 
            console.error("Package.json Read Error", e)
        }
    }
    var dependencies = _.get(pkgJson, "dependencies")
    var devpendencies = _.get(pkgJson, "devpendencies")
    this.depends.forEach(function(item) {
        var dep = item.dep
        var depDirName = self.getNpmDirName(dep)
        if( pkgJson && _.has(dependencies, depDirName) || _.has(devpendencies, depDirName) ) {
            return self.pullNpmDep(item)
        }
        if( !/\.js$/.test(dep) ) {
            item.dep = dep + ".js"
        }
        if( config.custom.src && fs.existsSync(path.resolve(config.custom.src, item.dep)) ) {
            return self.pullCustomDep(item)
        }
    })
}

Deps.prototype.getNpmDirName = function(dep) {
    if( !dep ) return ""
    return dep.split("/")[0]
}

Deps.prototype.pullCustomDep = function(depObj) {
    var dep = depObj.dep
    var config = this.config
    var entry = unix(path.resolve(config.custom.src, dep))
    var paths = entry.split("/")
    
    return this.saveCustomDep(entry, depObj)
}

Deps.prototype.pullNpmDep = function(depObj) {
    var dep = depObj.dep
    var depDirName = this.getNpmDirName(dep)
    var config = this.config
    var pkgDir = path.resolve(config.npm.src, depDirName)
    var distDir = path.resolve(config.npm.dist, depDirName)
    var pkgJson
    if( config.npm.src ) {
        try{
            pkgJson  = fs.readJsonSync(path.resolve(pkgDir, "./package.json"))
        }catch(e) {
            console.error("Package.json Read Error", e)
        }
    }
    var filename = "./index.js"

    if( dep !== depDirName ) {
        filename = dep.slice(depDirName.length + 1)
        filename = /\.js$/.test(filename) ? filename : filename + ".js"        
    }else if( _.get(pkgJson, "main").indexOf(dep) > -1 ){
        filename = _.get(pkgJson, "main")  
    }else if( fs.existsSync(path.resolve(config.npm.src, dep, "./index.js")) ) {
        filename = "./index.js"    
    }
    
    return this.saveNpmDep(pkgDir, distDir, depObj, filename)
}

Deps.prototype.saveNpmDep = function(pkgDir, distDir, depObj, filename) {
    var config = this.config
    var dep = depObj.dep
    var src = path.resolve(pkgDir, filename)
    var dist = path.resolve(distDir, filename)
    var currentDir = path.resolve(depObj.origin, "../")

    var nextDep = new Deps({
        entry: src,
        npm: {
            src: path.resolve(pkgDir, "./node_modules"),
            dist: path.resolve(distDir, "./node_modules")
        },
        base: path.resolve(config.npm.dist, dep),
        ignoreRelative: false
    })
    nextDep.parseDeps()

    try {
        fs.copySync(src, dist)
        this.collectMap(
            unix(depObj.origin), 
            depObj.originDep, 
            unix(path.relative(currentDir, dist))
        )
    }catch(e) {
        console.error(e)
    }
}

Deps.prototype.saveCustomDep = function(src, depObj) {
    var config = this.config
    var dep = depObj.dep
    var dist = path.resolve(config.custom.dist, dep)
    var currentDir = path.resolve(depObj.origin, "../")
    var nextDep = new Deps({
        entry: src,
        npm: _.extend({}, config.npm),
        custom: _.extend({}, config.custom),
        base: path.resolve(config.custom.dist, dep),
        ignoreRelative: false
    })
    nextDep.parseDeps()
    try {
        fs.copySync(src, dist)
        this.collectMap(        
            unix(depObj.origin), 
            depObj.originDep, 
            unix(path.relative(currentDir, dist))
        )
    }catch(e) {
        console.error(e)
    }
}

Deps.prototype.collectMap = function(origin, key, val) {
    var map = this.map
    if( !map[origin] ) {
        map[origin] = {}
    }
    if( this.isAbsolute(val) ) {
        val = "./" + val
    }
    map[origin][key] = val
}

Deps.prototype.outputMap = function(dist) {
    return this.map
}

Deps.prototype.transfrom = function(pth) {
    pth = unix(pth)
    var code = fs.readFileSync(pth, 'utf-8')
    var ast = babylon.parse(code, {
        sourceType: "module"
    })
    var mapping = this.map[pth] || {}
    traverse(ast, {
        enter: function(path) {
            if ( t.isImportDeclaration(path) && 
                mapping[path.node.source.value]
            ) {
                path.node.source.value = mapping[path.node.source.value]
            }else if ( t.isCallExpression(path) && 
                t.isIdentifier(path.node.callee) && 
                path.node.callee.name === 'require' &&
                path.node.arguments.length === 1 &&
                mapping[path.node.arguments[0].value]
            ) {
                path.node.arguments[0].value = mapping[path.node.arguments[0].value]
            }
        }
    })
    return generator(ast).code
}

// 解决windows系统下路径的反斜杠问题
function unix(url) {
    return url.replace(/\\/g, "/")
}

module.exports = Deps
module.exports.unix = unix