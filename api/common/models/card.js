'use strict';

const AdminConnection = require('composer-admin').AdminConnection;
const fs = require('fs');
const formidable = require('formidable');
const IdCard = require('composer-common').IdCard;
const LoopBackCardStore = require('../../lib/loopback-card-store');

module.exports = Card => {
  /**
   * Get the name of the default business network card for the specified user.
   * @param {string} userId The ID of the user.
   * @return {Promise} A promise that is resolved with the name of the default
   * business network card, or null if a default business network card is not set.
   */
  async function getDefaultCard(userId) {
    const card = await Card.findOne({
      where: {
        userId,
        default: true,
      },
    });

    return card ? card.name : null;
  }

  /**
   * Set the name of the default business network card for the specified user.
   * @param {string} userId The ID of the user.
   * @param {string} cardName The name of the default business network card.
   * @return {Promise} A promise that is resolved when complete.
   */
  async function setDefaultCard(userId, cardName) {
    const card = await Card.findOne({
      where: {
        userId,
        name: cardName,
      },
    });

    if (!card) {
      const error = new Error(
        `The business network card "${cardName}" does not exist`,
      );
      error.statusCode = error.status = 404;
      throw error;
    }

    await Card.updateAll(
      {
        userId,
        default: true,
      },
      {
        default: false,
      },
    );

    card.default = true;

    return await card.save();
  }

  // Disable all default remote methods.
  Card.sharedClass.methods().forEach(method => {
    const name = `${method.isStatic ? '' : 'prototype.'}${method.name}`;

    Card.disableRemoteMethodByName(name);
  });
  Card.disableRemoteMethodByName('prototype.__get__user');

  // Add a remote method for getting all cards.
  Card.getAllCards = async options => {
    const userId = options.accessToken.userId;

    const cards = await Card.find({
      where: {
        userId,
      },
    });

    return cards.map(card => ({
      name: card.name,
      default: card.default,
    }));
  };

  Card.remoteMethod('getAllCards', {
    description: 'Get all of the business network cards in the wallet',
    accepts: [
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
    ],
    returns: {
      type: ['Card'],
      root: true,
    },
    http: {
      verb: 'get',
      path: '/',
    },
  });

  // Add a remote method for getting a specific card.
  Card.getCardByName = async (name, options) => {
    const userId = options.accessToken.userId;

    const card = await Card.findOne({
      where: {
        userId,
        name,
      },
    });

    if (!card) {
      const error = new Error(
        `The business network card "${name}" does not exist`,
      );
      error.statusCode = error.status = 404;
      throw error;
    }

    return {
      name: card.name,
      default: card.default,
    };
  };

  Card.remoteMethod('getCardByName', {
    description: 'Get a specific business network card from the wallet',
    accepts: [
      {
        arg: 'name',
        type: 'string',
        required: true,
        description: 'The name of the business network card',
      },
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
    ],
    returns: {
      type: 'Card',
      root: true,
    },
    http: {
      verb: 'get',
      path: '/:name',
    },
  });

  // Add a remote method for checking if a specific card exists.
  Card.existsCardByName = async (name, options) => {
    const userId = options.accessToken.userId;

    const card = await Card.findOne({
      where: {
        userId,
        name,
      },
    });

    if (!card) {
      const error = new Error(
        `The business network card "${name}" does not exist`,
      );
      error.statusCode = error.status = 404;
      throw error;
    }

    return {
      name: card.name,
      default: card.default,
    };
  };

  Card.remoteMethod('existsCardByName', {
    description:
      'Test the existance of a specific business network card in the wallet',
    accepts: [
      {
        arg: 'name',
        type: 'string',
        required: true,
        description: 'The name of the business network card',
      },
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
    ],
    http: {
      verb: 'head',
      path: '/:name',
    },
  });

  // Add a remote method for deleting a specific card.
  Card.deleteCardByName = async (name, options) => {
    const userId = options.accessToken.userId;

    const info = await Card.destroyAll({
      userId,
      name,
    });

    if (!info.count) {
      const error = new Error(
        `The business network card "${name}" does not exist`,
      );
      error.statusCode = error.status = 404;
      throw error;
    }
  };

  Card.remoteMethod('deleteCardByName', {
    description: 'Delete a specific business network card from the wallet',
    accepts: [
      {
        arg: 'name',
        type: 'string',
        required: true,
        description: 'The name of the business network card',
      },
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
    ],
    http: {
      verb: 'delete',
      path: '/:name',
    },
  });

  // Add a remote method for importing a card.
  Card.importCard = async (ignored, name, req, options) => {
    const userId = options.accessToken.userId;
    const form = new formidable.IncomingForm();
    const cardStore = new LoopBackCardStore(Card, userId);

    const cardFile = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          return reject(err);
        }
        resolve(files.card);
      });
    });

    const cardData = await new Promise((resolve, reject) => {
      fs.readFile(cardFile.path, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });

    const card = await IdCard.fromArchive(cardData);

    if (!name) {
      const locationName =
        card.getBusinessNetworkName() || card.getConnectionProfile().name;
      name = `${card.getUserName()}@${locationName}`;
    }

    // Put the card into the card store.
    await cardStore.put(name, card);
    const updatedCard = await cardStore.get(name);

    // Then we import the card into the card store using the admin connection.
    // This imports the credentials from the card into the LoopBack wallet.
    const adminConnection = new AdminConnection({cardStore});
    await adminConnection.importCard(name, updatedCard);

    const defaultCard = await getDefaultCard(userId);
    if (!defaultCard) {
      return await setDefaultCard(userId, name);
    }
  };

  Card.remoteMethod('importCard', {
    description: 'Import a business network card into the wallet',
    accepts: [
      {
        arg: 'card',
        type: 'file',
        http: {
          source: 'form',
        },
        // Can't be required as LoopBack can't handle file based arguments.
        // required: true,
        description: 'The business network card (.card) file to import',
      },
      {
        arg: 'name',
        type: 'string',
        http: {
          source: 'query',
        },
        required: false,
        description: 'The name of the business network card',
      },
      {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req',
        },
      },
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
    ],
    http: {
      verb: 'post',
      path: '/import',
    },
  });

  // Add a remote method for exporting a card.
  Card.exportCard = async (name, res, options) => {
    const cardStore = new LoopBackCardStore(Card, options.accessToken.userId);
    const adminConnection = new AdminConnection({cardStore});

    const card = await adminConnection.exportCard(name);

    delete card.connectionProfile.wallet;

    const cardData = await card.toArchive({type: 'nodebuffer'});

    res.setHeader('Content-Disposition', `attachment; filename=${name}.card`);
    res.setHeader('Content-Length', cardData.length);
    res.setHeader('Content-Type', 'application/octet-stream');

    return cardData;
  };

  Card.remoteMethod('exportCard', {
    description: 'Export a business network card from the wallet',
    accepts: [
      {
        arg: 'name',
        type: 'string',
        required: true,
        description: 'The name of the business network card',
      },
      {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res',
        },
      },
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
    ],
    returns: [
      {
        arg: 'cardFile',
        type: 'file',
        root: true,
      },
    ],
    http: {
      verb: 'get',
      path: '/:name/export',
    },
  });

  // Add a remote method for setting the default card.
  Card.setDefault = async (name, options) => {
    const userId = options.accessToken.userId;

    return await setDefaultCard(userId, name);
  };

  Card.remoteMethod('setDefault', {
    description:
      'Set a specific business network card as the default business network card',
    accepts: [
      {
        arg: 'name',
        type: 'string',
        required: true,
        description: 'The name of the business network card',
      },
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
    ],
    http: {
      verb: 'post',
      path: '/:name/setDefault',
    },
  });
};
