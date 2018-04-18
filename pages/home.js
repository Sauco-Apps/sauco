//Load modules
var express = require('express');
var request = require('request');
var router = express.Router();
var pool = require('../libs/pool.js');

//Init config
var config = pool.config;

//Page tags
var data = {
  "TITLE": config.pool.name,
	"daddr": config.delegate.address,
	"pshare": 100 - config.pool.pool_fees,
	"pptime": config.pool.withdrawal_time / 3600,
	"ppmin": config.pool.withdrawal_min
};

//Home page
router.get('/', function (req, res, next) {
	data.MAINMENU = pool.build_menu(req.baseUrl);

  if(config.network == 'testnet'){
    data.network = "TestNet";
  } else {
    data.network = "MainNet";
  }

  request.get(pool.get_api("accounts?address="+config.delegate.address, null), function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var answ = JSON.parse(body);

      if(answ.success){
        var account = answ.account;

        //Set tags
        data.publicKey = account.publicKey;

        next();
      } else {
        data.message = answ.error;
        res.render('error', data);
      }
    } else {
      data.message = "Error to connect sauco node on "+error.address+":"+error.port;
      res.render('error', data);
    }
  });
}, function (req, res) {
	request.get(pool.get_api("delegates", "get?publicKey="+data.publicKey), function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var answ = JSON.parse(body);

      if(answ.success){
        var delegate = answ.delegate;            
      
        data.username = delegate.username;

        //Render page
        res.render('home', data);
      } else {
        data.message = answ.error;
        res.render('error', data);
      }
    } else  {
      data.message = "Error to connect sauco node on "+error.address+":"+error.port;
      res.render('error', data);
    }
  });
});

module.exports = router;