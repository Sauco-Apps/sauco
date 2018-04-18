//Init modules
var express = require('express');
var request = require('request');
var router = express.Router();
var pool = require('../libs/pool.js');

//Init config
var config = pool.config;

//Page tags
var data = {
  "TITLE": config.pool.name,
  "network": config.network
};

//Voter statistics - Voter address
router.get('/', function (req, res) {
  data.MAINMENU = pool.build_menu(req.baseUrl);
  res.render('voter-open', data);
});

//Voter statistics - Voter info
router.get('/address/:address', function (req, res) {
  var address = req.params.address;

  //Get data
  pool.db.one("SELECT * FROM voters WHERE address='"+address+"'")
  .then(rdata => {
    data.MAINMENU = pool.build_menu(req.baseUrl);
    data.balance = rdata.balance;
    data.address = rdata.address;
    data.voter_id = rdata.id;
    data.explorer_url = pool.get_explorer(rdata.address);
    data.id = rdata.id;

    var withdrawal = [];
    pool.db.any("SELECT * FROM withdrawal_history WHERE voter_id='"+data.voter_id+"' ORDER BY timestamp DESC LIMIT 50")
    .then(rdata => {
      if(rdata.length){
        for(var i=0; i<rdata.length; i++){
          var d = new Date(+rdata[i].timestamp);
              d = ("0" + d.getDate()).slice(-2)+"."+("0" + (d.getMonth() + 1)).slice(-2)+"."+d.getFullYear()+" | "+("0" + d.getHours()).slice(-2)+":"+("0" + d.getMinutes()).slice(-2)+":"+("0" + d.getSeconds()).slice(-2);

          withdrawal.push({
            "reward": rdata[i].reward,
            "fees": rdata[i].fees,
            "txid": rdata[i].txid,
            "date": d,
            "explorer_url": pool.get_explorer(rdata[i].txid, "tx")
          });
        }

        data.withdrawal = withdrawal;
      }

      res.render('voter-stats', data);
    })
    .catch(error => {
      pool.log("ERR", error.message || error);
    });
  })
  .catch(error => {
    pool.log("ERR", error.message || error);
  });
});

//AJAX: get balance history
router.get('/aget_balance', function(req, res){
  if(req.xhr){
    var edata = [];

    pool.db.any("SELECT * FROM balance_history WHERE voter_id='"+data.voter_id+"'")
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
})

//AJAX: get withdrawal hist
router.get('/aget_withdrawal/:num', function(req, res){
  if(req.xhr){
    var si_count = req.params.num,
        si_count_next = parseInt(si_count) + parseInt(config.pool.showmore),
        end = false;

    if(si_count_next >= data.voters_count){
      end = true;
    }

    //Voters Reward
    pool.db.any("SELECT * FROM withdrawal_history WHERE voter_id='"+data.voter_id+"' ORDER BY total DESC OFFSET "+si_count+" LIMIT "+config.pool.showmore)
    .then(rdata => {
      var voters_reward = [];

      for(var i=0; i<rdata.length; i++){
        if(rdata[i].username == null){
          rdata[i].icon = "l-icon";
        }

        withdrawal.push({
          "reward": rdata[i].reward,
          "fees": rdata[i].fees,
          "txid": rdata[i].txid,
          "date": rdata[i].timestamp, //format 11.12.2017 | 12:44:39
          "explorer_url": pool.explorer_url(rdata[i].txid, "tx")
        });
      }

      res.json({
        "withdrawal": withdrawal,
        "end": end
      });
    })
    .catch(error => {
      console.log("ERROR:", error.message || error);
    });
  } else {
    res.render('error', {
      "message": "Is not Ajax request!"
    });
  }
});

module.exports = router;