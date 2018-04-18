'use strict';

//--PROJECT--//
var gulp = require('gulp'),
    watch = require('gulp-watch'),
    prefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    fileinclude = require('gulp-file-include'),
    cssclean = require('gulp-clean-css'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    rimraf = require('rimraf'),
    plumber = require('gulp-plumber'),
    runSequence = require('run-sequence'),
    htmlmin = require('gulp-htmlmin');

//project setting
var settings = {
  prjdir: '../pool/',
  srcdir: 'source',
  prjext: '+(hbs|js|scss|png|jpg|jpeg|gif|ttf|woff)',
  clean: '../pool'
};

//gulp set path
var path = {
  //Path for build
  build: {
    project: settings.prjdir,
    tpl: settings.prjdir+'tpl/',
    js: settings.prjdir+'assets/js/',
    css: settings.prjdir+'assets/css/',
    imgs: settings.prjdir+'assets/imgs/',
    fonts: settings.prjdir+'assets/fonts/',
  },
  //Path for resources
  src: {
    tpl: settings.srcdir+'/template/**/*.'+settings.prjext,
    js: settings.srcdir+'/js/*.'+settings.prjext,
    style: settings.srcdir+'/style/*.'+settings.prjext,
    imgs: settings.srcdir+'/imgs/**/*.'+settings.prjext,
    fonts: settings.srcdir+'/fonts/**/*.'+settings.prjext
  },
  //Path for watched files
  watch: {
    tpl: settings.srcdir+'/template/**/*.+(hbs|html)',
    js: settings.srcdir+'/js/**/*.'+settings.prjext,
    style: settings.srcdir+'/style/**/*.'+settings.prjext,
    imgs: settings.srcdir+'/imgs/**/*.'+settings.prjext,
    fonts: settings.srcdir+'/fonts/**/*.'+settings.prjext
  },
  clean: settings.clean
};
//###########//

//--RELEASE tasks--//
  //Template html task
  gulp.task('tpl:build', function () {
    gulp.src(path.src.tpl)
      .pipe(plumber())
      .pipe(fileinclude())
      .pipe(htmlmin({
        collapseWhitespace: true,
        ignoreCustomFragments: [/<\?[\s\S]*?\?>/]}
      ))
      .pipe(gulp.dest(path.build.tpl));
  });

  //Template js task
  gulp.task('js:build', function () {
    gulp.src(path.src.js)
      .pipe(plumber())
      .pipe(fileinclude())
      .pipe(sourcemaps.init())
      .pipe(uglify())
      .pipe(sourcemaps.write('../js', {
        sourceMappingURL: function(file) {
          return file.relative + '.map';
        }
      }))
      .pipe(gulp.dest(path.build.js));
  });

  //Template css task
  gulp.task('style:build', function () {
    gulp.src(path.src.style)
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(sass({errLogToConsole: true}))
      .pipe(prefixer())
      .pipe(cssclean({debug: true}, function(details) {
        console.log(details.name + ': ' + details.stats.originalSize);
        console.log(details.name + ': ' + details.stats.minifiedSize);
      }))
      .pipe(sourcemaps.write('../css', {
        sourceMappingURL: function(file) {
          return file.relative + '.map';
        }
      }))
      .pipe(gulp.dest(path.build.css));
  });

  //Template images task
  gulp.task('imgs:build', function () {
    gulp.src(path.src.imgs)
      .pipe(plumber())
      .pipe(imagemin({
        progressive: true,
        svgoPlugins: [{removeViewBox: false}],
        use: [pngquant()],
        interlaced: true
      }))
      .pipe(gulp.dest(path.build.imgs));
  });

  //Template copy fonts
  gulp.task('fonts', function() {
    gulp.src(path.src.fonts)
      .pipe(gulp.dest(path.build.fonts))
  });

  //rm temp files
  gulp.task('clean', function (cb) {
    rimraf(path.clean, cb);
  });
//#################//

//--DEVELOP tasks--//
  //Template html task
  gulp.task('tpl:build-dev', function () {
    gulp.src(path.src.tpl)
      .pipe(plumber())
      .pipe(fileinclude())
      .pipe(gulp.dest(path.build.tpl));
  });

  //Template js task
  gulp.task('js:build-dev', function () {
    gulp.src(path.src.js)
      .pipe(plumber())
      .pipe(fileinclude())
      .pipe(gulp.dest(path.build.js));
  });

  //Template css task
  gulp.task('style:build-dev', function () {
    gulp.src(path.src.style)
      .pipe(plumber())
      .pipe(sass({errLogToConsole: true}))
      .pipe(prefixer())
      .pipe(gulp.dest(path.build.css));
  });

  //Template images task
  gulp.task('imgs:build-dev', function () {
    gulp.src(path.src.imgs)
      .pipe(plumber())
      .pipe(gulp.dest(path.build.imgs));
  });

  //Template watch task
  gulp.task('watch-dev', function(){
    watch([path.watch.tpl], function(event, cb) {
      gulp.start('tpl:build-dev');
    });
    watch([path.watch.style], function(event, cb) {
      gulp.start('style:build-dev');
    });
    watch([path.watch.imgs], function(event, cb) {
      gulp.start('imgs:build-dev');
    });
    watch([path.watch.imgs], function(event, cb) {
      gulp.start('fonts');
    });
    watch([path.watch.js], function(event, cb) {
      gulp.start('js:build-dev');
    });
  });
//#################//

//Develop build
gulp.task('develop', function(){
  return runSequence(
    'clean',
    [
      'fonts',
      'tpl:build-dev',
      'style:build-dev',
      'js:build-dev',
      'imgs:build-dev',
      'watch-dev'
    ]
  )
});

//Release build
gulp.task('release', function(){
  return runSequence(
    'clean',
    [
      'fonts',
      'tpl:build',
      'js:build',
      'style:build',
    ],
    'imgs:build'
  )
});

//Default task
gulp.task('default', ['develop']);