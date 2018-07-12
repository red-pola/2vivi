'use strict';

const {AdminConnection} = require('composer-admin');
const {BusinessNetworkConnection} = require('composer-client');
const {IdCard} = require('composer-common');

const config = require('./config.json');
const NS = 'com.redpola.vivi';

/**
 * Composer specific utility methods.
 */
class Composer {
  /**
   * Restrict the remote methods on the specified model class to a clean subset.
   * @param {*} model The model class.
   */
  static restrictModelMethods(model) {
    // We now want to filter out methods that we haven't implemented or don't want.
    // We use a whitelist of method names to do this.
    let whitelist;

    if (model.settings.composer.abstract) {
      whitelist = [];
    } else if (model.settings.composer.type === 'concept') {
      whitelist = [];
    } else if (model.settings.composer.type === 'transaction') {
      whitelist = ['create', 'find', 'findById', 'exists'];
    } else {
      whitelist = [
        'create',
        'deleteById',
        'replaceById',
        'find',
        'findById',
        'exists',
      ];
    }

    model.sharedClass.methods().forEach(method => {
      const name = `${method.isStatic ? '' : 'prototype.'}${method.name}`;

      if (whitelist.indexOf(name) === -1) {
        model.disableRemoteMethodByName(name);
      } else if (name === 'exists') {
        // We want to remove the /:id/exists method.
        method.http = [{verb: 'head', path: '/:id'}];
      } else if (name === 'replaceById') {
        // We want to remove the /:id/replace method.
        method.http = [{verb: 'put', path: '/:id'}];
      }
    });

    // Restrict unauthenticated users by default
    model.settings.acls = [
      {
        accessType: '*',
        permission: 'ALLOW',
        principalId: '$authenticated',
        principalType: 'ROLE',
      },
      {
        accessType: '*',
        permission: 'DENY',
        principalId: '$unauthenticated',
        principalType: 'ROLE',
      },
    ];
  }

  static async addBuyer({firstName, lastName, email}) {
    const businessNetworkConnection = new BusinessNetworkConnection();

    await businessNetworkConnection.connect(config.composer.adminCard);

    const buyerRegistry = await businessNetworkConnection.getParticipantRegistry(
      `${NS}.Buyer`,
    );
    const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

    const buyer = factory.newResource(NS, 'Buyer', email);
    buyer.firstName = firstName;
    buyer.lastName = lastName;
    buyer.email = email;

    await buyerRegistry.add(buyer);
    await businessNetworkConnection.disconnect();
  }

  static async issueBuyerIdentity(email) {
    const businessNetworkConnection = new BusinessNetworkConnection();

    await businessNetworkConnection.connect(config.composer.adminCard);
    const identity = await businessNetworkConnection.issueIdentity(`${NS}.Buyer#${email}`, email);
    await businessNetworkConnection.disconnect();

    return await Composer.createBuyerCard(identity);
  }

  static async createBuyerCard(identity) {
    const adminConnection = new AdminConnection();
    const connectionProfile = config.connectionProfile;
    const meta = config.metadata;

    meta.businessNetwork = config.composer.network;
    meta.userName = identity.userID;
    meta.enrollmentSecret = identity.userSecret;

    const card = new IdCard(meta, connectionProfile);

    await adminConnection.connect(config.composer.adminCard);
    await adminConnection.importCard(identity.userID, card);
    await adminConnection.disconnect();

    return card;
  }
}

module.exports = Composer;
