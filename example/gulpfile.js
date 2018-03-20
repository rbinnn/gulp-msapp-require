var gulp = require("gulp")
var msappRequire = require("../index")
var path = require("path")

gulp.task("release", function() {
    gulp.src(["src/**/*"])
    .pipe(gulp.dest("./dist"))
    .pipe(msappRequire({
        src: {
            npm: path.resolve(process.cwd(), "../node_modules"),
            custom: path.resolve(process.cwd(), "./")
        },
        dist: {
            npm: "./dist/msapp_modules",
            custom: "./dist/custom_modules"
        }
    }))
    .pipe(gulp.dest("./dist"))
})


gulp.task("release-manifest", function() {
    gulp.src(["src/**/*.js"])
    .pipe(msappRequire.manifest({
        src: {
            npm: path.resolve(process.cwd(), "../node_modules"),
            custom: path.resolve(process.cwd(), "./")
        },
        dist: {
            npm: "./manifest_dist/msapp_modules",
            custom: "./manifest_dist/custom_modules"
        }
    }))
    .pipe(gulp.dest("./manifest_dist"))
})