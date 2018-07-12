'use strict';

const Composer = require('../lib/composer.js');

module.exports = Seller => {
  Composer.restrictModelMethods(Seller);
};
