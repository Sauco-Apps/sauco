/*
 * Third party
 */
@ @include('../../bower_components/jquery/dist/jquery.js')
@ @include('../../bower_components/bootstrap-sass/assets/javascripts/bootstrap.js')
@ @include('../../bower_components/jquery-asPieProgress/dist/jquery-asPieProgress.js')

/*Highcharts*/
@ @include('../../bower_components/highcharts/highstock.js')

/*
 * Frontend WebApp
 */
(function($) {
    'use strict';

    function WebApp() {
        this.appname = "LSKPool";
        this.version = "1.0.0";
        this.author = "ShineKami(https://lisk-ua.net/)";
    }

    //Select statistic tabs
    WebApp.prototype.selectTab = function() {
        var tabs_box = $(".box-tabs"),
            tabsbtn = tabs_box.find(".tabsbtn li"),
            tabs = tabs_box.find(".tabs");

        tabsbtn.on('click', function() {
            tabsbtn.removeClass("active");
            $(this).addClass("active");

            tabs.find(".tab").hide();
            tabs.find("#" + $(this).data("tab")).show();
        });
    }

    //Statistic chart
    WebApp.prototype.charts = function() {
        var chart = $(".pieChart");

        if (chart.length) {
            chart.asPieProgress({
                min: 0,
                max: 100.00,
                size: 100,
                speed: 15,
                barsize: '4',
                barcolor: '#65d302',
                trackcolor: '#d8d8d8',
                easing: 'ease',
                numberCallback: function(n) {
                    return this.get().toFixed(2) + "%";
                }
            });
            chart.asPieProgress("start");
        }
    }

    //Show more
    WebApp.prototype.showmore = function() {
        var $showmore = $(".showmore");

        //Active voters list
        $showmore.on('click', function() {
            var tab_id = $(this).parent().attr('id'),
                item_place = $("#" + tab_id + " tbody"),
                item_count = item_place.find(".tr_item").length,
                ajaxUrl = "/pool-stats/aget_" + tab_id + "/" + item_count;

            $.get(ajaxUrl, function(data) {
                for (var i = 0; i < data.voters.length; i++) {
                    if (tab_id === "voters") {
                        item_place.append(
                            '<tr class="tr_item sm_' + tab_id + '_item_' + i + '" style="display:none;">' +
                            '<td class="tr1"><div class="d-icon ' + data.voters[i].icon + '">' + data.voters[i].username + '</div></td>' +
                            '<td class="tr2"><a href="' + data.voters[i].explorer_url + '" target="_blank" title="' + data.voters[i].username + '">' + data.voters[i].address + '</a></td>' +
                            '<td class="tr3">' + data.voters[i].balance + ' SAUCO</td>' +
                            '<td class="tr4">' + data.voters[i].pool_percent + '%</td>' +
                            '</tr>'
                        );
                    } else {
                        item_place.append(
                            '<tr class="tr_item sm_' + tab_id + '_item_' + i + '" style="display:none;">' +
                            '<td class="tr1"><div class="d-icon ' + data.voters[i].icon + '"><a href="/voter-stats/address/' + data.voters[i].address + '" target="_blank" title="' + data.voters[i].address + '">' + data.voters[i].address + '</a></div></td>' +
                            '<td class="tr3">' + data.voters[i].reward + ' SAUCO</td>' +
                            '<td class="tr3">' + data.voters[i].total + ' SAUCO</td>' +
                            '</tr>'
                        );
                    }

                    item_place.find('.sm_' + tab_id + '_item_' + i).show('slow');
                }

                //Hide show more button
                if (data.end) {
                    $("#" + tab_id).find(".showmore").hide();
                }
            });
        });
    }

    //Get voter info
    WebApp.prototype.getvoterinfo = function() {
        var $btn = $("[name='getvoterinfo']");

        $btn.on('click', function() {
            var address = $("[name='address']").val();

            if (address.length) {
                window.location = "/voter-stats/address/" + address;
            }
        });
    }

    //Highcharts
    WebApp.prototype.hcharts = function() {
        var $charts = $(".hcharts");

        if ($charts.length) {
            $charts.each(function(i) {
                var data_url = $(this).data('url'),
                    data_ptitle = $(this).data('ptitle'),
                    data_decimal = parseInt($(this).data('pdecimal'));

                $.getJSON(data_url, function(data) {
                    var chart_param = {
                        rangeSelector: {
                            buttons: [{
                                type: 'hour',
                                count: 1,
                                text: '1h'
                            }, {
                                type: 'hour',
                                count: 12,
                                text: '12h'
                            }, {
                                type: 'day',
                                count: 1,
                                text: '1d'
                            }, {
                                type: 'day',
                                count: 3,
                                text: '3d'
                            }, {
                                type: 'week',
                                count: 1,
                                text: '1w'
                            }, {
                                type: 'month',
                                count: 1,
                                text: '1m'
                            }, {
                                type: 'month',
                                count: 6,
                                text: '6m'
                            }, {
                                type: 'year',
                                count: 1,
                                text: '1y'
                            }, {
                                type: 'all',
                                text: 'All'
                            }],
                            selected: 1,
                        },
                        chart: {
                            type: 'area',
                            renderTo: $('.hcharts')[i]
                        },
                        title: {
                            text: ''
                        },
                        yAxis: {
                            title: {
                                text: ''
                            },
                            opposite: true,
                            labels: {
                                formatter: function() {
                                    return this.value.toFixed(data_decimal);
                                },
                                style: {
                                    color: '#aeaeae',
                                    fontSize: '14px',
                                    fontFamily: 'Rob_reg'
                                }
                            },
                            showFirstLabel: true,
                            showLastLabel: true
                        },
                        xAxis: {
                            type: 'datetime',
                            labels: {
                                style: {
                                    color: '#aeaeae',
                                    fontSize: '14px',
                                    fontFamily: 'Rob_reg'
                                }
                            },
                            crosshair: {
                                color: '#65d302',
                                width: 2,
                                zIndex: 4
                            },
                        },
                        plotOptions: {
                            series: {
                                showInNavigator: true
                            }
                        },
                        series: [{
                            name: data_ptitle,
                            threshold: null,
                            color: '#65d302',
                            lineWidth: 2,
                            fillColor: 'rgba(101, 211, 2, 0.18)',
                            tooltip: {
                                valueDecimals: data_decimal
                            },
                            data: data
                        }]
                    }

                    new Highcharts.stockChart(chart_param);
                });
            });
        }
    }

    //Init all functional
    WebApp.prototype.init = function() {
        if (!$('body').hasClass('webapp-init')) {
            this.selectTab();
            this.charts();
            this.showmore();
            this.getvoterinfo();
            this.hcharts();

            $('body').addClass('webapp-init');
        }
    }

    //Global fronted application
    window.app = new WebApp;
})(jQuery);

jQuery(document).ready(function() {
    app.init();
}).ajaxComplete(function() {
    app.init();
})