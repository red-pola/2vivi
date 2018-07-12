'use strict';

module.exports = System => {
  System.ping = (options, callback) => {
    System.dataSource.connector.ping(options, callback);
  };
};
