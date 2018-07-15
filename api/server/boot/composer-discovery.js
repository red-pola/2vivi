'use strict';

const connector = require('loopback-connector-composer');
const composerConfig = require('../datasources.json').composer;

/**
 * Create a Composer data source using the specified Composer configuration.
 */
function createDataSource(app) {
  const connectorSettings = {
    name: 'composer',
    connector: connector,
    card: composerConfig.card,
    cardStore: composerConfig.cardStore,
    namespaces: composerConfig.namespaces,
    multiuser: composerConfig.multiuser,
  };

  return app.loopback.createDataSource('composer', connectorSettings);
}

module.exports = (app, next) => {
  const dataSource = createDataSource(app);

  // Subscribe to events from the business network.
  dataSource.connector.subscribe(event => {
    const wss = app.get('wss');

    if (wss) {
      wss.broadcast(JSON.stringify(event));
    }
  });
  next();
};
