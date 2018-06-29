"use strict";

var _ = require_vendor("underscore");
var backend = require_app("server/backend");
var types = [ "integer", "string", "set" ];
var context = require_core("server/context");


function Sample(sample_data) {

  this._fields = {
    integer: {
      time: parseInt(Date.now() / 1000, 10)
    },
    string: {},
    set: {}
  };
  
  this._dataset = null;
  this._subset = null;

  var that = this;

  _.each(types, function(type) {
    var field_options  = sample_data[type];
    if (!field_options) {
      return;
    }

    _.extend(that._fields[type], field_options);
  });

  return this;
}

function add_value(type) {
  return function(key, val) {
    this._fields[type][key] = val;
    return this;
  };
}

_.extend(Sample.prototype, {

  flush: function(cb) {
    if (!this._dataset) {
      throw("trying to flush a sample without a dataset!");
    }

    if (this._flushed || this._flushing) {
      throw("trying to double log a sample!");
    }

    this._flushing = true;
    var that = this;

    if (cb) {
      cb = context.wrap(cb);
    }

    backend.add_sample(this._dataset, this._subset, this._fields, function(err, data) {
      that._flushed = true;
      if (cb) {
        cb(err, data);
      }
    });

  },

  set_dataset: function(dataset) {
    this._dataset = dataset;
    return this;
  },

  set_subset: function(subset) {
    this._subset = subset;
    return this;
  },

  add_integer: add_value("integer"),
  add_string: add_value("string"),
  add_set: add_value("set")

});

module.exports = function(data) {
  var sample = new Sample(data);
  return sample;
};

module.exports.create = module.exports;
