var _ = require("lodash")
var t = require("babel-types")
var babylon = require("babylon")
var traverse = require("babel-traverse").default
var generator = require("babel-generator").default
var {
    NodeJsInputFileSystem,
    CachedInputFileSystem,
    ResolverFactory
} = require("enhanced-resolve");

var path = require("path")
var fs = require("fs-extra")

var BASE_DIR = process.cwd()

function Deps(options) {
    this.depends = []
    this.pulledList = []
    this.map = {}
    this.config = options
    this.resolver = ResolverFactory.createResolver(_.extend({
        fileSystem: new CachedInputFileSystem(new NodeJsInputFileSystem(), 4000),
        useSyncFileSystemCalls: true,
    }, options.resolve))
    this.findDeps(unix(options.entry))
}

const REGEXP_NOT_MODULE = /^\.$|^\.[\\\/]|^\.\.$|^\.\.[\/\\]|^\/|^[A-Z]:[\\\/]/i;
Deps.prototype.isModule = function(path) {
    return !REGEXP_NOT_MODULE.test(path)
}

Deps.prototype.addExtname = function(dep) {
    var extensions = _.get(this.config, "resolve.extensions")
    var pth = dep
    for(var i = 0, len = extensions.length; i < len - 1; i++ ) {
        if( dep.indexOf(extensions[i]) > -1 ) {
            break
        }
        try {
            if( !fs.accessSync(dep + extensions[i]) ) {
                pth = dep + extensions[i]
                break
            }
        }catch(e) {
            console.log(e)
        }
    }
    return pth
}

Deps.prototype.transferExtname = function(src, dist) {
    var extname = path.extname(src)
    if( dist.indexOf(extname) > -1 ) {
        return dist
    }
    return dist + extname
}

Deps.prototype.transferAlias = function(dep, origin) {
    var alias = _.get(this.config, "resolve.alias")
    var newDep = dep
    var transfer = _.find(alias, function(val, key) {
        if( /\$$/.test(key) && dep === key.substr(0, key.length - 1)) {
            newDep = val
            return true
        }
        if( !/\$$/.test(key) && dep.indexOf(key) === 0 ) {
            newDep = val + dep.substr(key.length, dep.length - key.length)
            return true
        }
    })
    return {
        dep: newDep,
        transfer: !!transfer
    }
}

Deps.prototype.findDeps = function(origin, isModule) {
    if(  _.indexOf(this.pulledList, origin) > -1 ) { // 解析过，忽略
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
    var ast
    try{
        ast = babylon.parse(code, {
            sourceType: "module"
        })
    }catch(e) {
        console.log("Parse Error in ",origin, "\n", e)
        return
    }
    var self = this
    traverse(ast, {
        enter: function(path) {
            if ( t.isImportDeclaration(path) ) {
                self.pushDeps(
                    path.node.source.value, 
                    origin,
                    isModule
                )
            }else if ( t.isCallExpression(path) && 
                t.isIdentifier(path.node.callee) && 
                path.node.callee.name === 'require' &&
                path.node.arguments.length === 1 &&
                t.isStringLiteral(path.node.arguments[0])
            ) {
                self.pushDeps(
                    path.node.arguments[0].value, 
                    origin,
                    isModule
                )
            }
        }
    })
}

Deps.prototype.pushDeps = function(dep, origin, isModule) {
    var config = this.config
    var src = this.resolver.resolveSync(
        {}, path.dirname(origin), dep
    )
    var transferInfo = this.transferAlias(dep, origin)
    var _isModule = this.isModule(transferInfo.dep)
    var _isModuleExtend = !!(_isModule || isModule)
    src = unix(this.addExtname(src))
    
    this.depends.push({
        key: dep, // 源文件的引用
        src: src, // 源文件的引用的绝对路径
        dep:  transferInfo.dep, // 源文件的alias转换过后的引用
        origin: unix(origin), // 源文件的绝对路径
        transfer: transferInfo.transfer, // 是否成功匹配alias规则
        module:_isModuleExtend, // 源文件的引用是否为模块（继承源文件）
        _module: _isModule // 源文件的引用是否为模块
    })
    this.findDeps(src, _isModuleExtend)
}

Deps.prototype.getDeps = function() {
    return this.depends
}

Deps.prototype.parseDeps = function() {
    var that = this
    this.depends.forEach(function(item) {
        if( !item.transfer && !item.module ) { // 没有用alias，不是外部模块, 直接忽略了
            return 
        }
        if( item.transfer && !item.module ) { // 用了alias,不是外部模块
            that.saveAlias(item)
            return
        }
        that.save(item)
    })
}

Deps.prototype.updateDeps = function(oldOrigin, newOrigin) {
    this.depends = this.depends.map(function(dep) {
        if( dep.origin === oldOrigin ) {
            dep.origin = newOrigin
        }
        return dep
    })
}

Deps.prototype.save = function(depObj) {
    var config = this.config
    var currentDir = path.dirname(depObj.origin)
    var src = depObj.src
    var dist
    if( depObj._module ) {
        dist = this.resolve(config.output, depObj.dep)
    }else {
        dist = this.resolve(
            config.output, 
            this.resolve(
                path.dirname(depObj.origin), depObj.dep
            )
        )
    }
    dist = this.transferExtname(src, dist)
    this.updateDeps(src, dist)
    try {
        fs.copySync(src, dist)
    }catch(e) {
        console.error(e)
    }
    this.collectMap(        
        depObj.origin,
        depObj.key, 
        unix(path.relative(currentDir, dist))
    )
}

Deps.prototype.saveAlias = function(depObj) {
    this.collectMap(
        depObj.origin,
        depObj.key, 
        depObj.dep
    )
}

Deps.prototype.collectMap = function(origin, key, val) {
    var map = this.map
    if( !map[origin] ) {
        map[origin] = {}
    }
    if( this.isModule(val) ) {
        val = "./" + val
    }
    map[origin][key] = val
}

Deps.prototype.outputMap = function() {
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

Deps.prototype.resolve = function(base, part) {
    return unix(path.resolve(base, part))
}

// 解决windows系统下路径的反斜杠问题
function unix(url) {
    return url.replace(/\\/g, "/")
}

module.exports = Deps
module.exports.unix = unix
module.exports.resolve = Deps.prototype.resolve