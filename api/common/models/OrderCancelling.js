'use strict';

const Composer = require('../lib/composer.js');

module.exports = OrderCancelling => {
  Composer.restrictModelMethods(OrderCancelling);
};
