'use strict';

const Composer = require('../lib/composer.js');

module.exports = OrderDelivering => {
  Composer.restrictModelMethods(OrderDelivering);
};
