'use strict';

const Composer = require('../lib/composer.js');

module.exports = Product => {
  Composer.restrictModelMethods(Product);
};
