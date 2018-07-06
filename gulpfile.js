var gulp = require('gulp'),
    browserSync = require('browser-sync'),
    sass = require('gulp-sass'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    adaptive = require('postcss-adaptive'),
    rev = require('gulp-rev'),
    revCollector = require('gulp-rev-collector'),
    del = require('del'),
    gulpsync = require('gulp-sync')(gulp),
    concat = require('gulp-concat'),
    cssmin = require('gulp-clean-css'),
    uglify = require("gulp-uglify"),
    merge = require('merge-stream'),
    babel = require('gulp-babel'),
    fs = require('fs'),
    htmlreplace = require('gulp-html-replace');

// 浏览器实时响应
gulp.task('browser-sync', function () {
    browserSync.init({
        files: ['**'],
        server: {
            baseDir: './',
            index: 'index.html'
        },
        port: 8080
    })
});

// 编译sass
gulp.task('sass', function () {
    var plugins = [
        adaptive({ remUnit: 75 }),
        autoprefixer({ browsers: ['last 1 version'] })
    ];
    return gulp.src('./scss/*.scss')
        .pipe(sass({
            sourcemaps: true
        }).on('error', sass.logError))
        .pipe(postcss(plugins))
        .pipe(gulp.dest('./css'));
});

// 实时监听scss文件改动
gulp.task('sass:watch', function () {
    gulp.watch('./scss/*.scss', ['sass']);
});




// 打包前先清除build文件夹里上一版本的css和js
gulp.task('clean:package', function () {
    del([
        './build/css/*',
        '!./build/css/*.json',
        './build/js/*',
        '!./build/js/*.json',
    ]);
});

// 打包html,css,js,images文件
gulp.task('pack', function () {
    // 打包css
    var packcss = gulp.src('./css/*.css')
        .pipe(concat('main.css'))
        .pipe(cssmin({
            advanced: false,//类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
            compatibility: 'ie7',//保留ie7及以下兼容写法 类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
            keepBreaks: true,//类型：Boolean 默认：false [是否保留换行]
            keepSpecialComments: '*'
            //保留所有特殊前缀 当你用autoprefixer生成的浏览器前缀，如果不加这个参数，有可能将会删除你的部分前缀
        }))
        .pipe(rev())
        .pipe(gulp.dest('./build/css'))
        .pipe(rev.manifest())
        .pipe(gulp.dest('./build/css'));

    // 打包js
    var packjs = gulp.src(['./js/*.js', '!./js/*.min.js'])
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(uglify())
        .pipe(rev())    //加名字MD5
        .pipe(gulp.dest('./build/js')) //保存
        .pipe(rev.manifest())
        .pipe(gulp.dest("./build/js"));

    // 打包minjs
    var packminjs = gulp.src('./js/*.min.js')
        .pipe(gulp.dest('./build/js'));
    // 打包html
    var packhtml = gulp.src(['*.html'])
        .pipe(gulp.dest('./build'));
    // 打包images
    var packimage = gulp.src('./images/**/*')
        .pipe(gulp.dest('./build/images'));

    return merge(packcss, packimage, packhtml, packjs, packminjs);
});

// 给html里引用的js（自写非插件）加上后缀
gulp.task('rev:js', function () {
    return gulp.src(['./build/js/*.json', './build/*.html'])
        .pipe(revCollector({
            replaceReved: true,
        }))
        .pipe(gulp.dest('./build'));
});

// 将合并后的css替换想要替换的css
gulp.task('replace:css', function () {
    var text = fs.readFileSync('./build/css/rev-manifest.json', 'utf8'),
        obj = JSON.parse(text),
        str = '';
    for (i in obj) {
        str = obj[i];
    }
    gulp.src('./build/*.html')
        .pipe(htmlreplace({
            'css': './css/' + str,
        }, { keepBlockTags: true }))
        .pipe(gulp.dest('./build'));
})

// 文件运行调试
gulp.task('default', gulpsync.sync(['sass', 'sass:watch', 'browser-sync']));

// 文件打包
gulp.task('build', gulpsync.sync(['clean:package', 'pack', 'rev:js', 'replace:css']))