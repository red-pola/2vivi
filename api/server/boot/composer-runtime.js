'use strict';

const LoopBackCardStore = require('../../lib/loopback-card-store');

module.exports = app => {
  // Extract the required models from the LoopBack application.
  const Card = app.models.Card;

  // Register a hook for all remote methods that loads the enrollment ID and
  // enrollment secret from the logged-in users wallet for passing to the connector.
  app
    .remotes()
    .phases.addBefore('invoke', 'options-from-request')
    .use(async (ctx, next) => {
      // Check to see if the access token has been provided.
      if (!ctx.args.options) {
        return next();
      } else if (!ctx.args.options.accessToken) {
        return next();
      }

      // Extract the current user ID.
      const userId = ctx.args.options.accessToken.userId;

      if (!userId) {
        return next();
      }

      // Check for the existance of a header specifying the card.
      const cardName = ctx.req.get('X-Composer-Card');

      if (cardName) {
        ctx.args.options.cardStore = new LoopBackCardStore(Card, userId);
        ctx.args.options.card = cardName;

        return next();
      }

      // Find the default card for this user.
      try {
        const card = await Card.findOne({where: {userId, default: true}});
        if (card) {
          ctx.args.options.cardStore = new LoopBackCardStore(Card, userId);
          ctx.args.options.card = card.name;
        }
        next();
      } catch (error) {
        next(error);
      }
    });
};
