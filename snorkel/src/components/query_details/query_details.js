"use strict";

module.exports = {
  tagName: "div",
  className: "",
  client: function(options) {
    var created_str = new Date(options.created).toISOString();
    var helpers = bootloader.require("app/client/views/helpers");
    var that = this;

    var view = options.query.parsed.baseview || options.query.parsed.view;
    var count = 0;
    var w_count = 0;
    var results = options.query.results;
    if (view == "samples") {
      count = results.length;

    }

    if (view == "table" || view == "time" || view == "dist") {
      _.each(results, function(row) {
        count += row.count;
        w_count += row.weight;
      });

    }

    if (!_.isNaN(count)) {
      that.$el.find(".count").text("Sample Count: " + helpers.count_format(count));
    }

    if (!_.isNaN(w_count)) {
      that.$el.find(".weight").text("Weighted Samples: " + helpers.count_format(w_count));
    }

    $C("timeago", {time: created_str }, function(cmp) {
      that.$el.find(".timestamp").append(cmp.$el);
    });
  }
};
