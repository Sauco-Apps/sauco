//Init modules
var express = require('express');
var request = require('request');
var router = express.Router();
var pool = require('../libs/pool.js');

//Init config
var config = pool.config;

//Page tags
var data = {
  "TITLE": config.pool.name
};

//Charts
router.get('/', function (req, res) {
  data.MAINMENU = pool.build_menu(req.baseUrl);

  res.render('charts', data);
});

//AJAX: Get data approval
router.get('/aget_approval', function (req, res) {
 	if(req.xhr){
	 	var edata = [];

	  pool.db.any("SELECT * FROM pool_history")
	  .then(rdata => {
	  	for(var i = 0;  i < rdata.length; i++) {
	  		edata.push([parseFloat(rdata[i].timestamp), rdata[i].approval]);
	  	}

	  	res.send(edata);
	  });
	} else {
		data.MAINMENU = pool.build_menu(req.baseUrl);
		data.message = 'Is not Ajax request!';

    res.render('error', data);
	}
});

//AJAX: Get data rank
router.get('/aget_rank', function (req, res) {
	if(req.xhr){
 		var edata = [];

	  pool.db.any("SELECT * FROM pool_history")
	  .then(rdata => {
	  	for(var i = 0;  i < rdata.length; i++) {
	  		edata.push([parseFloat(rdata[i].timestamp), rdata[i].rank]);
	  	}

	  	res.send(edata);
	  });
	} else {
		data.MAINMENU = pool.build_menu(req.baseUrl);
		data.message = 'Is not Ajax request!';

    res.render('error', data);
	}
});

//AJAX: Get data balance
router.get('/aget_balance', function (req, res) {
	if(req.xhr){
	 	var edata = [];

	  pool.db.any("SELECT * FROM pool_history")
	  .then(rdata => {
	  	for(var i = 0;  i < rdata.length; i++) {
	  		edata.push([parseFloat(rdata[i].timestamp), rdata[i].balance]);
	  	}

	  	res.send(edata);
	  });
  } else {
		data.MAINMENU = pool.build_menu(req.baseUrl);
		data.message = 'Is not Ajax request!';

    res.render('error', data);
	}
});

//AJAX: Get data vcout
router.get('/aget_vcount', function (req, res) {
	if(req.xhr){
	 	var edata = [];

	  pool.db.any("SELECT * FROM pool_history")
	  .then(rdata => {
	  	for(var i = 0;  i < rdata.length; i++) {
	  		edata.push([parseFloat(rdata[i].timestamp), rdata[i].vcount]);
	  	}

	  	res.send(edata);
	  });
  } else {
		data.MAINMENU = pool.build_menu(req.baseUrl);
		data.message = 'Is not Ajax request!';

    res.render('error', data);
	}
});

module.exports = router;