var gulp = require("gulp")
var msappRequire = require("../index")
var path = require("path")

gulp.task("release", function() {
    gulp.src(["src/**/*"])
    .pipe(gulp.dest("./dist"))
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
            }
        }))
        .pipe(gulp.dest("./dist"))
    })
})

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
            manifest: "msapp-require-manifest.json"
        }))
        .pipe(gulp.dest("./cdist"))
    })
})