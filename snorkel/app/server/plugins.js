var fs = require("fs");
var readfile = require_core("server/readfile");
var plugin = require_core("server/plugin");

var config = require_core("server/config");

var SNORKEL_CONFIG_DIR = config.config_dir;
var DATASET_CONFIG_DIR = config.dataset_config_dir;

function getDirs(dir){
    dirs_ = [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
						dirs_.push(name);
        }
    }
    return dirs_;
}

module.exports = {
  install: function() {
		var plugin_dirs = getDirs("app/plugins");
    _.each(plugin_dirs, function(plugin_dir) {
      if (plugin_dir == DATASET_CONFIG_DIR || plugin_dir == SNORKEL_CONFIG_DIR) {
        return;
      }

      console.log("REGISTERING SNORKEL PLUGIN", plugin_dir);
      plugin.register_external_plugin(plugin_dir);
    });
  },
  get_views_for_table: function get_plugin_views(table) {
    var view_config = module.exports.get_config(table);
    // now we need to look through the plugins and see which
    // plugin views are enabled
    var plugin_views = view_config.included_views;

    return plugin_views;
  },

  get_excluded_views_for_table: function(table) {
    var view_config = module.exports.get_config(table);

    var ev = view_config.excluded_views;
    if (_.isArray(ev)) {
      return ev;
    }

    if (_.isObject(ev)) {
      return _.keys(ev);
    }

    return ev || [];
  },

  get_solo_views_for_table: function(table) {
    var view_config = module.exports.get_config(table);

    var ev = view_config.exclusive_views;

    return ev;

  },

  get_config: function get_plugin_configs(table) {
    // do we do a multi plugin config? how does this work?
    var plugin_config;

    try {
      plugin_config = require_root(DATASET_CONFIG_DIR + "/" + table);
      console.log("USING CONFIG FOR", table);
    } catch(e) {
      try {
        plugin_config = require_app("plugins/config/default");
        console.log("USING DEFAULT CONFIG FOR", table);
      } catch(e) {
        console.log("CANT LOAD DEFAULT CONFIG FOR", table);

      }
    }


    return plugin_config || {};

  },
  get_configs: function get_plugin_configs() {

  }
};
