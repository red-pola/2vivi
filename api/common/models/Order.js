'use strict';

const Composer = require('../lib/composer.js');

module.exports = Order => {
  Composer.restrictModelMethods(Order);
};
