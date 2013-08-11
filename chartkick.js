/*
 * Chartkick.js
 * Create beautiful Javascript charts with minimal code
 * https://github.com/ankane/chartkick.js
 * v1.1.0
 * MIT License
 */

/*jslint browser: true, indent: 2, plusplus: true */
/*global google, $*/

(function() {
  'use strict';

  // helpers

  function isArray(variable) {
    return Object.prototype.toString.call(variable) === "[object Array]";
  }

  function isPlainObject(variable) {
    return variable instanceof Object;
  }

  // https://github.com/madrobby/zepto/blob/master/src/zepto.js
  function extend(target, source) {
    var key;
    for (key in source) {
      if (isPlainObject(source[key]) || isArray(source[key])) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key])) {
          target[key] = {};
        }
        if (isArray(source[key]) && !isArray(target[key])) {
          target[key] = [];
        }
        extend(target[key], source[key]);
      }
      else if (source[key] !== undefined) {
        target[key] = source[key];
      }
    }
  }

  function merge(obj1, obj2) {
    var target = {};
    extend(target, obj1);
    extend(target, obj2);
    return target;
  }

  // https://github.com/Do/iso8601.js
  var ISO8601_PATTERN = /(\d\d\d\d)(\-)?(\d\d)(\-)?(\d\d)(T)?(\d\d)(:)?(\d\d)?(:)?(\d\d)?([\.,]\d+)?($|Z|([\+\-])(\d\d)(:)?(\d\d)?)/i;
  var DECIMAL_SEPARATOR = String(1.5).charAt(1);

  function parseISO8601(input) {
    var day, hour, matches, milliseconds, minutes, month, offset, result, seconds, type, year;
    type = Object.prototype.toString.call(input);
    if (type === '[object Date]') {
      return input;
    }
    if (type !== '[object String]') {
      return;
    }
    if (matches = input.match(ISO8601_PATTERN)) {
      year = parseInt(matches[1], 10);
      month = parseInt(matches[3], 10) - 1;
      day = parseInt(matches[5], 10);
      hour = parseInt(matches[7], 10);
      minutes = matches[9] ? parseInt(matches[9], 10) : 0;
      seconds = matches[11] ? parseInt(matches[11], 10) : 0;
      milliseconds = matches[12] ? parseFloat(DECIMAL_SEPARATOR + matches[12].slice(1)) * 1000 : 0;
      result = Date.UTC(year, month, day, hour, minutes, seconds, milliseconds);
      if (matches[13] && matches[14]) {
        offset = matches[15] * 60;
        if (matches[17]) {
          offset += parseInt(matches[17], 10);
        }
        offset *= matches[14] === '-' ? -1 : 1;
        result -= offset * 60 * 1000;
      }
      return new Date(result);
    }
  }
  // end iso8601.js

  function negativeValues(series) {
    var i, j, data;
    for (i = 0; i < series.length; i++) {
      data = series[i].data;
      for (j = 0; j < data.length; j++) {
        if (data[j][1] < 0) {
          return true;
        }
      }
    }
    return false;
  }

  function jsOptionsFunc(defaultOptions, hideLegend, setMin, setMax) {
    return function(series, opts, chartOptions) {
      var options = merge({}, defaultOptions);
      options = merge(options, chartOptions || {});

      // hide legend
      // this is *not* an external option!
      if (opts.hideLegend) {
        hideLegend(options);
      }

      // min
      if ("min" in opts) {
        setMin(options, opts.min);
      }
      else if (!negativeValues(series)) {
        setMin(options, 0);
      }

      // max
      if ("max" in opts) {
        setMax(options, opts.max);
      }

      // merge library last
      options = merge(options, opts.library || {});

      return options;
    };
  }

  // only functions that need defined specific to charting library
  var renderLineChart, renderPieChart, renderColumnChart, renderBarChart, renderAreaChart, waitForLoaded, getSVG;

  if ("Highcharts" in window) {
    waitForLoaded = function(callback) {
      callback();
    };

    getSVG = function(element) {
      return $(element).highcharts().getSVG({exporting: {sourceWidth: $(element).width()}});
    };

    var defaultOptions = {
      chart: {},
      xAxis: {
        labels: {
          style: {
            fontSize: "12px"
          }
        }
      },
      yAxis: {
        title: {
          text: null
        },
        labels: {
          style: {
            fontSize: "12px"
          }
        }
      },
      title: {
        text: null
      },
      credits: {
        enabled: false
      },
      legend: {
        borderWidth: 0
      },
      tooltip: {
        style: {
          fontSize: "12px"
        }
      },
      plotOptions: {
        areaspline: {},
        series: {
          marker: {}
        }
      },
      exporting: {
        enabled: false
      }
    };

    var hideLegend = function(options) {
      options.legend.enabled = false;
    };

    var setMin = function(options, min) {
      options.yAxis.min = min;
    };

    var setMax = function(options, max) {
      options.yAxis.max = max;
    };

    var jsOptions = jsOptionsFunc(defaultOptions, hideLegend, setMin, setMax);

    renderLineChart = function(element, series, opts, chartType) {
      chartType = chartType || "spline";
      var chartOptions = {};
      if (chartType === "areaspline") {
        chartOptions = {
          plotOptions: {
            areaspline: {
              stacking: "normal"
            },
            series: {
              marker: {
                enabled: false
              }
            }
          }
        };
      }
      var options = jsOptions(series, opts, chartOptions), data, i, j;
      options.xAxis.type = "datetime";
      options.chart.type = chartType;
      options.chart.renderTo = element.id;

      for (i = 0; i < series.length; i++) {
        data = series[i].data;
        for (j = 0; j < data.length; j++) {
          data[j][0] = data[j][0].getTime();
        }
        series[i].marker = {symbol: "circle"};
      }
      options.series = series;
      new Highcharts.Chart(options);
    };

    renderPieChart = function(element, series, opts) {
      var options = merge(defaultOptions, opts.library || {});
      options.chart.renderTo = element.id;
      options.series = [{
        type: "pie",
        name: "Value",
        data: series
      }];
      new Highcharts.Chart(options);
    };

    renderColumnChart = function(element, series, opts, chartType) {
      chartType = chartType || "column";
      var options = jsOptions(series, opts), i, j, s, d, rows = [];
      options.chart.type = chartType;
      options.chart.renderTo = element.id;

      for (i = 0; i < series.length; i++) {
        s = series[i];

        for (j = 0; j < s.data.length; j++) {
          d = s.data[j];
          if (!rows[d[0]]) {
            rows[d[0]] = new Array(series.length);
          }
          rows[d[0]][i] = d[1];
        }
      }

      var categories = [];
      for (i in rows) {
        if (rows.hasOwnProperty(i)) {
          categories.push(i);
        }
      }
      options.xAxis.categories = categories;

      var newSeries = [];
      for (i = 0; i < series.length; i++) {
        d = [];
        for (j = 0; j < categories.length; j++) {
          d.push(rows[categories[j]][i] || 0);
        }

        newSeries.push({
          name: series[i].name,
          data: d
        });
      }
      options.series = newSeries;

      new Highcharts.Chart(options);
    };

    renderBarChart = function(element, series, opts) {
      renderColumnChart(element, series, opts, "bar");
    };

    renderAreaChart = function(element, series, opts) {
      renderLineChart(element, series, opts, "areaspline");
    };
  } else if ("google" in window) { // Google charts
    // load from google
    var loaded = false;
    google.setOnLoadCallback(function() {
      loaded = true;
    });
    google.load("visualization", "1.0", {"packages": ["corechart"]});

    waitForLoaded = function(callback) {
      google.setOnLoadCallback(callback); // always do this to prevent race conditions (watch out for other issues due to this)
      if (loaded) {
        callback();
      }
    };

    getSVG = function(element) {
      return element.getElementsByTagName("svg")[0].parentNode.innerHTML;
    };

    // Set chart options
    var defaultOptions = {
      chartArea: {},
      fontName: "'Lucida Grande', 'Lucida Sans Unicode', Verdana, Arial, Helvetica, sans-serif",
      pointSize: 6,
      legend: {
        textStyle: {
          fontSize: 12,
          color: "#444"
        },
        alignment: "center",
        position: "right"
      },
      curveType: "function",
      hAxis: {
        textStyle: {
          color: "#666",
          fontSize: 12
        },
        gridlines: {
          color: "transparent"
        },
        baselineColor: "#ccc",
        viewWindow: {}
      },
      vAxis: {
        textStyle: {
          color: "#666",
          fontSize: 12
        },
        baselineColor: "#ccc",
        viewWindow: {}
      },
      tooltip: {
        textStyle: {
          color: "#666",
          fontSize: 12
        }
      }
    };

    var hideLegend = function(options) {
      options.legend.position = "none";
    };

    var setMin = function(options, min) {
      options.vAxis.viewWindow.min = min;
    };

    var setMax = function(options, max) {
      options.vAxis.viewWindow.max = max;
    };

    var setBarMin = function(options, min) {
      options.hAxis.viewWindow.min = min;
    };

    var setBarMax = function(options, max) {
      options.hAxis.viewWindow.max = max;
    };

    var jsOptions = jsOptionsFunc(defaultOptions, hideLegend, setMin, setMax);

    // cant use object as key
    var createDataTable = function(series, columnType) {
      var data = new google.visualization.DataTable();
      data.addColumn(columnType, "");

      var i, j, s, d, key, rows = [];
      for (i = 0; i < series.length; i++) {
        s = series[i];
        data.addColumn("number", s.name);

        for (j = 0; j < s.data.length; j++) {
          d = s.data[j];
          key = (columnType === "datetime") ? d[0].getTime() : d[0];
          if (!rows[key]) {
            rows[key] = new Array(series.length);
          }
          rows[key][i] = toFloat(d[1]);
        }
      }

      var rows2 = [];
      for (i in rows) {
        if (rows.hasOwnProperty(i)) {
          rows2.push([(columnType === "datetime") ? new Date(toFloat(i)) : i].concat(rows[i]));
        }
      }
      if (columnType === "datetime") {
        rows2.sort(sortByTime);
      }
      data.addRows(rows2);

      return data;
    };

    var resize = function(callback) {
      addEvent(window, "resize", callback);
      callback();
    };

    renderLineChart = function(element, series, opts) {
      var options = jsOptions(series, opts);
      var data = createDataTable(series, "datetime");
      var chart = new google.visualization.LineChart(element);
      resize( function() {
        chart.draw(data, options);
      });
    };

    renderPieChart = function(element, series, opts) {
      var chartOptions = {
        chartArea: {
          top: "10%",
          height: "80%"
        }
      };
      var options = merge(merge(defaultOptions, chartOptions), opts.library || {});

      var data = new google.visualization.DataTable();
      data.addColumn("string", "");
      data.addColumn("number", "Value");
      data.addRows(series);

      var chart = new google.visualization.PieChart(element);
      resize( function() {
        chart.draw(data, options);
      });
    };

    renderColumnChart = function(element, series, opts) {
      var options = jsOptions(series, opts);
      var data = createDataTable(series, "string");
      var chart = new google.visualization.ColumnChart(element);
      resize( function() {
        chart.draw(data, options);
      });
    };

    renderBarChart = function(element, series, opts) {
      var chartOptions = {
        hAxis: {
          gridlines: {
            color: "#ccc"
          }
        }
      };
      var options = jsOptionsFunc(defaultOptions, hideLegend, setBarMin, setBarMax)(series, opts, chartOptions);
      var data = createDataTable(series, "string");
      var chart = new google.visualization.BarChart(element);
      resize( function() {
        chart.draw(data, options);
      });
    };

    renderAreaChart = function(element, series, opts) {
      var chartOptions = {
        isStacked: true,
        pointSize: 0,
        areaOpacity: 0.5
      };
      var options = jsOptions(series, opts, chartOptions);
      var data = createDataTable(series, "datetime");
      var chart = new google.visualization.AreaChart(element);
      resize( function() {
        chart.draw(data, options);
      });
    };
  } else { // no chart library installed
    renderLineChart = renderPieChart = renderColumnChart = renderBarChart = renderAreaChart = function() {
      throw new Error("Please install Google Charts or Highcharts");
    };
  }

  function setText(element, text) {
    if (document.body.innerText) {
      element.innerText = text;
    } else {
      element.textContent = text;
    }
  }

  function chartError(element, message) {
    setText(element, "Error Loading Chart: " + message);
    element.style.color = "#ff0000";
  }

  function getJSON(element, url, success) {
    $.ajax({
      dataType: "json",
      url: url,
      success: success,
      error: function(jqXHR, textStatus, errorThrown) {
        var message = (typeof errorThrown === "string") ? errorThrown : errorThrown.message;
        chartError(element, message);
      }
    });
  }

  function isCanvasSupported() {
    var elem = document.createElement("canvas");
    return !!(elem.getContext && elem.getContext("2d"));
  }

  // IE does not support navigation to data uris
  // http://msdn.microsoft.com/en-us/library/cc848897(v=VS.85).aspx
  function isDataUriNavigationSupported() {
    return navigator.appName !== "Microsoft Internet Explorer";
  }

  // http://stackoverflow.com/questions/10149963/adding-event-listener-cross-browser
  function addEvent(elem, event, fn) {
    if (elem.addEventListener) {
      elem.addEventListener(event, fn, false);
    } else {
      elem.attachEvent("on" + event, function() {
        // set the this pointer same as addEventListener when fn is called
        return(fn.call(elem, window.event));
      });
    }
  }

  // https://gist.github.com/shawnbot/4166283
  function childOf(p, c) {
    if (p === c) return false;
    while (c && c !== p) c = c.parentNode;
    return c === p;
  }

  function getDataUri(element) {
    var canvas = document.createElement("canvas");
    window.canvg(canvas, getSVG(element));
    return canvas.toDataURL("image/png");
  }

  // helpful
  // http://www.intridea.com/blog/2013/1/9/downloadable-svg-in-png-format
  function bindDownloadLink(element, opts) {
    if (opts.download && isCanvasSupported() && isDataUriNavigationSupported() && "canvg" in window) {
      var link = document.createElement("a");
      link.download = "chart.png"; // http://caniuse.com/download
      link.style.position = "absolute";
      link.style.top = "20px";
      link.style.right = "20px";
      link.style.zIndex = 1000;
      link.target = "_blank"; // for safari
      link.innerHTML = "<img style='border: none;' src='data:image/png;base64,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TUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS4xLjIiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjE8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOkNvbXByZXNzaW9uPjU8L3RpZmY6Q29tcHJlc3Npb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjcyPC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj43MjwvdGlmZjpZUmVzb2x1dGlvbj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjIwPC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4yMDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogICAgICAgICA8ZGM6c3ViamVjdD4KICAgICAgICAgICAgPHJkZjpCYWcvPgogICAgICAgICA8L2RjOnN1YmplY3Q+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgogICAgICAgICA8eG1wOk1vZGlmeURhdGU+MjAxMy0wOC0xMFQxNjowODo2NzwveG1wOk1vZGlmeURhdGU+CiAgICAgICAgIDx4bXA6Q3JlYXRvclRvb2w+UGl4ZWxtYXRvciAyLjI8L3htcDpDcmVhdG9yVG9vbD4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CqGw4BAAAAK+SURBVDgRrZRNiFJRFMd9mqYgtZA+hoE+KGmCIsgirCTND9oMtJgKonZTVBS1aN+ionWBzaJgatViioEWA6mp4UJkoDbTpiwHmij6oMwmxfTZ7zy99nBGBqID13PO//zP/55337tqrVbL8j9tWT+xXC43UK1Wj2ia5oUzyPrEesuajEajr/GLmtY7IUKrarXaTdgj1Oy9XWwA3HricDguBIPB4oK6WTCRSOyh4RGYTGQY+Vfy9ySrWWvbqPH7g9pJpn1swizdCVOp1Doan7M8QoA8yboaiUReqIZ0Or2p2WxehnOmg9VtNtv+cDg8rTjdM9R1/QGgEhtn51FynalHrFbrACJVsLtgZ9l8Dv41Ygd+Ip/Pb/X7/VVyi1V+ksnkAdxeiZnqvhKTHLtB0y0E77RTi4Wpr8O7Ijn4+kqlclzVDEHAUx3gl91uv0SsK0I/z6Yy4WynflrxDEF229EBEry576q4hNc5ignh0L9dnMTqDDdIQuGNeMyWzWY3SgBm5wkktIBtFl+v1z/EYrF5cIOPd1FbwzAfDUEAOVA3zS5pyGQyQ41GY1qIkitDSD5oHd4wfkr4cIwy/L8vhcKsoBS3iQ+FQi9xw+AGSbCOyWOOcn5Tkis+4TdeVFkw9VKeSYIFmG6LBDQ9xZlFDTEax6VeKBRW4I5JjKn+tiAf5xigzo4aoz+U6ycsk+i8TKbE+O5c5XJZbpRbePTHxYuZb0qc7+2cAWrajNPpPBgIBD5LzoG7OfCfEosY351ct4jkHEuCjQ8RGofZFSwWi8tLpVKOXXd3iHJ/bzNZko3UXd5H/Tz4kHCwd/xJ7GSzL+3UNKEAXKmVNN8jPCz5EpZH7Chic2Zed0IzyFU8QX6RaXaZcYl5xFfgcY/HM+bz+X4vqFPsxbo5wl4SLyKDeOMPlhczQ9y3adEJu4r/EPwBW1NR1mnwKHgAAAAASUVORK5CYII=' />";
      link.href = getDataUri(element);
      element.style.position = "relative";

      // update href on resize
      addEvent(window, "resize", function() {
        link.href = getDataUri(element);
      });

      // mouseenter
      addEvent(element, "mouseover", function(e) {
        var related = e.relatedTarget;
        if (!related || (related !== this && !childOf(this, related))) {
          element.appendChild(link);
        }
      });

      // mouseleave
      addEvent(element, "mouseout", function(e) {
        var related = e.relatedTarget;
        if (!related || (related !== this && !childOf(this, related))) {
          link.parentNode.removeChild(link);
        }
      });
    }
  }

  function errorCatcher(element, data, opts, callback) {
    try {
      waitForLoaded( function() {
        callback(element, data, opts);
        bindDownloadLink(element, opts);
      });
    } catch (err) {
      chartError(element, err.message);
      throw err;
    }
  }

  function fetchDataSource(element, dataSource, opts, callback) {
    if (typeof dataSource === "string") {
      getJSON(element, dataSource, function(data, textStatus, jqXHR) {
        errorCatcher(element, data, opts, callback);
      });
    } else {
      errorCatcher(element, dataSource, opts, callback);
    }
  }

  // type conversions

  function toStr(n) {
    return "" + n;
  }

  function toFloat(n) {
    return parseFloat(n);
  }

  function toDate(n) {
    if (typeof n !== "object") {
      if (typeof n === "number") {
        n = new Date(n * 1000); // ms
      } else { // str
        // try our best to get the str into iso8601
        // TODO be smarter about this
        var str = n.replace(/ /, "T").replace(" ", "").replace("UTC", "Z");
        n = parseISO8601(str) || new Date(n);
      }
    }
    return n;
  }

  function toArr(n) {
    if (!isArray(n)) {
      var arr = [], i;
      for (i in n) {
        if (n.hasOwnProperty(i)) {
          arr.push([i, n[i]]);
        }
      }
      n = arr;
    }
    return n;
  }

  // process data

  function sortByTime(a, b) {
    return a[0].getTime() - b[0].getTime();
  }

  function processSeries(series, opts, time) {
    var i, j, data, r, key;

    // see if one series or multiple
    if (!isArray(series) || typeof series[0] !== "object" || isArray(series[0])) {
      series = [{name: "Value", data: series}];
      opts.hideLegend = true;
    } else {
      opts.hideLegend = false;
    }

    // right format
    for (i = 0; i < series.length; i++) {
      data = toArr(series[i].data);
      r = [];
      for (j = 0; j < data.length; j++) {
        key = data[j][0];
        key = time ? toDate(key) : toStr(key);
        r.push([key, toFloat(data[j][1])]);
      }
      if (time) {
        r.sort(sortByTime);
      }
      series[i].data = r;
    }

    return series;
  }

  function processLineData(element, data, opts) {
    renderLineChart(element, processSeries(data, opts, true), opts);
  }

  function processColumnData(element, data, opts) {
    renderColumnChart(element, processSeries(data, opts, false), opts);
  }

  function processPieData(element, data, opts) {
    var perfectData = toArr(data), i;
    for (i = 0; i < perfectData.length; i++) {
      perfectData[i] = [toStr(perfectData[i][0]), toFloat(perfectData[i][1])];
    }
    renderPieChart(element, perfectData, opts);
  }

  function processBarData(element, data, opts) {
    renderBarChart(element, processSeries(data, opts, false), opts);
  }

  function processAreaData(element, data, opts) {
    renderAreaChart(element, processSeries(data, opts, true), opts);
  }

  function setElement(element, data, opts, callback) {
    if (typeof element === "string") {
      element = document.getElementById(element);
    }
    fetchDataSource(element, data, opts || {}, callback);
  }

  // define classes

  var Chartkick = {
    LineChart: function(element, dataSource, opts) {
      setElement(element, dataSource, opts, processLineData);
    },
    PieChart: function(element, dataSource, opts) {
      setElement(element, dataSource, opts, processPieData);
    },
    ColumnChart: function(element, dataSource, opts) {
      setElement(element, dataSource, opts, processColumnData);
    },
    BarChart: function(element, dataSource, opts) {
      setElement(element, dataSource, opts, processBarData);
    },
    AreaChart: function(element, dataSource, opts) {
      setElement(element, dataSource, opts, processAreaData);
    }
  };

  window.Chartkick = Chartkick;
})();
