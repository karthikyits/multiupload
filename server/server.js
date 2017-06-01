'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var proxy = require('proxy-agent');
var bucketName = 'yits';

var app = module.exports = loopback();
var multer  =   require('multer');
var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, 'd:/uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname );
  }
});

var upload = multer({ storage : storage }).array('userPhoto',5);
app.start = function() {
  // start the web server
  //uploadtos3();
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};
app.get('/',function(req,res){
  res.sendFile(__dirname + "/index.html");
});
app.post('/api/photo',function(req,res){
  upload(req,res,function(err) {
    //console.log(req.body);
    console.log(req.files);
    if(err) {
      return res.end("Error uploading file.");
    } else {
      console.log("uploading... to s3");
      var AWS = require('aws-sdk');
      var fs = require('fs');
      AWS.config.loadFromPath(__dirname+ "/s3-config.json");
      /*AWS.config.update({
        httpsOptions: { agent: proxy('<proxy_url>')},
        httpOptions: { agent: proxy('<<proxy_url>>') }
      });*/
      var s3Bucket = new AWS.S3( { params: {Bucket: bucketName} } );

      fs.readFile(req.files[0].path, function (err, data) {
        var params  = {
          Key: req.files[0].originalname,
          Body: data,
          ContentType: req.files[0].mimetype,
          ACL:'public-read'

        };
        s3Bucket.putObject(params , function(err, data){
          if (err) {
            console.log(err);
            console.log('Error uploading data: ', params);
          } else {
            console.log('Successfully uploaded the image!');
            var link = s3Bucket.endpoint.href+bucketName +'/'+ params.Key;
            console.log('link -> ' + link);
            res.write("File is Uploaded, Download link : ");
            res.end(link);
          }
        });
      });


    }

  });
});
// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
