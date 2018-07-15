'use strict';

const loopback = require('loopback');
const boot = require('loopback-boot');
const loopbackPassport = require('loopback-component-passport');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const Util = require('../lib/util');

const app = (module.exports = loopback());

app.start = () => {
  // Start the web server
  return app.listen(() => {
    app.emit('started');

    const baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);

    if (app.get('loopback-component-explorer')) {
      const explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

app.initialize = () => {
  // Support JSON encoded bodies.
  app.middleware('parse', bodyParser.json());

  // Support URL encoded bodies.
  app.middleware(
    'parse',
    bodyParser.urlencoded({
      extended: true,
    }),
  );

  // Enable the use of access tokens to identify users.
  app.middleware(
    'auth',
    loopback.token({
      model: app.models.AppAccessToken,
    }),
  );

  // Initialize Passport.
  const passportConfigurator = new loopbackPassport.PassportConfigurator(app);
  passportConfigurator.init();

  // Configure Passport with our customized user models.
  passportConfigurator.setupModels({
    userModel: app.models.AppUser,
    userIdentityModel: app.models.AppUserIdentity,
    userCredentialModel: app.models.AppUserCredential,
  });

  // Load all of the Passport providers.
  let providers = require('./providers.json');
  if (process.env.PROVIDERS) {
    providers = JSON.parse(process.env.PROVIDERS);
  }

  for (let provider in providers) {
    const config = providers[provider];

    config.session = config.session !== false;
    config.profileToUser = Util.profileToUser;
    passportConfigurator.configureProvider(provider, config);
  }
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, err => {
  if (err) throw err;

  app.initialize();

  // Start the server if `$ node server.js`
  if (require.main === module) {
    const server = app.start();

    // Create a new WebSocket server that manages clients for us.
    const wss = new WebSocket.Server({
      server,
      clientTracking: true,
    });

    // Add a broadcast method that sends data to all connected clients.
    wss.broadcast = data => {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    };

    // Store the WebSocket server for the boot script to find.
    app.set('wss', wss);
  }
});
