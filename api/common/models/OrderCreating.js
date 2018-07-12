'use strict';

const Composer = require('../lib/composer.js');

module.exports = OrderCreating => {
  Composer.restrictModelMethods(OrderCreating);
};
