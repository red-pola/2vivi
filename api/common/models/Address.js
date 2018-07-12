'use strict';

const Composer = require('../lib/composer.js');

module.exports = Address => {
  Composer.restrictModelMethods(Address);
};
