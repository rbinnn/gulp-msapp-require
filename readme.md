# gulp-msapp-require

Require npm module or custom-common module, for Wechat miniapp.

## Install

```
npm install gulp-msapp-require --save-dev
```

## Information
<table>
<tr>
<td>Package</td><td>gulp-msapp-require</td>
</tr>
<tr>
<td>Description</td>
<td>Require module</td>
</tr>
<tr>
<td>Node Version</td>
<td>>= 0.10</td>
</tr>
</table>

## Usage


```

var gulp = require("gulp")
var msappRequire = require("gulp-msapp-require")

// msappRequire(options)
gulp.task("release", function() {
    gulp.src("src/**/*")
    .pipe(gulp.dest("./dist"))
    .pipe(msappRequire())
    .pipe(gulp.dest("./dist"))
})

// msappRequire.manifest(options)
gulp.task("release-manifest", function() {
    gulp.src(["src/**/*.js"])
    .pipe(msappRequire.manifest({
        src: {
            npm: path.resolve(process.cwd(), "./node_modules"),
            custom: path.resolve(process.cwd(), "../")
        },
        dist: {
            npm: "./dist/msapp_modules",
            custom: "./dist/custom_modules"
        },
        manifest: "msapp-require-manifest.json"
    }))
    .pipe(gulp.dest("./dist"))
})
```


## API

### msappRequire(options)
Analyze the npm module or custom-common module that the code relies on, and then copy to the corresponding directory, and convert the corresponding dependent path in the code.

### msappRequire.manifest(options)
Analyze the npm module or custom-common module that the code relies on, and then copy to the corresponding directory, and map the corresponding dependency path to the manifest.json. **(It does not convert the dependent path in the code)**

#### options

Type: `Object`

##### options.src
Type: `Object`

###### options.src.npm 
npm module installation path

Type: `String`<br>
Default: `path.resolve(process.cwd(), "./node_modules")`

###### options.src.custom
custom-common module path

Type: `String`<br>
Default: `process.cwd()`

##### options.dist
Type: `Object`

###### options.dist.npm
After building, the npm module storage path

Type: `String`<br>
Default: `path.resolve(process.cwd(), "./dist/msapp_modules")`

###### options.dist.custom
After building, the custom-common module storage path

Type: `String`<br>
Default: `path.resolve(process.cwd(), "./dist/custom_modules")`

##### options.manifest
After building, the dependency mapping storage json file

Type: `String`<br>
Default: `msapp-require-manifest.json`