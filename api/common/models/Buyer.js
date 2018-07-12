'use strict';

const Composer = require('../lib/composer.js');

module.exports = Buyer => {
  Composer.restrictModelMethods(Buyer);
};
