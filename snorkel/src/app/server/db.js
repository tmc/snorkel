/**
 *
 * The DB is a simple API for grabbing collections from Mongo. It makes sure
 * that the DB connection is created before accessing the collection. In
 * general, this should not fail, but it might.
 *
 * @class db (server)
 * @module Superfluous
 * @submodule Server
 */

"use strict";

var config = require_core('server/config');
var host = "localhost";
var server_options = {
  auto_reconnect: true
};

var db_options = {
  journal: 1
};

var package_json = require_core("../package.json");
var context = require_core("server/context");
var config = require_core("server/config");

var Engine, separator;

var use_mongo = config.config_driver.indexOf("mongo") === 0;
var use_tingo = config.config_driver.indexOf("tingo") === 0;
var use_linvo = config.config_driver.indexOf("linvo") === 0;

if (use_tingo || use_linvo) {
  use_mongo = false;
}

if (use_mongo) {
  Engine = require("mongodb");
  separator = "/";
} else if (use_tingo) {
  Engine = require("tingodb")();
  separator = ".";
}

var EventEmitter = require("events").EventEmitter;


function collection_builder(db_name, before_create) {
  var db_url = config.backend && config.backend.db_url;
  var _db;
  var _created = {};
  var arbiter = new EventEmitter();

  function onOpened(err, db) {
    // TODO: report errors somewhere?
    if (err) {

      console.log("ERROR OPENING DB", err);
      return ;
    }
    _db = db;
    arbiter.emit("db_open", db);
  }

  if (db_url) {
    var options = {
      uri_decode_auth: true,
      server: server_options,
      db: db_options
    };
    Engine.connect(db_url, options, onOpened);
  } else {
    if (!use_mongo) {
      var fs = require("fs");
      var TDB_DIR = "./tdb/";
      try { fs.mkdirSync(TDB_DIR); } catch(e) { }
      db_connector = new Engine.Db(TDB_DIR, {});
      db_connector.open(onOpened);
    } else {
      var port = Engine.Connection.DEFAULT_PORT;
      var mongoserver = new Engine.Server(host, port, server_options);
      var db_connector = new Engine.Db(db_name, mongoserver, db_options);
      db_connector.open(onOpened);
    }
  }

  return {
    /**
     * This function returns a collection from the mongo DB, making sure that
     * the DB is created before using it.
     *
     * @method get
     * @param {String} db_name* A namespaced name for the DB
     * @param {Function} cb Function to run when the DB is returned.
     */
    get: function() {
      var cb;
      var args = _.toArray(arguments);
      var last = args.pop();

      if (_.isFunction(last)) {
        cb = last;
      } else {
        args.push(last);
      }

      var db_name = args.join(separator);

      if (!_db && !cb) {
        console.trace();
        if (use_mongo) {
          console.log("Check that your mongo DB is started!");
        }

        throw("Trying to access DB before its been initialized");
      } else if (!_db) {
        return arbiter.once("db_open", function(db) {
          if (!_created[db_name] && before_create) {
            before_create(_db, db_name);
          }
          _created[db_name] = true;

          var collection = db.collection(db_name);
          collection._addIndex = function(name) {
            var opts = {};
            opts[name] = 1;
            collection.ensureIndex(opts);

          }

          cb(collection);
        });
      }


      if (!_created[db_name] && before_create) {
        before_create(_db, db_name);
      }

      var collection = _db.collection(db_name);
      _created[db_name] = true;
      if (cb) {
        cb(collection);
      }

      return collection;
    },

    /**
     * Returns the raw database connection
     *
     * @method raw
     * @return {Object} db Mongo DB Connection
     */
    raw: function() {
      return _db;
    }
  };
}

// // options.store = { db: require("level-js") }; // Options passed to LevelUP constructor


var SF_db;
module.exports = {
  install: function() {
    // if using mongo or tingo, we use one of these
    if (!use_linvo) {
      SF_db = collection_builder(config.db_name || package_json.name);

      // if using linvodb, we can try a different one
      module.exports.get = SF_db.get;
      module.exports.raw = SF_db.raw;
      module.exports.toArray = function(cur, cb) {
        cb = context.wrap(cb);
        cur.toArray(function(err, docs) {
          cb(err, docs);
        });

      };
    } else {
      var LinvoDB = require("linvodb3");
      var fs = require("fs");
      var ldb_dir = config.data_dir || ".";
      LinvoDB.dbPath = ldb_dir + "/ldb";

      try {
        fs.mkdirSync(LinvoDB.dbPath);
      } catch(e) {

      }

      var _collections = {};
      module.exports.toArray = function(cur, cb) {
        cb = context.wrap(cb);
        cur.exec(function(err, docs) {
          cb(err, docs);
        });

      },
      module.exports.get = function() {
        var args = _.toArray(arguments);
        var last = args.pop();
        var cb;

        if (_.isFunction(last)) {
          cb = last;
        } else {
          args.push(last);
        }

        var db_name = args.join(separator);

        if (!_collections[db_name]) {
          _collections[db_name] = new LinvoDB(db_name);
        }


        var ret = _collections[db_name];
        ret.toArray = function(ncb) {
          ncb(ret);
        };

        ret._addIndex = function(name) {
          ret.ensureIndex({fieldName: name});
        }

        if (cb) { cb(ret); }
        return ret;

      };
    }
  },
  db: collection_builder
};
