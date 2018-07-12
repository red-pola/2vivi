'use strict';

module.exports = server => {
  const router = server.loopback.Router();

  router.get('/', (req, res, next) => {
    res.redirect('/explorer/');
  });
  router.get('/status', server.loopback.status());

  server.use(router);
};
