'use strict';

const LoopBackCardStore = require('../../lib/loopback-card-store');
const Util = require('../lib/composer');

module.exports = User => {
  const whitelist = ['registration', 'login', 'logout', 'changePassword'];

  User.sharedClass.methods().forEach(method => {
    const name = `${method.isStatic ? '' : 'prototype.'}${method.name}`;

    if (whitelist.indexOf(name) === -1) {
      User.disableRemoteMethodByName(name);
    }
  });
  ['accessTokens', 'credentials', 'identities'].forEach(method => {
    User.disableRemoteMethodByName(`prototype.__count__${method}`);
    User.disableRemoteMethodByName(`prototype.__create__${method}`);
    User.disableRemoteMethodByName(`prototype.__delete__${method}`);
    User.disableRemoteMethodByName(`prototype.__destroyById__${method}`);
    User.disableRemoteMethodByName(`prototype.__findById__${method}`);
    User.disableRemoteMethodByName(`prototype.__get__${method}`);
    User.disableRemoteMethodByName(`prototype.__updateById__${method}`);
  });

  // Registration api
  User.registration = async buyer => {
    const user = await User.create(buyer);
    const cardStore = new LoopBackCardStore(User.app.models.Card, user.id);
    await Util.addBuyer(buyer);
    const card = await Util.issueBuyerIdentity(buyer.email);
    await cardStore.put(buyer.email, card);
    const lbCard = await User.app.models.Card.findOne({
      where: {
        userId: user.id,
        name: buyer.email,
      },
    });
    lbCard.default = true;
    await lbCard.save();

    return user;
  };
};
