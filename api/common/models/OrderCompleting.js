'use strict';

const Composer = require('../lib/composer.js');

module.exports = OrderCompleting => {
  Composer.restrictModelMethods(OrderCompleting);
};
