var gulp = require("gulp")
var msappRequire = require("../index")
var path = require("path")

gulp.task("release", function() {
    gulp.src(["src/**/*"])
    .pipe(gulp.dest("./dist"))
    .pipe(msappRequire({
        npm: {
            src: path.resolve(process.cwd(), "../node_modules"),
            dist: "./dist/msapp_modules",
        },
        custom: {
            src: path.resolve(process.cwd(), "./"),
            dist: "./dist/custom_modules"
        }
    }))
    .pipe(gulp.dest("./dist"))
})


gulp.task("release-manifest", function() {
    gulp.src(["src/**/*.js"])
    .pipe(msappRequire.manifest({
        npm: {
            src: path.resolve(process.cwd(), "../node_modules"),
            dist: "./manifest_dist/msapp_modules"
        },
        custom: {
            src: path.resolve(process.cwd(), "./"),
            dist: "./manifest_dist/custom_modules"
        }
    }))
    .pipe(gulp.dest("./manifest_dist"))
})