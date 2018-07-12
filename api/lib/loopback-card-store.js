'use strict';

const BusinessNetworkCardStore = require('composer-common')
  .BusinessNetworkCardStore;
const IdCard = require('composer-common').IdCard;
const LoopBackWallet = require('./loopback-wallet');

/**
 * Manages persistence of business network cards to a Node file system implementation.
 *
 * @private
 * @class
 * @memberof module:composer-common
 */
class LoopBackCardStore extends BusinessNetworkCardStore {
  /**
   * Constructor.
   * @param {Object} Card The LoopBack model for Card.
   * @param {string} userId The ID of the authenticated user.
   */
  constructor(Card, userId) {
    super();
    this.Card = Card;
    this.userId = userId;
  }

  /**
   * @inheritdoc
   */
  async get(cardName) {
    const lbCard = await this.Card.findOne({
      where: {
        userId: this.userId,
        name: cardName,
      },
    });

    if (!lbCard) {
      const error = new Error(
        `The business network card "${cardName}" does not exist`,
      );
      error.statusCode = error.status = 404;
      throw error;
    }

    const cardData = Buffer.from(lbCard.base64, 'base64');
    const card = await IdCard.fromArchive(cardData);
    card.connectionProfile.wallet = new LoopBackWallet(lbCard);

    return card;
  }

  /**
   * @inheritdoc
   */
  async put(cardName, card) {
    // Check for an existing card, so we can merge the data contents
    // if such a card exists.
    const lbCard = await this.Card.findOne({
      where: {
        userId: this.userId,
        name: cardName,
      },
    });
    const data = lbCard ? lbCard.data : {};

    // Now we can safely update the card.
    const cardData = await card.toArchive({type: 'nodebuffer'});
    await this.Card.upsertWithWhere(
      {
        userId: this.userId,
        name: cardName,
      },
      {
        name: cardName,
        base64: cardData.toString('base64'),
        data,
        userId: this.userId,
      },
    );
  }

  /**
   * @inheritdoc
   */
  async getAll() {
    const result = new Map();
    const lbCards = await this.Card.find({
      where: {
        userId: this.userId,
      },
    });

    for (const lbCard of lbCards) {
      const cardData = Buffer.from(lbCard.base64, 'base64');
      const card = await IdCard.fromArchive(cardData);

      card.connectionProfile.wallet = new LoopBackWallet(lbCard);
      result.set(lbCard.name, card);
    }

    return result;
  }

  /**
   * @inheritdoc
   */
  async delete(cardName) {
    const info = await this.Card.destroyAll({
      userId: this.userId,
      name: cardName,
    });

    if (!info.count) {
      const error = new Error(
        `The business network card "${cardName}" does not exist`,
      );
      error.statusCode = error.status = 404;
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async has(cardName) {
    const lbCard = await this.Card.findOne({
      where: {
        userId: this.userId,
        name: cardName,
      },
    });

    return !!lbCard;
  }

  /**
   * @inheritdoc
   */
  async getWallet(cardName) {
    const lbCard = await this.Card.findOne({
      where: {
        userId: this.userId,
        name: cardName,
      },
    });

    if (!lbCard) {
      const error = new Error(
        `The business network card "${cardName}" does not exist`,
      );
      error.statusCode = error.status = 404;
      throw error;
    }

    return new LoopBackWallet(lbCard);
  }
}

module.exports = LoopBackCardStore;
