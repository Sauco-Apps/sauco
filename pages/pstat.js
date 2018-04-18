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

//Showmore
var voters_list;
var voters_num, voters_reward_num = 0;

//Main
router.get('/', function(req, res, next) {
  pool.get_delegateInfo(function(){
    var voters_reward = []; 
    var voters = pool.voters;

    //Set tags
    data.MAINMENU = pool.build_menu(req.baseUrl);
    data.publicKey = pool.publicKey;
    data.address = pool.address;
    data.balance = pool.lsk_convert(pool.balance).toLocaleString();
    data.explorer_url = pool.get_explorer(pool.address);
    data.forgedblocks = pool.forgedblocks;
    data.missedblocks = pool.missedblocks;
    data.productivity = pool.productivity;
    data.username = pool.username;
    data.rate = pool.rate;
    data.approval = pool.approval;
    data.total_lskvote = pool.total_lskvote;
    data.total_support = pool.lsk_convert(pool.total_lskvote).toLocaleString();

    for(var i = 0; i < voters.length; i++){
      voters[i].pool_percent = (voters[i].balance / data.total_lskvote * 100).toFixed(4);
      voters[i].balance = pool.lsk_convert(voters[i].balance).toLocaleString();
      voters[i].explorer_url = pool.get_explorer(voters[i].address);

      if(voters[i].username == null){
        voters[i].username = "N/A";
        voters[i].icon = "l-icon";
      }
    }

    data.voters_count = voters.length;
    voters_list = voters.reverse();
    data.voters = voters_list.slice(0, config.pool.showmore);

    //Voters Reward
    pool.db.any("SELECT * FROM voters WHERE active = 'true' ORDER BY total DESC LIMIT "+config.pool.showmore)
    .then(rdata => {
      for(var i=0; i<rdata.length; i++){
        if(rdata[i].username == null){
          rdata[i].icon = "l-icon";
        }

        voters_reward.push({
          "address": rdata[i].address,
          "reward": rdata[i].balance,
          "total": rdata[i].total,
          "icon": rdata[i].icon
        });
      }

      data.voters_reward = voters_reward;

      res.render('pool-stats', data);
    })
    .catch(error => {
      pool.log("ERR", error.message || error);
    });
  });
});

//AJAX: Active voters list
router.get('/aget_voters/:num', function(req, res) {
  if(req.xhr){
    var si_count = req.params.num,
        si_count_next = parseInt(si_count) + parseInt(config.pool.showmore),
        end = false;

    if(si_count_next >= data.voters_count){
      end = true;
    }

    res.json({
      "voters": voters_list.slice(si_count, si_count_next),
      "end": end
    });
  } else {
    res.render('error', {
      "message": "Is not Ajax request!"
    });
  }
});

//AJAX: Reward voters list
router.get('/aget_reward/:num', function(req, res) {
  if(req.xhr){
    var si_count = req.params.num,
        si_count_next = parseInt(si_count) + parseInt(config.pool.showmore),
        end = false;

    if(si_count_next >= data.voters_count){
      end = true;
    }

    //Voters Reward
    pool.db.any("SELECT * FROM voters ORDER BY total DESC OFFSET "+si_count+" LIMIT "+config.pool.showmore)
    .then(rdata => {
      var voters_reward = [];

      for(var i=0; i<rdata.length; i++){
        if(rdata[i].username == null){
          rdata[i].icon = "l-icon";
        }

        voters_reward.push({
          "address": rdata[i].address,
          "reward": rdata[i].balance,
          "total": rdata[i].total,
          "icon": rdata[i].icon
        });
      }

      res.json({
        "voters": voters_reward,
        "end": end
      });
    })
    .catch(error => {
      pool.log("ERR", error.message || error);
    });
  } else {
    res.render('error', {
      "message": "Is not Ajax request!"
    });
  }
});

module.exports = router;