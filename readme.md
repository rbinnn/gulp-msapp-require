# gulp-msapp-require

Require npm module or custom-common module, for Wechat miniapp.

## Install

```
npm install gulp-msapp-require --save-dev
```

## Usage


```

var gulp = require("gulp")
var msappRequire = require("gulp-msapp-require")

// msappRequire(options)
gulp.task("release", function() {
    gulp.src(["src/**/*"])
    .pipe(gulp.dest("./dist")) // gulp-msapp-require will change the origin file's dependency path, the best way is building in a new folder
    .on("end", function() {
        gulp.src(["dist/**/*"])
        .pipe(msappRequire({
            output: path.resolve(__dirname, "./dist/common"),
            resolve: {
                extensions: [".js", ".json"],
                modules: [path.resolve(__dirname, "./custom"), path.resolve(__dirname, "../node_modules")],
                alias: {
                    utils: "./test/a/index.js",
                    math: "sub/math"
                }
            },
            cache: true
        }))
        .pipe(gulp.dest("./dist"))
    })
})

// msappRequire.manifest(options)
gulp.task("manifest-release", function() {
    gulp.src(["src/**/*"])
    .pipe(gulp.dest("./cdist"))
    .on("end", function() {
        gulp.src(["cdist/**/*"])
        .pipe(msappRequire.manifest({
            output: path.resolve(__dirname, "./cdist/common"),
            resolve: {
                extensions: [".js", ".json"],
                modules: [path.resolve(__dirname, "./custom"), path.resolve(__dirname, "../node_modules")],
                alias: {
                    utils: "./test/a/index.js",
                    math: "sub/math"
                }
            },
            cache: path.resolve(__dirname, "./src/depends.json"),
            manifest: "msapp-require-manifest.json"
        }))
        .pipe(gulp.dest("./cdist"))
    })
})
```


## API

### msappRequire(options)
Analyze the npm module or custom-common module that the code relies on, and then copy to the corresponding directory, and convert the corresponding dependent path in the code.

### msappRequire.manifest(options)
Analyze the npm module or custom-common module that the code relies on, and then copy to the corresponding directory, and map the corresponding dependency path to the manifest.json. **(It does not convert the dependent path in the code)**

#### options

Type: `Object`

##### options.output
Type: `String`<br>

##### options.resolve
Type: `Object`

| Field                    | Default                     | Description                                                                        |
| ------------------------ | --------------------------- | ---------------------------------------------------------------------------------- |
| alias                    | []                          | A list of module alias configurations or an object which maps key to value |
| aliasFields              | []                          | A list of alias fields in description files |
| cacheWithContext         | true                        | If unsafe cache is enabled, includes `request.context` in the cache key  |
| descriptionFiles         | ["package.json"]            | A list of description files to read from |
| enforceExtension         | false                       | Enforce that a extension from extensions must be used |
| enforceModuleExtension   | false                       | Enforce that a extension from moduleExtensions must be used |
| extensions               | [".js", ".json", ".node"]   | A list of extensions which should be tried for files |
| mainFields               | ["main"]                    | A list of main fields in description files |
| mainFiles                | ["index"]                   | A list of main files in directories |
| modules                  | ["node_modules"]            | A list of directories to resolve modules from, can be absolute path or folder name |
| unsafeCache              | false                       | Use this cache object to unsafely cache the successful requests |
| plugins                  | []                          | A list of additional resolve plugins which should be applied |
| symlinks                 | true                        | Whether to resolve symlinks to their symlinked location |
| cachePredicate           | function() { return true }; | A function which decides whether a request should be cached or not. An object is passed to the function with `path` and `request` properties. |
| moduleExtensions         | []                          | A list of module extensions which should be tried for modules |
| resolveToContext         | false                       | Resolve to a context instead of a file |
| fileSystem               |                             | The file system which should be used |
| resolver                 | undefined                   | A prepared Resolver to which the plugins are attached |

##### options.cache
Type: `Boolean|String`
Default: false<br>

Using cache, building faster.